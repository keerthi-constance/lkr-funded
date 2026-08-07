// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig, type LovableViteTanstackOptions } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
    // Cardano's WASM crypto bindings (@anastasia-labs/cardano-multiplatform-lib-nodejs,
    // pulled in via @lucid-evolution/lucid) load their .wasm file using __dirname —
    // a CJS-only global that Nitro's bundler doesn't shim once the package is
    // inlined into an ESM chunk, crashing every server function at import time
    // in production ("__dirname is not defined in ES module scope"). Vercel's
    // Node runtime (24.x) supports import.meta.dirname/filename natively, so
    // swap the tokens at build time instead of trying to keep the package external.
    replace: {
      __dirname: "import.meta.dirname",
      __filename: "import.meta.filename",
    },
    // `nitro`'s declared type here only covers preset/output/cloudflare — deliberately
    // narrow (see the option's doc comment) — but `replace` is a real Nitro v3 config
    // key that the wrapper spreads through untyped at runtime, so this cast is safe.
  } as LovableViteTanstackOptions["nitro"],
});
