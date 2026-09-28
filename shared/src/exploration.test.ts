import {expect,it} from 'vitest';
import {getZone, isWalkable, findPath, SPAWN_ZONES} from './index.js';

it.each(['bosque','ruinas','yermo','marismas','monasterio','minas','fragua'])('opens inhabited outer hunting sectors in %s', id => {
  const zone=getZone(id);
  const destination={x:zone.center.x+100,z:zone.center.z+90};
  expect(isWalkable(id,destination)).toBe(true);
  const path=findPath(id,zone.spawn,destination);
  expect(path.at(-1)).toEqual(destination);
  expect(SPAWN_ZONES.some(s=>s.mapId===id && Math.hypot(s.centerX-zone.center.x,s.centerZ-zone.center.z)>85)).toBe(true);
});
