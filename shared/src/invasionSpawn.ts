import { getZone } from './world.js';
import { isWalkable, findPath } from './navigation.js';
import { WORLD_OBJECTS } from './worldobjects.js';

/** Random position with a navigable approach and room to dodge. A bounded
 * deterministic scan handles an unlucky RNG without a fixed spawn table. */
export function chooseInvasionSpawn(mapId: string, rng:()=>number): {x:number;z:number} {
  const zone=getZone(mapId), b=zone.bounds, margin=31;
  const minX=b.minX+margin,maxX=b.maxX-margin,minZ=b.minZ+margin,maxZ=b.maxZ-margin;
  const valid=(p:{x:number;z:number})=> {
    if(Math.hypot(p.x-zone.spawn.x,p.z-zone.spawn.z)<36 || !isWalkable(mapId,p,5))return false;
    if(WORLD_OBJECTS.some(o=>o.mapId===mapId&&Math.hypot(p.x-o.x,p.z-o.z)<10))return false;
    const path=findPath(mapId,zone.spawn,p), end=path.at(-1);
    return !!end&&Math.hypot(end.x-p.x,end.z-p.z)<.1;
  };
  for(let i=0;i<96;i++) {
    const p={x:minX+Math.max(0,Math.min(1,rng()))*(maxX-minX),z:minZ+Math.max(0,Math.min(1,rng()))*(maxZ-minZ)};
    if(valid(p))return p;
  }
  for(let z=minZ;z<=maxZ;z+=4)for(let x=minX;x<=maxX;x+=4)if(valid({x,z}))return {x,z};
  throw new Error(`No hay un lugar accesible para la invasión en ${mapId}`);
}
