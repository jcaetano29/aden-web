import * as THREE from 'three';

const faces: THREE.Texture[] = [];
let loading: Promise<void> | undefined;

class HeroFaceMaterial extends THREE.MeshStandardMaterial {
  override customProgramCacheKey(): string { return 'hero-face-projection-v1'; }
  override onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
    shader.vertexShader = 'varying float heroFaceBlend;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nheroFaceBlend = smoothstep(0.15, 0.65, position.z);');
    shader.fragmentShader = 'varying float heroFaceBlend;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      'vec3 heroSkin = diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb = mix(heroSkin, diffuseColor.rgb, heroFaceBlend);');
  }
}

/** Neutralised albedo keeps the class skin tint consistent with neck and hands. */
export function preloadHeroFaces(): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  return loading ??= new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = () => { settled = true; clearTimeout(timer); resolve(); };
    const timer = setTimeout(finish, 8000);
    image.onload = () => {
      if (settled) return;
      try {
        for (let index = 0; index < 2; index++) {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, index * image.width / 2, 0, image.width / 2, image.height, 0, 0, 512, 512);
          const pixels = context.getImageData(0, 0, 512, 512);
          const reference = Array.from(pixels.data.slice(0, 3));
          for (let p = 0; p < pixels.data.length; p += 4) {
            for (let ch = 0; ch < 3; ch++) pixels.data[p + ch] = Math.min(255, pixels.data[p + ch] / Math.max(reference[ch], 1) * 242);
          }
          context.putImageData(pixels, 0, 0);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
          faces[index] = texture;
        }
      } catch (error) { console.warn('Face textures unavailable; using sculpted features.', error); }
      finish();
    };
    image.onerror = finish;
    image.src = '/textures/hero-face-atlas.png';
  });
}

export function heroFaceMaterial(female: boolean, color: number): THREE.MeshStandardMaterial | undefined {
  const map = faces[female ? 1 : 0];
  return map ? new HeroFaceMaterial({ name: 'hero_face', color: new THREE.Color(color).multiplyScalar(1.12), map, roughness: .94, vertexColors: true }) : undefined;
}
