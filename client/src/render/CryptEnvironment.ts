import { STRUCTURE_BOXES, CRYPT_ROOMS, CRYPT_ROUTE, CRYPT_SEALS, CRYPT_BOSS } from "@aden/shared";
import * as THREE from "three";
import { stoneMat, crackedStoneMat, cobbleMat } from "./textures.js";

/** Floors follow the authored route; every solid wall/pillar uses the shared collision box. */
export function addCryptEnvironment(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group(); root.name = "crypt-chambers";
  const stone = stoneMat(0x9995a5, [1, 3]);
  const floor = crackedStoneMat(0x999ba8, [9, 8]);
  const path = cobbleMat(0xa8997c, [2, 12]);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf9b353, emissive: 0xff8822, emissiveIntensity: .5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x86d8ff, emissive: 0x389dff, emissiveIntensity: .6 });
  const ash = new THREE.MeshStandardMaterial({ color: 0x544036, roughness: .95 });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const strip = (a: { x: number; z: number }, b: { x: number; z: number }, width: number, y: number, material: THREE.Material) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const mesh = box((a.x + b.x) / 2, y, (a.z + b.z) / 2, width, .02, length, material);
    mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); mesh.userData.ground = true; return mesh;
  };
  for (let i = 1; i < CRYPT_ROUTE.length; i++) {
    const a = CRYPT_ROUTE[i - 1], b = CRYPT_ROUTE[i];
    strip(a, b, 12, .045, path).name = `crypt-passage-${i}`;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 2; d + 1.6 < length; d += 6) {
      const point = (distance: number) => ({ x: a.x + (b.x - a.x) * distance / length, z: a.z + (b.z - a.z) * distance / length });
      strip(point(d), point(d + 1.6), .35, .095, gold);
    }
  }
  CRYPT_ROOMS.forEach((room, index) => {
    const chamber = box(room.x, .04, room.z, room.width, .08, room.depth, floor);
    chamber.name = `crypt-room-${room.id}`; chamber.userData.ground = true;
    // Inlaid burial slabs and rune borders are flush with the floor, never fake obstacles.
    for (const side of [-1, 1]) for (const offset of [-.24, 0, .24]) {
      const x = room.x + side * (room.width / 2 - 5), z = room.z + offset * room.depth;
      const slab = box(x, .09, z, 2.5, .01, 4.2, index === 2 ? ash : stone);
      slab.name = "crypt-burial-inlay"; slab.userData.ground = true;
      strip({ x: x - .7, z }, { x: x + .7, z }, .15, .099, index === 2 ? gold : blue);
      strip({ x, z: z - 1.2 }, { x, z: z + 1.2 }, .15, .099, index === 2 ? gold : blue);
    }
  });
  const materials = { stone, gold, blue };
  for (const p of STRUCTURE_BOXES.filter(p => p.mapId === "cripta")) {
    const mesh = box(p.x, p.y, p.z, p.width, p.height, p.depth, materials[p.material as keyof typeof materials] ?? stone);
    mesh.rotation.y = p.rotation; mesh.castShadow = true;
    if (p.solid) mesh.userData.structureId = p.id;
  }
  CRYPT_SEALS.forEach((seal, index) => {
    const room = CRYPT_ROOMS[index + 1];
    strip({ x: room.x, z: seal.z }, seal, .3, .099, index === 0 ? blue : gold);
  });
  const arena = new THREE.Mesh(new THREE.RingGeometry(17.5, 18, 96), gold);
  arena.rotation.x = -Math.PI / 2; arena.position.set(CRYPT_BOSS.x, .1, CRYPT_BOSS.z); arena.userData.ground = true; arena.name = "crypt-arena"; root.add(arena);
  scene.add(root); return root;
}
