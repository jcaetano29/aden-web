import { defineConfig } from "vite";

// El proyecto de Vercel tiene Root Directory = `client`, así que Vercel busca el
// build en `client/dist` (el default de Vite). No override de outDir: sale a client/dist.
export default defineConfig({
  server: { port: 5173 },
});
