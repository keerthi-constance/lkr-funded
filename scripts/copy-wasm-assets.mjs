// The Cardano crypto stack pulled in via @lucid-evolution/lucid ships two
// wasm-bindgen packages, each loading a sibling .wasm binary from its own
// module's directory at runtime:
//   - @anastasia-labs/cardano-multiplatform-lib-nodejs
//   - @lucid-evolution/uplc
// Nitro's Vercel build inlines their JS into shared vendor chunks under
// functions/__server.func/_libs/<scope>/, but only copies JS/CSS — the .wasm
// binaries themselves never make it into the deployed function, so production
// 500s with ENOENT for them. Copy them in as a plain post-build step (run
// after `vite build` finishes) rather than a Nitro build hook — a
// `nitro.hooks` entry in vite.config.ts was tried first, but it broke
// @vercel/static-build's framework detection outright ("No Output Directory
// named dist"), even though the hook itself did nothing but this same copy.
import { readdir, copyFile } from "node:fs/promises";
import path from "node:path";

const LIBS_ROOT = path.resolve(".vercel/output/functions/__server.func/_libs");

const WASM_ASSETS = [
  {
    scopeDir: "@anastasia-labs",
    chunkPrefix: "cardano-multiplatform-lib-nodejs",
    wasmFile: "cardano_multiplatform_lib_bg.wasm",
    source: path.resolve(
      "node_modules/@anastasia-labs/cardano-multiplatform-lib-nodejs/cardano_multiplatform_lib_bg.wasm",
    ),
  },
  {
    scopeDir: "@lucid-evolution",
    chunkPrefix: "lucid",
    wasmFile: "uplc_tx_bg.wasm",
    source: path.resolve("node_modules/@lucid-evolution/uplc/dist/node/uplc_tx_bg.wasm"),
  },
];

async function copyAsset({ scopeDir, chunkPrefix, wasmFile, source }) {
  const dir = path.join(LIBS_ROOT, scopeDir);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return; // not a Vercel/nitro build (e.g. plain `vite build` for another target) — nothing to patch
  }
  if (!entries.some((f) => f.startsWith(chunkPrefix))) return;
  await copyFile(source, path.join(dir, wasmFile));
  console.log(`[copy-wasm-assets] Copied ${wasmFile} into ${scopeDir}/.`);
}

async function main() {
  for (const asset of WASM_ASSETS) await copyAsset(asset);
}

main().catch((err) => {
  // Best-effort: warn but don't fail the whole production build over this.
  console.warn("[copy-wasm-assets] Could not copy one or more wasm assets:", err);
});
