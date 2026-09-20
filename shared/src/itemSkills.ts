import type { SkillConfig } from './combat.js';
import { learnedSkillIds } from './classes.js';
import { getItem } from './items.js';

export const ITEM_SKILLS:Record<string,SkillConfig>={
  item_arcane: {id:'item_arcane',name:'Pulso del Catalizador',type:'damage',factor:2,mpCost:10,cooldownMs:5000,range:10,projectile:true,vfxColor:0xb389ef},
  item_volley: {id:'item_volley',name:'Disparo del Linaje',type:'damage',factor:2,mpCost:10,cooldownMs:5000,range:10,projectile:true,vfxColor:0x9bd667},
  tome_energy_ball:{id:'tome_energy_ball',name:'Orbe del Umbral',type:'damage',factor:1.8,mpCost:8,cooldownMs:2500,range:10,projectile:true,vfxColor:0xb0a4ff},
  tome_fire_ball:{id:'tome_fire_ball',name:'Ascua Errante',type:'damage',factor:2.3,mpCost:12,cooldownMs:3500,range:10,projectile:true,vfxColor:0xff974e},
  tome_power_wave:{id:'tome_power_wave',name:'Marea de Éter',type:'damage',factor:2,mpCost:14,cooldownMs:4500,range:8,vfxColor:0xa085e8},
  tome_lightning:{id:'tome_lightning',name:'Veredicto de la Tormenta',type:'damage',factor:2.2,stunMs:500,mpCost:18,cooldownMs:6500,range:10,vfxColor:0x99cfff},
  tome_meteorite:{id:'tome_meteorite',name:'Fragmento del Ocaso',type:'damage',factor:3,mpCost:24,cooldownMs:8000,range:10,projectile:true,vfxColor:0xff864a},
  tome_ice:{id:'tome_ice',name:'Sello de Escarcha',type:'damage',factor:1.7,rootMs:1000,mpCost:18,cooldownMs:7000,range:10,projectile:true,vfxColor:0x8bd8ee},
  tome_poison:{id:'tome_poison',name:'Miasma de la Cripta',type:'dot',dotDps:10,dotMs:5000,mpCost:18,cooldownMs:8000,range:8,vfxColor:0x91c86a},
  tome_flame:{id:'tome_flame',name:'Lengua del Yermo',type:'damage',factor:2.6,mpCost:18,cooldownMs:6000,range:5,vfxColor:0xff632e},
  tome_teleport:{id:'tome_teleport',name:'Pliegue de Nihil',type:'dash',dash:'away',dashRange:8,mpCost:20,cooldownMs:12000,vfxColor:0xbb91fa},
  tome_twister:{id:'tome_twister',name:'Espiral del Vendaval',type:'damage',factor:2,rootMs:700,mpCost:20,cooldownMs:8000,range:8,vfxColor:0xb7e6cb},
  tome_evil_spirit:{id:'tome_evil_spirit',name:'Eco del Sepulcro',type:'damage',factor:2.8,lifestealPct:.1,mpCost:26,cooldownMs:10000,range:10,projectile:true,vfxColor:0xaf8df4},
  tome_hellfire:{id:'tome_hellfire',name:'Pira del Rey Caído',type:'damage',factor:4.5,mpCost:38,cooldownMs:16000,range:6,vfxColor:0xff552b},
};
export function weaponSkillId(weaponId?:string):string|undefined {
  if(!weaponId)return;
  try{const item=getItem(weaponId);if(!item.options?.skill)return;return item.ammo?'item_volley':item.subcategory==='baston'?'item_arcane':'power_strike';}catch{return;}
}
export function availableSkills(className:string,level:number,tomes:readonly string[]=[],weaponId?:string):string[] {
  const skills=learnedSkillIds(className,level);
  if(className==='mage')skills.push(...tomes.filter(id=>id.startsWith('tome_')&&Object.hasOwn(ITEM_SKILLS,id)));
  const weapon=weaponSkillId(weaponId);if(weapon)skills.push(weapon);
  return [...new Set(skills)];
}

export type DamageElement = 'fire'|'ice'|'poison'|'wind'|'lightning';
export function skillElement(id:string):DamageElement|undefined {
  if(['fireball','meteor','tome_fire_ball','tome_meteorite','tome_flame','tome_hellfire'].includes(id))return 'fire';
  if(['ice_lance','frost_nova','tome_ice'].includes(id))return 'ice';
  if(['poison','tome_poison'].includes(id))return 'poison';
  if(id==='tome_twister')return 'wind';
  if(id==='tome_lightning')return 'lightning';
}
