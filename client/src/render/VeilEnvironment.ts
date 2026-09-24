import * as THREE from 'three';
import { VEIL_POOLS } from '@aden/shared';
import { woodMat } from './textures.js';

/** The water footprints are also authoritative navigation obstacles. */
export function addVeilEnvironment(scene: THREE.Scene): void {
  const root = new THREE.Group(); root.name = 'marismas-landmarks';
  const water = new THREE.MeshStandardMaterial({ color: 0x3b6c6b, roughness: .22, metalness: .35 });
  const reed = new THREE.MeshStandardMaterial({ color: 0x879b68, roughness: 1 });
  for (const pool of VEIL_POOLS) {
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(pool.width, pool.depth), water);
    surface.rotation.x = -Math.PI / 2; surface.position.set(pool.x, .045, pool.z);
    root.add(surface);
    const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .07, 1, 4), reed, 64);
    const pose = new THREE.Object3D();
    for (let i = 0; i < 64; i++) {
      const side = i % 4, t = Math.floor(i / 4) / 15 - .5;
      const x = side < 2 ? (side === 0 ? -1 : 1) * (pool.width / 2 - .25) : t * pool.width;
      const z = side >= 2 ? (side === 2 ? -1 : 1) * (pool.depth / 2 - .25) : t * pool.depth;
      const h = .6 + (i * 17 % 9) / 12;
      pose.position.set(pool.x + x, h / 2, pool.z + z); pose.scale.set(1, h, 1);
      pose.updateMatrix(); reeds.setMatrixAt(i, pose.matrix);
    }
    root.add(reeds);
  }
  const boards = woodMat(0x8b8972, [5, 1]);
  // Broad, low causeway: the collision ground remains at y=0.
  for (let i = 0; i < 55; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(7, .08, 1.7), boards);
    plank.position.set(1200, .07, 200 - i * 1.8); plank.receiveShadow = true; root.add(plank);
  }
  const cart = new THREE.Group(); cart.position.set(1184, 0, 116);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4, .3, 2.5), boards); bed.position.y = .8; cart.add(bed);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, .8, .16), boards); wall.position.set(0, 1.25, side * 1.2); cart.add(wall);
    for (const x of [-1.3, 1.3]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(.55, .1, 5, 12), boards); wheel.position.set(x, .6, side * 1.45); cart.add(wheel);
    }
  }
  cart.rotation.z = -.12; root.add(cart);
  scene.add(root);
}
