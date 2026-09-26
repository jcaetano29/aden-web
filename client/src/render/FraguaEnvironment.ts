import * as THREE from 'three';
import { FORGE_LAVA, FORGE_ANVILS, FORGE_RUNES, FORGE_ARENA, getZone, getWorldObject } from '@aden/shared';
import { metalMat, crackedStoneMat } from './textures.js';

/** Fragua de los Primeros: lava (mismas huellas que la navegación), yunques, pilares rúnicos, basalto y el fulgor de la arena. */
export function addFraguaEnvironment(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group(); root.name = 'fragua-landmarks';
  const b = getZone('fragua').bounds;
  const lava = new THREE.MeshStandardMaterial({ color: 0xff6a1f, emissive: 0xff4a10, emissiveIntensity: 1.4, roughness: 0.6 });
  const basalt = crackedStoneMat(0x2a2320, [1, 1]), iron = metalMat(0x3d3a38);
  const rune = new THREE.MeshStandardMaterial({ color: 0xffc36b, emissive: 0xff9a3c, emissiveIntensity: 1.8 });

  // Canales de lava con bordes de basalto al ras del suelo.
  for (const [i, channel] of FORGE_LAVA.entries()) {
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(channel.width, channel.depth), lava);
    surface.name = `forge-lava-${i}`; surface.rotation.x = -Math.PI / 2; surface.position.set(channel.x, 0.05, channel.z);
    surface.userData.ground = true; root.add(surface);
    for (const side of [-1, 1]) {
      const along = new THREE.Mesh(new THREE.BoxGeometry(channel.width + 0.8, 0.35, 0.4), basalt);
      along.position.set(channel.x, 0.17, channel.z + side * channel.depth / 2); root.add(along);
      const across = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, channel.depth + 0.8), basalt);
      across.position.set(channel.x + side * channel.width / 2, 0.17, channel.z); root.add(across);
    }
  }

  // Yunques antiguos de la arena (decorativos: el objeto interactivo es el del servidor).
  for (const id of FORGE_ANVILS) {
    const { x, z } = getWorldObject(id);
    const anvil = new THREE.Group(); anvil.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.8), basalt); base.position.y = 0.4; anvil.add(base);
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.7), iron); face.position.y = 0.97; anvil.add(face);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 8), iron); horn.rotation.z = -Math.PI / 2; horn.position.set(1.15, 0.97, 0); anvil.add(horn);
    root.add(anvil);
  }

  // Pilares rúnicos: columna de basalto con una runa encendida.
  for (const id of FORGE_RUNES) {
    const { x, z } = getWorldObject(id);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 3.2, 7), basalt); column.position.set(x, 1.6, z); root.add(column);
    const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 16), rune); glyph.position.set(x, 2.2, z + 0.62); root.add(glyph);
  }

  // Pared de basalto en el borde norte, detrás de la arena.
  for (let x = b.minX + 4; x <= b.maxX - 4; x += 7) {
    const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), basalt);
    const s = 3.8 + ((x * 11) % 7) * 0.45;
    boulder.scale.set(s, s * 1.8, s); boulder.position.set(x, s * 0.8, b.minZ - 3); root.add(boulder);
  }

  // Fulgor de la Fragua sobre la arena y brasas que flotan sobre la lava.
  const glow = new THREE.PointLight(0xff7a2a, 3.5, 40, 1.5);
  glow.name = 'forge-arena-glow'; glow.position.set(FORGE_ARENA.x, 5, FORGE_ARENA.z); root.add(glow);
  const count = 120, positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const channel = FORGE_LAVA[i % FORGE_LAVA.length];
    positions[i * 3] = channel.x + (((i * 37) % 100) / 100 - 0.5) * channel.width;
    positions[i * 3 + 1] = 0.5 + ((i * 53) % 100) / 25;
    positions[i * 3 + 2] = channel.z + (((i * 71) % 100) / 100 - 0.5) * channel.depth;
  }
  const embers = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({ color: 0xffa24a, size: 0.18, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  embers.name = 'forge-embers'; root.add(embers);

  scene.add(root);
  return root;
}
