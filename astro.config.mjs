import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://juegosuci.jesareko.com",
  vite: {
    build: {
      // Keep the progressive category selector external so Pages' strict CSP
      // can allow scripts from this site without permitting inline scripts.
      assetsInlineLimit: 0,
    },
  },
});
