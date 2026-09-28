import { fileURLToPath } from 'node:url';
import { defineConfig } from "vite";

// El proyecto de Vercel tiene Root Directory = `client`, así que Vercel busca el
// build en `client/dist` (el default de Vite). No override de outDir: sale a client/dist.
export default defineConfig({
  server: { port: 5173 },
  build: { rollupOptions: { input: { game: fileURLToPath(new URL('./index.html',import.meta.url)), heroes: fileURLToPath(new URL('./hero-redesign-preview.html',import.meta.url)), bosses: fileURLToPath(new URL('./boss-preview.html',import.meta.url)) } } },
});
