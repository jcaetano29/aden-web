import * as THREE from "three";
import { surfaceMaps, type SurfaceKind } from "./materialAtlas.js";

/**
 * Texturas PROCEDURALES (canvas, sin descargas) para darle grano y materialidad al
 * mundo: piedra, madera, tejas, adoquín, revoque, paja, tela y piedra agrietada.
 * Todo se dibuja tileable en un canvas y se envuelve en una THREE.CanvasTexture.
 *
 * Diseño para rendimiento:
 * - El CANVAS/imagen base de cada (tipo,color) se cachea y se sube UNA vez a la GPU.
 * - Cada material pide su propia repetición (repeat) → clonamos la textura base
 *   (comparte la imagen fuente, sólo cambia el transform) para que dos muros de
 *   distinto tamaño no se peleen por el mismo repeat.
 */

/** RNG determinístico (mulberry32) → texturas idénticas en todos los clientes. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(n: number): [number, number, number] {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
/** Aclara/oscurece un color hacia blanco (+f) o negro (-f). */
function shade([r, g, b]: [number, number, number], f: number): string {
  const t = f < 0 ? 0 : 255;
  const a = Math.abs(f);
  return `rgb(${Math.round(r + (t - r) * a)},${Math.round(g + (t - g) * a)},${Math.round(b + (t - b) * a)})`;
}

interface Gen {
  /** Mapa de color. */
  color: HTMLCanvasElement;
  /** Mapa de relieve (grises) opcional. */
  bump?: HTMLCanvasElement;
}

function canvas(size = 256): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  return { cv, ctx };
}

/** Ruido de motas finas sobre todo el canvas (da grano fotográfico). */
function speckle(ctx: CanvasRenderingContext2D, size: number, base: [number, number, number], rand: () => number, n = 900): void {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.06 + rand() * 0.14;
    ctx.fillStyle = rand() < 0.5 ? shade(base, -0.4) : shade(base, 0.3);
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.globalAlpha = 1;
}

// ── Generadores ────────────────────────────────────────────────────────────

/** Sillería/ladrillo: bloques con juntas de mortero, hiladas alternadas. */
function genStone(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const bump = canvas(size);
  const rand = mulberry32(base ^ 0x51ed);
  ctx.fillStyle = shade(c, -0.28); ctx.fillRect(0, 0, size, size);          // mortero de fondo
  bump.ctx.fillStyle = "#333"; bump.ctx.fillRect(0, 0, size, size);
  const rows = 6, bh = size / rows, mortar = 3;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (size / 8);
    const cols = 4;
    for (let cIdx = -1; cIdx < cols; cIdx++) {
      const bw = size / cols;
      const x = cIdx * bw + off;
      const y = r * bh;
      const f = (rand() - 0.5) * 0.22;
      ctx.fillStyle = shade(c, f);
      ctx.fillRect(x + mortar, y + mortar, bw - mortar * 2, bh - mortar * 2);
      // bloque en relieve (claro), junta oscura
      bump.ctx.fillStyle = `rgb(${200 + Math.floor(rand() * 40)},${200},${200})`;
      bump.ctx.fillRect(x + mortar, y + mortar, bw - mortar * 2, bh - mortar * 2);
      // desgaste: esquina más oscura
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = shade(c, -0.3);
      ctx.fillRect(x + mortar, y + bh - mortar - 4, bw - mortar * 2, 4);
      ctx.globalAlpha = 1;
    }
  }
  speckle(ctx, size, c, rand, 700);
  return { color: cv, bump: bump.cv };
}

/** Tablones de madera verticales con veta. */
function genWood(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const bump = canvas(size);
  const rand = mulberry32(base ^ 0x2b7a);
  const planks = 6, pw = size / planks;
  bump.ctx.fillStyle = "#888"; bump.ctx.fillRect(0, 0, size, size);
  for (let p = 0; p < planks; p++) {
    const x = p * pw;
    ctx.fillStyle = shade(c, (rand() - 0.5) * 0.2);
    ctx.fillRect(x, 0, pw, size);
    // veta: líneas horizontales onduladas oscuras
    ctx.strokeStyle = shade(c, -0.28);
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      const y = rand() * size;
      ctx.globalAlpha = 0.3 + rand() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + pw * 0.3, y + (rand() - 0.5) * 8, x + pw * 0.7, y + (rand() - 0.5) * 8, x + pw, y + (rand() - 0.5) * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // junta entre tablones (sombra) → relieve
    ctx.fillStyle = shade(c, -0.5); ctx.fillRect(x, 0, 2, size);
    bump.ctx.fillStyle = "#222"; bump.ctx.fillRect(x, 0, 3, size);
    // nudos ocasionales
    if (rand() < 0.6) {
      const ky = rand() * size;
      ctx.fillStyle = shade(c, -0.4);
      ctx.beginPath(); ctx.ellipse(x + pw / 2, ky, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  speckle(ctx, size, c, rand, 400);
  return { color: cv, bump: bump.cv };
}

/** Tejas: hiladas escalonadas de tejas redondeadas superpuestas. */
function genRoof(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const bump = canvas(size);
  const rand = mulberry32(base ^ 0x9a11);
  ctx.fillStyle = shade(c, -0.4); ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = "#444"; bump.ctx.fillRect(0, 0, size, size);
  const rows = 8, cols = 8, th = size / rows, tw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (tw / 2);
    for (let cIdx = -1; cIdx <= cols; cIdx++) {
      const x = cIdx * tw + off, y = r * th;
      const f = (rand() - 0.5) * 0.24;
      ctx.fillStyle = shade(c, f);
      ctx.beginPath();
      ctx.moveTo(x, y + th);
      ctx.lineTo(x, y + th * 0.35);
      ctx.arc(x + tw / 2, y + th * 0.35, tw / 2, Math.PI, 0);
      ctx.lineTo(x + tw, y + th);
      ctx.fill();
      // brillo en el borde superior + sombra abajo
      ctx.fillStyle = shade(c, 0.18); ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y + th * 0.3, tw, 2);
      ctx.globalAlpha = 1;
      bump.ctx.fillStyle = `rgb(${170 + Math.floor(rand() * 60)},170,170)`;
      bump.ctx.beginPath();
      bump.ctx.arc(x + tw / 2, y + th * 0.55, tw / 2 - 1, 0, Math.PI * 2);
      bump.ctx.fill();
    }
  }
  return { color: cv, bump: bump.cv };
}

/** Paja/techo de junco: montones de briznas casi verticales. */
function genThatch(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const rand = mulberry32(base ^ 0x77c3);
  ctx.fillStyle = shade(c, -0.2); ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * size, y = rand() * size;
    const len = 6 + rand() * 16;
    ctx.strokeStyle = shade(c, (rand() - 0.4) * 0.5);
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.lineWidth = 1 + rand();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 3, y + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return { color: cv };
}

/** Revoque/estuco cálido con manchas suaves y alguna grieta. */
function genPlaster(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const rand = mulberry32(base ^ 0x3f5e);
  ctx.fillStyle = shade(c, 0); ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = 0.08 + rand() * 0.14;
    ctx.fillStyle = rand() < 0.5 ? shade(c, 0.12) : shade(c, -0.14);
    ctx.beginPath(); ctx.arc(rand() * size, rand() * size, 12 + rand() * 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // grietas finas
  ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) { x += (rand() - 0.5) * 26; y += (rand() - 0.5) * 26; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  speckle(ctx, size, c, rand, 500);
  return { color: cv };
}

/** Adoquín: piedras redondeadas irregulares con juntas oscuras. */
function genCobble(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const bump = canvas(size);
  const rand = mulberry32(base ^ 0x6d21);
  ctx.fillStyle = shade(c, -0.45); ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = "#222"; bump.ctx.fillRect(0, 0, size, size);
  const grid = 6, g = size / grid;
  for (let r = 0; r < grid; r++) {
    for (let cIdx = 0; cIdx < grid; cIdx++) {
      const cx = cIdx * g + g / 2 + (rand() - 0.5) * g * 0.3;
      const cy = r * g + g / 2 + (rand() - 0.5) * g * 0.3;
      const rr = g * (0.34 + rand() * 0.12);
      ctx.fillStyle = shade(c, (rand() - 0.5) * 0.28);
      ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * (0.8 + rand() * 0.3), rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
      bump.ctx.fillStyle = `rgb(${190},${190},${190})`;
      bump.ctx.beginPath(); bump.ctx.ellipse(cx, cy, rr - 1, rr * 0.85, 0, 0, Math.PI * 2); bump.ctx.fill();
    }
  }
  speckle(ctx, size, c, rand, 600);
  return { color: cv, bump: bump.cv };
}

/** Tela/estandarte: tejido vertical sutil + degradé de pliegue. */
function genCloth(base: number): Gen {
  const size = 256;
  const c = rgb(base);
  const { cv, ctx } = canvas(size);
  const rand = mulberry32(base ^ 0x8ac1);
  ctx.fillStyle = shade(c, 0); ctx.fillRect(0, 0, size, size);
  // pliegues verticales (bandas de sombra/luz)
  for (let x = 0; x < size; x += 8) {
    const f = Math.sin(x / size * Math.PI * 4) * 0.12;
    ctx.fillStyle = shade(c, f);
    ctx.fillRect(x, 0, 8, size);
  }
  // trama fina
  ctx.globalAlpha = 0.15;
  for (let y = 0; y < size; y += 2) { ctx.fillStyle = shade(c, -0.2); ctx.fillRect(0, y, size, 1); }
  ctx.globalAlpha = 1;
  speckle(ctx, size, c, rand, 200);
  return { color: cv };
}

/** Piedra agrietada y con musgo (para ruinas). */
function genCrackedStone(base: number): Gen {
  const g = genStone(base);
  const ctx = g.color.getContext("2d")!;
  const size = g.color.width;
  const rand = mulberry32(base ^ 0xa17c);
  // musgo verdoso en juntas
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.1 + rand() * 0.2;
    ctx.fillStyle = rand() < 0.5 ? "#5a6b3a" : "#3f5230";
    ctx.beginPath(); ctx.arc(rand() * size, rand() * size, 4 + rand() * 14, 0, Math.PI * 2); ctx.fill();
  }
  // grietas negras
  ctx.strokeStyle = "#0d0d10"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += (rand() - 0.5) * 30; y += (rand() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return g;
}

type Kind = SurfaceKind;
const GENERATORS: Record<Kind, (base: number) => Gen> = {
  stone: genStone, wood: genWood, roof: genRoof, thatch: genThatch,
  plaster: genPlaster, cobble: genCobble, cloth: genCloth, cracked: genCrackedStone,
  grass: genPlaster, earth: genPlaster, gravel: genCobble, lava: genCrackedStone,
  metal: genPlaster, leather: genCloth, leaves: genThatch, bone: genPlaster,
};

// Caché de la textura BASE (repeat 1,1). Clonamos para cada material.
const baseCache = new Map<string, { color: THREE.CanvasTexture; bump?: THREE.CanvasTexture }>();

function baseTex(kind: Kind, color: number): { color: THREE.CanvasTexture; bump?: THREE.CanvasTexture } {
  const key = `${kind}:${color}`;
  const hit = baseCache.get(key);
  if (hit) return hit;
  const g = GENERATORS[kind](color);
  const colorTex = new THREE.CanvasTexture(g.color);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.anisotropy = 8;
  colorTex.colorSpace = THREE.SRGBColorSpace;
  let bumpTex: THREE.CanvasTexture | undefined;
  if (g.bump) {
    bumpTex = new THREE.CanvasTexture(g.bump);
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.anisotropy = 4;
  }
  const entry = { color: colorTex, bump: bumpTex };
  baseCache.set(key, entry);
  return entry;
}

export interface MatOpts {
  color?: number;
  /** Repetición del patrón (según el tamaño de la superficie). */
  repeat?: [number, number];
  roughness?: number;
  metalness?: number;
  bumpScale?: number;
  flatShading?: boolean;
  /** Multiplica el color de la textura (tinte). Default blanco (sin tinte). */
  tint?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

/**
 * Crea un MeshStandardMaterial texturizado. La textura base (imagen) se cachea y
 * comparte; el `repeat` es por-material (clonamos la textura para no pisar a otros).
 */
export function texturedMaterial(kind: Kind, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const {
    color = 0x888888, repeat = [1, 1], roughness = 0.9, metalness = 0.0,
    bumpScale = 0.06, flatShading = false, tint = 0xffffff, emissive = 0x000000, emissiveIntensity = 0,
  } = opts;
  // Headless simulations construct world objects too; texture generation is visual only.
  if (typeof document === "undefined") return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  const atlas = surfaceMaps(kind);
  const base = atlas ?? baseTex(kind, color);
  const map = base.color.clone();
  map.needsUpdate = true;
  map.repeat.set(repeat[0], repeat[1]);
  const mat = new THREE.MeshStandardMaterial({
    map, color: tint, roughness, metalness, flatShading,
    emissive, emissiveIntensity,
  });
  if (atlas) {
    // Keep natural material colours; retain strong identity for cloth and metals.
    const hue = new THREE.Color(color);
    if (kind !== "cloth" && kind !== "metal") hue.lerp(new THREE.Color(0xffffff), 0.78);
    mat.color.multiply(hue);
    mat.roughnessMap = atlas.roughness.clone();
    mat.roughnessMap.repeat.set(...repeat);
    mat.roughnessMap.needsUpdate = true;
  }
  if (base.bump) {
    const bump = base.bump.clone();
    bump.needsUpdate = true;
    bump.repeat.set(repeat[0], repeat[1]);
    mat.bumpMap = bump;
    mat.bumpScale = bumpScale;
  }
  return mat;
}

// Fábricas cómodas por material (con defaults sensatos por tipo).
export const stoneMat = (color = 0x9a938a, repeat: [number, number] = [1, 1], flat = false) =>
  texturedMaterial("stone", { color, repeat, roughness: 0.95, bumpScale: 0.08, flatShading: flat });
export const woodMat = (color = 0x8a6a3c, repeat: [number, number] = [1, 1]) =>
  texturedMaterial("wood", { color, repeat, roughness: 0.85, bumpScale: 0.05 });
export const roofMat = (color = 0x7a3b2b, repeat: [number, number] = [2, 2]) =>
  texturedMaterial("roof", { color, repeat, roughness: 0.9, bumpScale: 0.06 });
export const thatchMat = (color = 0xb99850, repeat: [number, number] = [2, 2]) =>
  texturedMaterial("thatch", { color, repeat, roughness: 1.0 });
export const plasterMat = (color = 0xc9b48c, repeat: [number, number] = [1, 1]) =>
  texturedMaterial("plaster", { color, repeat, roughness: 0.95 });
export const cobbleMat = (color = 0x8f8676, repeat: [number, number] = [4, 4]) =>
  texturedMaterial("cobble", { color, repeat, roughness: 0.95, bumpScale: 0.1 });
export const clothMat = (color = 0x8a2b2b, repeat: [number, number] = [1, 1], emissive = 0x000000) =>
  texturedMaterial("cloth", { color, repeat, roughness: 0.8, emissive, emissiveIntensity: emissive ? 0.25 : 0 });
export const crackedStoneMat = (color = 0x8a8497, repeat: [number, number] = [1, 1], flat = false) =>
  texturedMaterial("cracked", { color, repeat, roughness: 0.98, bumpScale: 0.08, flatShading: flat });

export const metalMat = (color = 0xb2bdc9, repeat: [number, number] = [1, 1]) =>
  texturedMaterial("metal", { color, repeat, metalness: 0.65, roughness: 0.52, bumpScale: 0.018 });
export const leatherMat = (color = 0x72503b) =>
  texturedMaterial("leather", { color, roughness: 0.85, bumpScale: 0.025 });
export const foliageMat = (color = 0x69764b, repeat: [number, number] = [2, 2]) =>
  texturedMaterial("leaves", { color, repeat, roughness: 0.95, bumpScale: 0.035 });
export const boneMat = (color = 0xd9cfb0) =>
  texturedMaterial("bone", { color, roughness: 0.82, bumpScale: 0.025 });
export function terrainMat(zone: string, repeat: [number, number]): THREE.MeshStandardMaterial {
  const kind: Kind = ({ pueblo: "grass", bosque: "earth", ruinas: "gravel", yermo: "lava", trono: "cracked", cripta: "stone", marismas: "earth", monasterio: "stone", minas: "gravel" } as Record<string, Kind>)[zone] ?? "grass";
  return texturedMaterial(kind, { color: zone === 'marismas' ? 0x7da58c : zone === 'minas' ? 0x6b645c : 0xbfc3b4, repeat, roughness: 1, bumpScale: 0.12 });
}
