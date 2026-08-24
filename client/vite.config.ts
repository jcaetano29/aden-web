import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  // El build sale a un `dist` en la RAÍZ del repo (no client/dist). Así coincide con
  // lo que Vercel busca por defecto con el preset Vite (Root Directory = raíz), sin
  // depender de que respete outputDirectory del vercel.json. `emptyOutDir` es
  // necesario porque el destino queda fuera del root de Vite (client/).
  build: { outDir: "../dist", emptyOutDir: true },
});
