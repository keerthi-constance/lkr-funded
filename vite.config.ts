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
    // @hyperledger/fabric-gateway's HSM (hardware security module) signer
    // support optionally requires `pkcs11js`, a native module we don't
    // install because we sign with plain private keys, not HSM tokens —
    // that code path is never invoked. The bundler still tries to resolve
    // it statically and fails since it's genuinely not installed; mark it
    // external so the bundler leaves the bare `require("pkcs11js")` alone.
    // Safe: it would only actually throw at runtime if the HSM signer path
    // ran, which this app never does.
    rollupConfig: {
      external: ["pkcs11js"],
    },
  } as LovableViteTanstackOptions["nitro"],
});
