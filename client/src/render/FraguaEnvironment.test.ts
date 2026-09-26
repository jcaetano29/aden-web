import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FORGE_LAVA, FORGE_ARENA, getZone } from '@aden/shared';
import { addFraguaEnvironment } from './FraguaEnvironment.js';

describe('Forge environment', () => {
  it('draws each lava channel on its authoritative footprint and keeps the scenery inside the map', () => {
    const scene = new THREE.Scene();
    const root = addFraguaEnvironment(scene);
    expect(root.name).toBe('fragua-landmarks');
    for (const [i, lava] of FORGE_LAVA.entries()) {
      const mesh = root.getObjectByName(`forge-lava-${i}`) as THREE.Mesh<THREE.PlaneGeometry>;
      expect(mesh.position.x).toBe(lava.x); expect(mesh.position.z).toBe(lava.z);
      expect(mesh.geometry.parameters.width).toBe(lava.width); expect(mesh.geometry.parameters.height).toBe(lava.depth);
    }
    const glow = root.getObjectByName('forge-arena-glow')!;
    expect(glow.position.x).toBe(FORGE_ARENA.x); expect(glow.position.z).toBe(FORGE_ARENA.z);
    const b = getZone('fragua').bounds;
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const p = new THREE.Vector3(); o.getWorldPosition(p);
      expect(p.x).toBeGreaterThanOrEqual(b.minX); expect(p.x).toBeLessThanOrEqual(b.maxX);
      expect(p.z).toBeGreaterThanOrEqual(b.minZ - 6); expect(p.z).toBeLessThanOrEqual(b.maxZ);
    });
  });
});
