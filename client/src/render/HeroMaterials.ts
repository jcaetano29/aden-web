import * as THREE from 'three';
import { surfaceMaps } from './materialAtlas.js';

type HeroSurface = 'metal' | 'leather' | 'cloth' | 'hair';
interface Maps { color: THREE.Texture; bump: THREE.Texture; roughness: THREE.Texture }
const maps = new Map<HeroSurface, Maps>();
let loading: Promise<void> | undefined;

function texture(canvas: HTMLCanvasElement, color = false): THREE.CanvasTexture {
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.anisotropy = 8;
  return result;
}

/** Loaded once before fitting heroes; the generated swatches remain local assets.
 * Derived maps share the same UV layout and never replace skin or weapon colours. */
export function preloadHeroMaterials(): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  return loading ??= new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = () => { settled = true; clearTimeout(timer); resolve(); };
    const timer = setTimeout(finish, 8000);
    image.onload = () => {
      if (settled) return;
      try {
        for (const [index, kind] of (['metal', 'leather', 'cloth', 'hair'] as const).entries()) {
          const canvases = Array.from({ length: 3 }, () => {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; return canvas;
          });
          const [color, bump, roughness] = canvases;
          const context = color.getContext('2d')!;
          const cell = image.width / 2;
          context.drawImage(image, index % 2 * cell + 2, Math.floor(index / 2) * cell + 2,
            cell - 4, cell - 4, 0, 0, 512, 512);
          const pixels = context.getImageData(0, 0, 512, 512);
          // Repair only the tile seam, preserving the fine engraved pattern.
          for (let axis = 0; axis < 2; axis++) for (let line = 0; line < 512; line++) for (let edge = 0; edge < 16; edge++) {
            const a = (axis ? edge * 512 + line : line * 512 + edge) * 4;
            const b = (axis ? (511 - edge) * 512 + line : line * 512 + 511 - edge) * 4;
            const blend = .5 * (1 - edge / 16) ** 2;
            for (let ch = 0; ch < 3; ch++) {
              const left = pixels.data[a + ch], right = pixels.data[b + ch];
              pixels.data[a + ch] = left + (right - left) * blend;
              pixels.data[b + ch] = right + (left - right) * blend;
            }
          }
          const height = context.createImageData(512, 512), rough = context.createImageData(512, 512);
          for (let p = 0; p < pixels.data.length; p += 4) {
            const luma = pixels.data[p] * .2126 + pixels.data[p + 1] * .7152 + pixels.data[p + 2] * .0722;
            for (let ch = 0; ch < 3; ch++) {
              pixels.data[p + ch] = Math.min(255, 85 + luma * .85);
              height.data[p + ch] = luma;
              rough.data[p + ch] = kind === 'metal' ? 145 + luma * .35 : 200 + luma * .2;
            }
            height.data[p + 3] = rough.data[p + 3] = 255;
          }
          context.putImageData(pixels, 0, 0);
          bump.getContext('2d')!.putImageData(height, 0, 0);
          roughness.getContext('2d')!.putImageData(rough, 0, 0);
          maps.set(kind, { color: texture(color, true), bump: texture(bump), roughness: texture(roughness) });
        }
      } catch (error) { console.warn('Hero textures unavailable; using base materials.', error); }
      finish();
    };
    image.onerror = finish;
    image.src = '/textures/hero-material-atlas.png';
  });
}

export function heroMaterial(kind: HeroSurface, color: number): THREE.MeshStandardMaterial {
  const detail = maps.get(kind) ?? (kind === 'hair' ? undefined : surfaceMaps(kind));
  return new THREE.MeshStandardMaterial({
    name: `hero_${kind}`, color, map: detail?.color ?? null, bumpMap: detail?.bump ?? null,
    bumpScale: kind === 'metal' ? .012 : kind === 'hair' ? .006 : .009,
    roughnessMap: detail?.roughness ?? null, roughness: kind === 'metal' ? .58 : kind === 'hair' ? .68 : .95,
    metalness: kind === 'metal' ? .68 : 0,
  });
}
