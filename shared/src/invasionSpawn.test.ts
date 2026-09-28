import {expect,it} from 'vitest';
import {chooseInvasionSpawn,INVADERS,getZone,isWalkable,findPath} from './index.js';

it('excludes the stone landmarks framing the outer camps',()=>{
  const landmark={x:204,z:-69};
  expect(isWalkable('bosque',landmark)).toBe(false);
  const draws=[1/194,28/194,.1,.1];let index=0;
  const point=chooseInvasionSpawn('bosque',()=>draws[Math.min(index++,draws.length-1)]);
  expect(Math.hypot(point.x-landmark.x,point.z-landmark.z)).toBeGreaterThan(5);
});

it('places every invader away from arrivals, inside the map, reachable and with combat clearance',()=>{
  let seed=271;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const id of new Set(Object.values(INVADERS).flatMap(i=>[...i.maps]))) {
    const zone=getZone(id), b=zone.bounds;
    for(let i=0;i<6;i++) {
      const p=chooseInvasionSpawn(id,rng);
      expect(p.x-30).toBeGreaterThan(b.minX);expect(p.x+30).toBeLessThan(b.maxX);
      expect(p.z-30).toBeGreaterThan(b.minZ);expect(p.z+30).toBeLessThan(b.maxZ);
      expect(Math.hypot(p.x-zone.spawn.x,p.z-zone.spawn.z)).toBeGreaterThanOrEqual(36);
      expect(isWalkable(id,p,5)).toBe(true);
      expect(findPath(id,zone.spawn,p).at(-1)).toEqual(p);
    }
    expect(isWalkable(id,chooseInvasionSpawn(id,()=>.5),5)).toBe(true);
  }
});
