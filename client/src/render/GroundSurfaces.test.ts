import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ZONES } from '@aden/shared';
import { Environment } from './Environment.js';

describe('map floor depth', () => {
  const scene = new THREE.Scene();
  const floors: { mesh: THREE.Mesh; bounds: THREE.Box3 }[] = [];
  beforeAll(() => {
    new Environment(scene);
    scene.updateMatrixWorld(true);
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
      const bounds = new THREE.Box3().setFromObject(object);
      const horizontalPlane = object.geometry instanceof THREE.PlaneGeometry && bounds.max.y - bounds.min.y < .001;
      if ((object.userData.ground || horizontalPlane) && bounds.max.y < .2) floors.push({ mesh: object, bounds });
    });
  });

  for (const zone of ZONES) it(`${zone.id}: overlapping visible floors have distinct depths`, () => {
    const local = floors.filter(({ bounds }) => bounds.min.x < zone.bounds.maxX && bounds.max.x > zone.bounds.minX
      && bounds.min.z < zone.bounds.maxZ && bounds.max.z > zone.bounds.minZ);
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
    const conflicts = new Set<string>();
    for (let i = 0; i < local.length; i++) for (let j = i + 1; j < local.length; j++) {
      const a = local[i].bounds, b = local[j].bounds;
      const left = Math.max(a.min.x, b.min.x), right = Math.min(a.max.x, b.max.x);
      const north = Math.max(a.min.z, b.min.z), south = Math.min(a.max.z, b.max.z);
      if (right - left < .01 || south - north < .01) continue;
      for (const t of [.25, .5, .75]) {
        const x = left + (right - left) * t, z = north + (south - north) * t;
        ray.ray.origin.set(x, 1, z);
        const hits = ray.intersectObjects(local.map(f => f.mesh), false)
          .filter((hit, index, all) => all.findIndex(other => other.object === hit.object) === index);
        if (hits.length < 2 || hits[0].point.y - hits[1].point.y >= .005) continue;
        conflicts.add(`${hits[0].object.name || hits[0].object.parent?.name || 'floor'} / ${hits[1].object.name || hits[1].object.parent?.name || 'floor'} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    }
    expect([...conflicts]).toEqual([]);
  });

  it('floor overlays receive shadows without casting them back onto the terrain', () => {
    expect(floors.filter(({ mesh }) => mesh.castShadow).map(({ mesh }) => mesh.parent?.name)).toEqual([]);
  });
});
