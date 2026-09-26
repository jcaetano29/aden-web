import * as THREE from 'three';
import { MINES_PITS, MINES_LIFT, MINES_GATE, getZone } from '@aden/shared';
import { woodMat, metalMat, crackedStoneMat } from './textures.js';

/** Minas de Hierro Negro: pozos (mismas huellas que la navegación), vías, faroles, pared de roca y la Puerta encendida. */
export function addMinesEnvironment(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group(); root.name = 'minas-landmarks';
  const zone = getZone('minas'), b = zone.bounds;
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 1 });
  const timber = woodMat(0x5b4a38, [1, 2]), iron = metalMat(0x4d4f52), rock = crackedStoneMat(0x4a4540, [2, 2]);

  // Pozos: fondo oscuro y un marco de vigas al ras del suelo.
  for (const [i, pit] of MINES_PITS.entries()) {
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(pit.width, pit.depth), dark);
    hole.name = `mines-pit-${i}`; hole.rotation.x = -Math.PI / 2; hole.position.set(pit.x, 0.05, pit.z);
    hole.userData.ground = true; root.add(hole);
    for (const side of [-1, 1]) {
      const along = new THREE.Mesh(new THREE.BoxGeometry(pit.width + 0.6, 0.3, 0.3), timber);
      along.position.set(pit.x, 0.15, pit.z + side * pit.depth / 2); root.add(along);
      const across = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, pit.depth + 0.6), timber);
      across.position.set(pit.x + side * pit.width / 2, 0.15, pit.z); root.add(across);
    }
  }

  // Vías de vagoneta a lo largo del camino principal (planas: el suelo de colisión sigue en y=0).
  for (const dx of [-0.7, 0.7]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 96), iron);
    rail.position.set(zone.center.x + dx, 0.06, zone.center.z + 4); root.add(rail);
  }
  for (let i = 0; i < 48; i++) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.3), timber);
    tie.position.set(zone.center.x, 0.04, zone.center.z - 44 + i * 2); root.add(tie);
  }

  // Faroles de aceite a los costados del camino.
  const flame = new THREE.MeshStandardMaterial({ color: 0xffc36b, emissive: 0xff9a3c, emissiveIntensity: 1.6 });
  for (let i = 0; i < 6; i++) {
    const z = 190 - i * 17;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), timber);
      post.position.set(zone.center.x + side * 4.5, 1.3, z); root.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), flame);
      lamp.position.set(zone.center.x + side * 4.5, 2.7, z); root.add(lamp);
    }
  }

  // Pared de roca en el borde norte, detrás de la Puerta.
  for (let x = b.minX + 4; x <= b.maxX - 4; x += 7) {
    const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rock);
    const s = 3.5 + ((x * 13) % 7) * 0.4;
    boulder.scale.set(s, s * 1.6, s); boulder.position.set(x, s * 0.7, b.minZ - 3); root.add(boulder);
  }

  // Resplandor de la Fragua detrás de la Puerta.
  const glow = new THREE.PointLight(0xff7a2a, 3.2, 30, 1.6);
  glow.name = 'mines-forge-glow'; glow.position.set(MINES_GATE.x, 4, MINES_GATE.z - 1); root.add(glow);
  const heart = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, opacity: 0.55 }));
  heart.position.set(MINES_GATE.x, 3.5, MINES_GATE.z - 1.4); root.add(heart);

  // Polea del castillete sobre el montacargas (decorativa, sin colisión).
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 18), iron);
  wheel.name = 'mines-lift-wheel'; wheel.position.set(MINES_LIFT.x, 7.3, MINES_LIFT.z); wheel.rotation.y = Math.PI / 2; root.add(wheel);

  scene.add(root);
  return root;
}
