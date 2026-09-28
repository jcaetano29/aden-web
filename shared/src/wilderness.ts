import { getZone } from './world.js';

/** Outer hunting sectors. Existing campaign routes keep their authored positions. */
const fauna: Record<string, readonly string[]> = {
  bosque: ['skeleton_minion', 'skeleton_warrior', 'umbra_orc', 'skeleton_warrior'],
  ruinas: ['crypt_minion', 'crypt_warrior', 'crypt_wraith', 'crypt_warrior'],
  yermo: ['ash_minion', 'ash_warrior', 'infernal_demon', 'ash_warrior'],
  marismas: ['veil_raider', 'veil_raider', 'veil_raider', 'veil_raider'],
  monasterio: ['memory_guard', 'memory_guard', 'memory_guard', 'memory_guard'],
  minas: ['mine_digger', 'mine_armor', 'cave_troll', 'mine_digger'],
  fragua: ['forge_construct', 'forge_construct', 'forge_construct', 'forge_construct'],
};
const sectors = [[-92,-82], [88,-90], [-92,86], [86,82]] as const;
export const WILDERNESS_CAMPS = Object.entries(fauna).flatMap(([mapId, templates]) =>
  sectors.map(([dx,dz], i) => ({ id:`${mapId}_outskirts_${i}`, mapId, templateId:templates[i],
    centerX:getZone(mapId).center.x+dx, centerZ:getZone(mapId).center.z+dz, radius:7, count:3 })));

/** Shared footprints: scenery, movement and invasion placement agree. */
export const WILDERNESS_LANDMARKS = WILDERNESS_CAMPS.flatMap((camp,index) => {
  const out=([-1,1] as const).map(side=>({id:`${camp.id}_post_${side}`,mapId:camp.mapId,kind:'post',side,
    x:camp.centerX+side*12,z:camp.centerZ-10,height:5,width:.4,depth:.4,rotation:0}));
  for(let n=0;n<=index%4;n++)out.push({id:`${camp.id}_stone_${n}`,mapId:camp.mapId,kind:'stone',side:1,
    x:camp.centerX-4+n*2.6,z:camp.centerZ+13,height:2.5+n*.7,width:1.4,depth:1.4,rotation:0});
  return out;
});

/** Low props leave the outer ring traversable. */
export function wildernessProps(mapId: string) {
  if (!fauna[mapId]) return [];
  const zone=getZone(mapId), out:Array<{x:number;z:number;scale:number;yaw:number}>=[];
  let seed=Array.from(mapId).reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0),7421)>>>0;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<420;i++) {
    const dx=(rng()*2-1)*120,dz=(rng()*2-1)*120;
    if(Math.max(Math.abs(dx),Math.abs(dz))<67 || Math.abs(dx)<8 || Math.abs(dz)<8)continue;
    if(sectors.some(([x,z])=>Math.hypot(dx-x,dz-z)<15))continue;
    out.push({x:zone.center.x+dx,z:zone.center.z+dz,scale:.6+rng()*.9,yaw:rng()*Math.PI*2});
  }
  return out;
}
