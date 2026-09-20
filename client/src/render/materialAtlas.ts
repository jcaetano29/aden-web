import * as THREE from "three";

export const SURFACE_KINDS = [
  "stone", "wood", "roof", "thatch", "plaster", "cobble", "cloth", "cracked",
  "grass", "earth", "gravel", "lava", "metal", "leather", "leaves", "bone",
] as const;
export type SurfaceKind = typeof SURFACE_KINDS[number];
export interface SurfaceMaps {
  color: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}
const surfaces = new Map<SurfaceKind, SurfaceMaps>();
let loading: Promise<void> | undefined;

function texture(cv: HTMLCanvasElement, color = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

/** One local download, shared GPU sources. Opposite edges are blended locally;
 * the interior stays asymmetric, avoiding the kaleidoscope of mirrored tiles. */
export function preloadMaterialAtlas(): Promise<void> {
  return loading ??= new Promise<void>((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = () => { settled = true; clearTimeout(timeout); resolve(); };
    const timeout = window.setTimeout(() => {
      console.warn("Material atlas timed out; using procedural materials."); finish();
    }, 15000);
    img.onload = () => {
      if (settled) return;
      try {
        const cell = img.width / 4;
        for (const [i, kind] of SURFACE_KINDS.entries()) {
          const cv = document.createElement("canvas");
          cv.width = cv.height = 512;
          const ctx = cv.getContext("2d")!;
          // Exclude the fine separators occasionally produced at cell boundaries.
          ctx.drawImage(img, (i % 4) * cell + 3, Math.floor(i / 4) * cell + 3,
            cell - 6, cell - 6, 0, 0, 512, 512);
          const bump = document.createElement("canvas");
          const rough = document.createElement("canvas");
          bump.width = bump.height = rough.width = rough.height = 512;
          const pixels = ctx.getImageData(0, 0, 512, 512);
          // Symmetric, narrow edge repair; operates on both colour and derived maps.
          for (let axis = 0; axis < 2; axis++) {
            for (let line = 0; line < 512; line++) for (let edge = 0; edge < 24; edge++) {
              const a = (axis ? edge * 512 + line : line * 512 + edge) * 4;
              const b = (axis ? (511 - edge) * 512 + line : line * 512 + 511 - edge) * 4;
              const weight = 0.5 * (1 - edge / 24) ** 2;
              for (let ch = 0; ch < 3; ch++) {
                const left = pixels.data[a + ch], right = pixels.data[b + ch];
                pixels.data[a + ch] = left + (right - left) * weight;
                pixels.data[b + ch] = right + (left - right) * weight;
              }
            }
          }
          const heights = new ImageData(512, 512);
          const roughness = new ImageData(512, 512);
          for (let p = 0; p < pixels.data.length; p += 4) {
            const l = pixels.data[p] * 0.2126 + pixels.data[p + 1] * 0.7152 + pixels.data[p + 2] * 0.0722;
            for (let ch = 0; ch < 3; ch++) {
              heights.data[p + ch] = l;
              roughness.data[p + ch] = kind === "metal" ? 115 + l * 0.3 : 180 + l * 0.25;
            }
            heights.data[p + 3] = roughness.data[p + 3] = 255;
            // Neutral textile detail accepts the original banner/NPC hue.
            if (kind === "cloth") for (let ch = 0; ch < 3; ch++) pixels.data[p + ch] = Math.min(255, l * 2.6);
          }
          ctx.putImageData(pixels, 0, 0);
          bump.getContext("2d")!.putImageData(heights, 0, 0);
          rough.getContext("2d")!.putImageData(roughness, 0, 0);
          surfaces.set(kind, { color: texture(cv, true), bump: texture(bump), roughness: texture(rough) });
          if (kind === "metal") document.documentElement.style.setProperty("--aden-panel-texture", `url("${cv.toDataURL("image/webp", 0.8)}")`);
        }
      } catch (error) { console.warn("Material atlas unavailable; using procedural materials.", error); }
      finish();
    };
    img.onerror = () => { console.warn("Material atlas unavailable; using procedural materials."); finish(); };
    img.src = "/textures/aden-material-atlas.png";
  });
}

export function surfaceMaps(kind: SurfaceKind): SurfaceMaps | undefined { return surfaces.get(kind); }
