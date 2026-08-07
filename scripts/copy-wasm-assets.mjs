// The Cardano crypto stack pulled in via @lucid-evolution/lucid is a pile of
// wasm-bindgen packages (@anastasia-labs/cardano-multiplatform-lib-nodejs,
// @lucid-evolution/uplc, @emurgo/cardano-message-signing-nodejs, and
// potentially more as deps change), each loading a sibling .wasm binary from
// its own module's directory at runtime. Nitro's Vercel build inlines their
// JS into shared vendor chunks under functions/__server.func/_libs/<scope>/,
// but only copies JS/CSS — the .wasm binaries themselves never make it into
// the deployed function, so production 500s with ENOENT for them.
//
// Rather than hardcode each package (a new one keeps turning up every time
// the last one gets fixed), scan every compiled chunk for the .wasm
// filenames it actually references, and copy each one over from wherever it
// lives in node_modules. Runs as a plain post-build step (`vite build` then
// this) rather than a Nitro build hook — a `nitro.hooks` entry in
// vite.config.ts was tried first, but it broke @vercel/static-build's
// framework detection outright ("No Output Directory named dist"), even
// though the hook itself did nothing but this same copy.
import { readdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";

const LIBS_ROOT = path.resolve(".vercel/output/functions/__server.func/_libs");
const NODE_MODULES = path.resolve("node_modules");
const WASM_REF_RE = /(?:^|["'`/])([\w.-]+\.wasm)(?=["'`])/g;

async function findWasmChunks() {
  let scopeDirs;
  try {
    scopeDirs = await readdir(LIBS_ROOT, { withFileTypes: true });
  } catch {
    return []; // not a Vercel/nitro build (e.g. plain `vite build` for another target) — nothing to patch
  }
  const chunks = [];
  for (const scope of scopeDirs) {
    if (!scope.isDirectory()) continue;
    const dir = path.join(LIBS_ROOT, scope.name);
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".mjs")) continue;
      chunks.push(path.join(dir, file));
    }
  }
  return chunks;
}

async function wasmNamesReferencedBy(chunkPath) {
  const content = await readFile(chunkPath, "utf8");
  const names = new Set();
  for (const match of content.matchAll(WASM_REF_RE)) names.add(match[1]);
  return names;
}

// Depth-bounded recursive search under each top-level package's own directory
// (never descends into a nested node_modules — these wasm-bindgen packages
// keep their .wasm a few `dist/<target>/` levels under their own root, never
// inside a dependency). Collects every match; when a package ships both
// node and browser builds with different .wasm content (seen with
// @lucid-evolution/uplc), prefer whichever path looks node-targeted.
async function walkForFile(root, filename, depth) {
  if (depth < 0) return [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await walkForFile(full, filename, depth - 1)));
    else if (entry.name === filename) found.push(full);
  }
  return found;
}

async function findWasmSource(wasmName) {
  const scopes = await readdir(NODE_MODULES, { withFileTypes: true });
  for (const scope of scopes) {
    if (!scope.isDirectory()) continue;
    const scopePath = path.join(NODE_MODULES, scope.name);
    const isScopeDir = scope.name.startsWith("@");
    const pkgDirs = isScopeDir ? await readdir(scopePath, { withFileTypes: true }) : [{ name: "", isDirectory: () => true }];
    for (const pkg of pkgDirs) {
      const pkgPath = isScopeDir ? path.join(scopePath, pkg.name) : scopePath;
      const matches = await walkForFile(pkgPath, wasmName, 4);
      if (matches.length === 0) continue;
      const nodeMatch = matches.find((m) => /[\\/]node[\\/]/.test(m) || m.includes("nodejs"));
      return nodeMatch ?? matches[0];
    }
  }
  return null;
}

async function main() {
  const chunks = await findWasmChunks();
  for (const chunkPath of chunks) {
    const dir = path.dirname(chunkPath);
    const existing = new Set(await readdir(dir));
    const wasmNames = await wasmNamesReferencedBy(chunkPath);
    for (const wasmName of wasmNames) {
      if (existing.has(wasmName)) continue;
      const source = await findWasmSource(wasmName);
      if (!source) {
        console.warn(`[copy-wasm-assets] ${chunkPath} references ${wasmName}, but no source file was found under node_modules.`);
        continue;
      }
      await copyFile(source, path.join(dir, wasmName));
      console.log(`[copy-wasm-assets] Copied ${wasmName} into ${path.relative(LIBS_ROOT, dir)}/.`);
    }
  }
}

main().catch((err) => {
  // Best-effort: warn but don't fail the whole production build over this.
  console.warn("[copy-wasm-assets] Could not copy one or more wasm assets:", err);
});
