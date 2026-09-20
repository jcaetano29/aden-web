import * as THREE from "three";
import { stoneMat, crackedStoneMat, cobbleMat } from "./textures.js";

/** Open ruined chambers: all walkable routes remain clear (no visual-only closed gates). */
export function addCryptEnvironment(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group(); root.name = "crypt-chambers";
  const stone = stoneMat(0x9995a5, [1, 3]);
  const floor = crackedStoneMat(0x999ba8, [7, 5]);
  const path = cobbleMat(0xa8997c, [2, 20]);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf9b353, emissive: 0xff8822, emissiveIntensity: .5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x86d8ff, emissive: 0x389dff, emissiveIntensity: .6 });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  box(900, .025, 0, 7, .05, 94, path).userData.ground = true;
  for (const [index, z] of [28, -1, -34].entries()) {
    const chamber = box(900, .04, z, 38, .08, 26, floor); chamber.name = `crypt-room-${index + 1}`; chamber.userData.ground = true;
    // Side ruins mark each room; absent front walls preserve isometric visibility.
    for (const x of [879, 921]) {
      box(x, .35, z, .8, .7, 24, stone);
      for (const dz of [-10, 10]) {
        const pillar = box(x, 2.1, z + dz, 1.3, 4.2, 1.3, stone); pillar.castShadow = true;
        box(x, 4.3, z + dz, 1.9, .3, 1.9, stone);
        box(x, 4.65, z + dz, .6, .45, .6, index === 2 ? gold : blue);
      }
    }
  }
  for (const z of [14, -18]) for (const x of [895, 905]) {
    box(x, 1.4, z, .65, 2.8, .65, stone);
    box(x, 2.9, z, .8, .35, .8, gold);
  }
  // Dashed golden route and two lateral branches guide players to the seals.
  for (let z = 41; z >= -32; z -= 5) box(900, .09, z, .4, .02, 1.6, gold).userData.ground = true;
  box(895, .09, 15, 10, .02, .35, blue).userData.ground = true;
  box(905, .09, -12, 10, .02, .35, gold).userData.ground = true;
  const arena = new THREE.Mesh(new THREE.RingGeometry(8, 8.3, 64), gold);
  arena.rotation.x = -Math.PI / 2; arena.position.set(900, .1, -37); arena.userData.ground = true; root.add(arena);
  scene.add(root); return root;
}
