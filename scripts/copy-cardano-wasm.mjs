// @anastasia-labs/cardano-multiplatform-lib-nodejs (pulled in via @lucid-evolution/lucid)
// is a wasm-bindgen package: its JS glue loads a sibling .wasm binary from its own
// directory at runtime. Nitro's Vercel build inlines the JS into a shared vendor
// chunk under functions/__server.func/_libs/@anastasia-labs/, but only copies
// JS/CSS — the .wasm binary itself never makes it into the deployed function, so
// production 500s with ENOENT for it. Copy it in as a plain post-build step (run
// after `vite build` finishes) rather than a Nitro build hook — a `nitro.hooks`
// entry in vite.config.ts was tried first, but it broke @vercel/static-build's
// framework detection outright ("No Output Directory named dist"), even though
// the hook itself did nothing but this same copy.
import { readdir, copyFile } from "node:fs/promises";
import path from "node:path";

const WASM_SOURCE = path.resolve(
  "node_modules/@anastasia-labs/cardano-multiplatform-lib-nodejs/cardano_multiplatform_lib_bg.wasm",
);
const LIBS_DIR = path.resolve(".vercel/output/functions/__server.func/_libs/@anastasia-labs");

async function main() {
  let entries;
  try {
    entries = await readdir(LIBS_DIR);
  } catch {
    return; // not a Vercel/nitro build (e.g. plain `vite build` for another target) — nothing to patch
  }
  if (!entries.some((f) => f.startsWith("cardano-multiplatform-lib-nodejs"))) return;
  await copyFile(WASM_SOURCE, path.join(LIBS_DIR, "cardano_multiplatform_lib_bg.wasm"));
  console.log("[copy-cardano-wasm] Copied cardano_multiplatform_lib_bg.wasm into the function bundle.");
}

main().catch((err) => {
  // Best-effort: warn but don't fail the whole production build over this.
  console.warn("[copy-cardano-wasm] Could not copy cardano_multiplatform_lib_bg.wasm:", err);
});
