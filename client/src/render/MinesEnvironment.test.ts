import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MINES_PITS, MINES_GATE, getZone } from '@aden/shared';
import { addMinesEnvironment } from './MinesEnvironment.js';

describe('Mines environment', () => {
  it('draws each pit on its authoritative footprint and keeps the scenery inside the map', () => {
    const scene = new THREE.Scene();
    const root = addMinesEnvironment(scene);
    expect(root.name).toBe('minas-landmarks');
    for (const [i, pit] of MINES_PITS.entries()) {
      const mesh = root.getObjectByName(`mines-pit-${i}`) as THREE.Mesh<THREE.PlaneGeometry>;
      expect(mesh.position.x).toBe(pit.x); expect(mesh.position.z).toBe(pit.z);
      expect(mesh.geometry.parameters.width).toBe(pit.width); expect(mesh.geometry.parameters.height).toBe(pit.depth);
    }
    expect(root.getObjectByName('mines-forge-glow')!.position.z).toBeLessThan(MINES_GATE.z + 1);
    const b = getZone('minas').bounds;
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const p = new THREE.Vector3(); o.getWorldPosition(p);
      expect(p.x).toBeGreaterThanOrEqual(b.minX); expect(p.x).toBeLessThanOrEqual(b.maxX);
      expect(p.z).toBeGreaterThanOrEqual(b.minZ - 6); expect(p.z).toBeLessThanOrEqual(b.maxZ);
    });
  });
});
