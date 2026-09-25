// Build de producción del game server: un único bundle ESM en dist/index.js.
// @aden/shared se empaqueta adentro porque exporta TypeScript crudo (main: src/index.ts);
// el resto de las dependencias queda externo y se instala con `npm ci --omit=dev`.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const external = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) => name !== "@aden/shared");

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Respeta experimentalDecorators/useDefineForClassFields que usan los schemas de Colyseus.
  tsconfig: "tsconfig.json",
  external,
  sourcemap: true,
  logLevel: "info",
});
