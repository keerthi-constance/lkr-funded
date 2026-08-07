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
    // The Cardano crypto stack pulled in via @lucid-evolution/lucid is a pile of
    // wasm-bindgen packages (@anastasia-labs/cardano-multiplatform-lib-nodejs,
    // @lucid-evolution/uplc, @emurgo/cardano-*-nodejs). Nitro's default behavior
    // is to inline every dependency into shared vendor chunks, which breaks these
    // in two ways once bundled: their .wasm-loading code uses __dirname (a CJS-only
    // global Nitro's bundler doesn't shim for inlined code — "__dirname is not
    // defined in ES module scope"), and their generated JS glue relies on
    // self-referential requires of their own filename to build the WASM import
    // object, which only resolves correctly when the file is a real, separate
    // CommonJS module — inlining breaks that too ("Import #0 ... module is not an
    // object or function"). Fix: keep them out of the bundle entirely via
    // traceDeps below (Nitro's own externals+tracing plugin — the `*` suffix
    // forces a full-package trace, .wasm assets included, not just
    // statically-reachable JS), so Node loads them as genuine CJS packages from
    // node_modules at runtime, where both mechanisms work as designed. `replace`
    // is a defensive leftover from before that fix landed — harmless to keep in
    // case __dirname shows up in something else that does get inlined.
    replace: {
      __dirname: "import.meta.dirname",
      __filename: "import.meta.filename",
    },
    traceDeps: [
      "@anastasia-labs/cardano-multiplatform-lib-nodejs*",
      "@lucid-evolution/uplc*",
      "@emurgo/cardano-message-signing-nodejs*",
      "@emurgo/cardano-serialization-lib-nodejs*",
    ],
    // `nitro`'s declared type here only covers preset/output/cloudflare — deliberately
    // narrow (see the option's doc comment) — but `replace`/`traceDeps` are real
    // Nitro v3 config keys that the wrapper spreads through untyped at runtime, so
    // this cast is safe.
  } as LovableViteTanstackOptions["nitro"],
});
