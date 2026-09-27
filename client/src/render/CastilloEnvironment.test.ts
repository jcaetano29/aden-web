import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CASTLE_CENTER } from '@aden/shared';
import { addCastilloEnvironment } from './CastilloEnvironment.js';

describe('Chaos Castle arena', () => {
  it('builds three rings over the abyss that turn red before falling and vanish when they fall', () => {
    const scene = new THREE.Scene();
    const arena = addCastilloEnvironment(scene);
    expect(arena.root.name).toBe('castillo-landmarks');
    const ring = (n: number) => arena.root.getObjectByName(`castle-ring-${n}`)!;
    for (const n of [1, 2, 3]) { expect(ring(n).position.x).toBe(CASTLE_CENTER.x); expect(ring(n).position.z).toBe(CASTLE_CENTER.z); }
    const color = (n: number) => ((ring(n).children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.getHex();
    arena.update(0, true);
    expect(color(1)).toBe(0xaa1a10);
    arena.update(1, false);
    expect(ring(1).visible).toBe(false); expect(ring(2).visible).toBe(true);
    expect(color(2)).toBe(0x000000);
    arena.update(1, true);
    expect(color(2)).toBe(0xaa1a10);
    arena.update(2, false);
    expect(ring(2).visible).toBe(false); expect(ring(3).visible).toBe(true);
  });
});
