import * as THREE from "three";
import { CASTLE_CENTER } from "@aden/shared";
import { crackedStoneMat } from "./textures.js";

const WARNING = 0xaa1a10;

/**
 * Castillo del Caos: plataforma de piedra sobre el abismo en tres anillos (borde, medio, centro).
 * El anillo que va a caer se enciende en rojo durante el aviso y desaparece al derrumbarse.
 */
export function addCastilloEnvironment(scene: THREE.Scene): { root: THREE.Group; update(ring: number, warning: boolean): void } {
  const root = new THREE.Group(); root.name = "castillo-landmarks";
  const ringMats = [0x4a4252, 0x3f3848, 0x5a4e62].map(color => crackedStoneMat(color, [2, 2]) as THREE.MeshStandardMaterial);
  const slab = (w: number, d: number, x: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), mat); m.position.set(x, -0.6, z); m.receiveShadow = true; return m;
  };
  const ringGroup = (n: number) => {
    const g = new THREE.Group(); g.name = `castle-ring-${n}`; g.position.set(CASTLE_CENTER.x, 0, CASTLE_CENTER.z); root.add(g); return g;
  };

  // Borde (20–30) y medio (10–20): marcos de cuatro losas. Centro (0–10): una losa.
  const ring1 = ringGroup(1), ring2 = ringGroup(2), ring3 = ringGroup(3);
  ring1.add(slab(60, 10, 0, -25, ringMats[0]), slab(60, 10, 0, 25, ringMats[0]), slab(10, 40, -25, 0, ringMats[0]), slab(10, 40, 25, 0, ringMats[0]));
  ring2.add(slab(40, 10, 0, -15, ringMats[1]), slab(40, 10, 0, 15, ringMats[1]), slab(10, 20, -15, 0, ringMats[1]), slab(10, 20, 15, 0, ringMats[1]));
  ring3.add(slab(20, 20, 0, 0, ringMats[2]));

  // Estandartes en las esquinas del borde (caen con él) y braseros en el centro (quedan hasta el final).
  const pole = new THREE.MeshStandardMaterial({ color: 0x2a2024, roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, z] of [[-28, -28], [28, -28], [-28, 28], [28, 28]]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 6), pole); stick.position.set(x, 3, z); ring1.add(stick);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), cloth); flag.position.set(x, 4.4, z + 0.3); ring1.add(flag);
  }
  const fire = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5a10, emissiveIntensity: 1.6 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a2e, metalness: 0.6, roughness: 0.5 });
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.9, 8), iron); bowl.position.set(x, 0.45, z); ring3.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 7), fire); flame.position.set(x, 1.3, z); ring3.add(flame);
  }
  const glow = new THREE.PointLight(0xff5a3a, 2.4, 60, 1.6); glow.name = "castle-glow"; glow.position.set(CASTLE_CENTER.x, 8, CASTLE_CENTER.z); root.add(glow);

  scene.add(root);
  const rings = [ring1, ring2, ring3];
  return {
    root,
    update(ring: number, warning: boolean) {
      rings.forEach((g, i) => { g.visible = i >= ring; });
      ringMats.forEach((mat, i) => mat.emissive.setHex(warning && i === ring ? WARNING : 0x000000));
    },
  };
}
