import { describe, expect, it } from 'vitest';
import { CRYPT_BOUNDS, CRYPT_BOSS, CRYPT_ROOMS, CRYPT_ROUTE, CRYPT_SEALS, CRYPT_SPAWN, CRYPT_WAVE_SIZE, CRYPT_WAVE_TEMPLATES } from './dungeon.js';
import { SPAWN_ZONES, getTemplate } from './mobs.js';
import { getMobExp } from './progression.js';
import { clipMovement, findPath, isWalkable } from './navigation.js';
import { getZone } from './world.js';
import { STRUCTURE_BOXES } from './structures.js';

describe('expanded crypt layout',()=>{
  const spawns=SPAWN_ZONES.filter(s=>s.mapId==='cripta');
  it('has two six-creature waves, six distinct models and preserves campaign XP',()=>{
    for(const stage of [0,2])expect(spawns.filter(s=>CRYPT_WAVE_TEMPLATES[stage].includes(s.templateId)).reduce((n,s)=>n+s.count,0)).toBe(CRYPT_WAVE_SIZE);
    expect(new Set(spawns.map(s=>getTemplate(s.templateId).model)).size).toBe(6);
    expect(spawns.reduce((n,s)=>n+s.count*getMobExp(s.templateId),0)).toBe(1090);
    expect(getTemplate('crypt_warden').model).toBe('AncientDrake');
  });
  it('fits all rooms, obstacles and encounter disks in enlarged bounds',()=>{
    expect(getZone('cripta').bounds).toEqual(CRYPT_BOUNDS);
    for(const r of CRYPT_ROOMS){
      expect(r.x-r.width/2).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minX);
      expect(r.x+r.width/2).toBeLessThanOrEqual(CRYPT_BOUNDS.maxX);
      expect(r.z-r.depth/2).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minZ);
      expect(r.z+r.depth/2).toBeLessThanOrEqual(CRYPT_BOUNDS.maxZ);
    }
    for(const s of STRUCTURE_BOXES.filter(s=>s.mapId==='cripta')){
      expect(s.x-s.width/2).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minX);
      expect(s.x+s.width/2).toBeLessThanOrEqual(CRYPT_BOUNDS.maxX);
      expect(s.z-s.depth/2).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minZ);
      expect(s.z+s.depth/2).toBeLessThanOrEqual(CRYPT_BOUNDS.maxZ);
    }
  });
  it('reaches every seal, room and encounter from entrance without crossing structures',()=>{
    const targets=[...CRYPT_SEALS,...CRYPT_ROOMS,...spawns.map(s=>({x:s.centerX,z:s.centerZ})),CRYPT_BOSS];
    for(const target of targets){
      expect(isWalkable('cripta',target),JSON.stringify(target)).toBe(true);
      const path=findPath('cripta',CRYPT_SPAWN,target);
      expect(path.length,JSON.stringify(target)).toBeGreaterThan(0);
      expect(path.at(-1)).toEqual({x:target.x,z:target.z});
      let from: {x:number;z:number}=CRYPT_SPAWN;
      for(const waypoint of path){expect(clipMovement('cripta',from,waypoint)).toEqual(waypoint);from=waypoint;}
    }
  });
  it('keeps authored route segments directly walkable with body clearance',()=>{
    for(let i=1;i<CRYPT_ROUTE.length;i++)expect(clipMovement('cripta',CRYPT_ROUTE[i-1],CRYPT_ROUTE[i],.6)).toEqual(CRYPT_ROUTE[i]);
  });
});
