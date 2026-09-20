import { randomUUID } from 'node:crypto';
import { getItem, createItemInstance, rollItemOptions, canEquipItem, upgradeItem, getZone, getSkill, CATALOG_ITEMS, type Loadout } from '@aden/shared';
import { PlayerState } from '../state/PlayerState.js';
import { InventoryItemState } from '../state/InventoryItemState.js';

export function playerLoadout(p:PlayerState):Loadout { return Object.fromEntries(p.equipment.entries()); }
export function instantiateItem(id:string, random=false, maxExcellent=2):string {
  const item=getItem(id);
  return item.type==='equipment' && item.allowedQualities?.length && !item.options
    ? createItemInstance(item,random?rollItemOptions(item,Math.random,maxExcellent):{},randomUUID()) : id;
}
export function grantItem(p:PlayerState,id:string,qty:number):void {
  if(!Number.isSafeInteger(qty)||qty<=0||qty>10000) return;
  const item=getItem(id);
  if(item.type==='equipment' && item.allowedQualities?.length && !item.options) {
    for(let i=0;i<qty;i++) grantItem(p,instantiateItem(id),1);
    return;
  }
  const existing=p.inventory.get(id);
  if(existing) existing.qty+=qty;
  else {const entry=new InventoryItemState();entry.itemTemplateId=id;entry.qty=qty;p.inventory.set(id,entry);}
}
export function removeItem(p:PlayerState,id:string):boolean {
  const entry=p.inventory.get(id);if(!entry || entry.qty<1)return false;
  entry.qty--;if(!entry.qty)p.inventory.delete(id);return true;
}
export function equipItem(p:PlayerState,id:string):boolean {
  if(p.dead || !canEquipItem(id,p.className,p.level,playerLoadout(p)) || !p.inventory.get(id)?.qty) return false;
  const item=getItem(id);const previous=p.equipment.get(item.slot!);
  removeItem(p,id);if(previous)grantItem(p,previous,1);p.equipment.set(item.slot!,id);return true;
}
export function consumeAmmo(p:PlayerState):boolean {
  const id=p.equipment.get('weapon');if(!id)return true;
  const ammo=getItem(id).ammo;if(!ammo)return true;
  for(const [key,entry] of p.inventory) {const item=getItem(key);if(entry.qty>0 && item.category==='municion' && item.ammo===ammo)return removeItem(p,key);}
  return false;
}
export function useInventoryItem(p:PlayerState,id:string,targetId?:string,rng:()=>number=Math.random):boolean {
  if(p.dead || !p.inventory.get(id)?.qty) return false;
  let item;try{item=getItem(id);}catch{return false;}
  if(item.classes && !item.classes.includes(p.className))return false;
  if(p.level<(item.requiredLevel??1))return false;
  if(['upgrade_safe','upgrade_risky','add_option','chaos'].includes(item.useEffect??'')) {
    if(!targetId)return false;
    const slot=[...p.equipment.entries()].find(([,v])=>v===targetId)?.[0];
    if(!slot && !p.inventory.get(targetId)?.qty)return false;
    let target;try{target=getItem(targetId);}catch{return false;}
    if(item.useEffect==='chaos' && target.category==='arma' && (target.options?.level??0)>=6 && (target.tier??0)>=3) {
      if(p.gold<500 || (target.classes && !target.classes.includes(p.className)))return false;
      const ritual=['chaos_dragon_axe','chaos_nature_bow','chaos_lightning_staff','crystal_sword','crystal_morning_star'].includes(target.ref_origen??'');
      if(ritual && ((target.options?.level??0)<9||p.level<40))return false;
      const resultRef=ritual?(p.className==='mage'?'wings_of_heaven':['ranger','rogue'].includes(p.className)?'wings_of_elf':'wings_of_satan')
        :target.ammo?'chaos_nature_bow':target.subcategory==='baston'?'chaos_lightning_staff':target.subcategory==='hacha'?'chaos_dragon_axe':target.subcategory==='maza'?'crystal_morning_star':'crystal_sword';
      const result=Object.values(CATALOG_ITEMS).find(i=>i.ref_origen===resultRef);
      if(!result || !result.classes.includes(p.className))return false;
      if(slot)p.equipment.delete(slot);else removeItem(p,targetId);
      p.gold-=500;removeItem(p,id);grantItem(p,result.id,1);return true;
    }
    const options=upgradeItem(target,item.useEffect!,rng);if(!options)return false;
    const next=createItemInstance(target,options,randomUUID());
    if(slot)p.equipment.set(slot,next);else{removeItem(p,targetId);grantItem(p,next,1);}
  } else if(item.heal) {
    if(p.hp>=p.maxHp)return false;p.hp=Math.min(p.maxHp,p.hp+item.heal);
  } else if(item.mana) {
    if(p.mp>=p.maxMp)return false;p.mp=Math.min(p.maxMp,p.mp+item.mana);
  } else if(item.useEffect==='town_portal') {
    if(p.mapId==='pueblo' || p.stunMs>0)return false;
    const spawn=getZone('pueblo').spawn;p.mapId='pueblo';p.x=p.targetX=spawn.x;p.z=p.targetZ=spawn.z;p.moving=false;p.targetId='';p.poisonMs=0;p.poisonAccumMs=0;
  } else if(item.useEffect==='antidote') {
    if(p.poisonMs<=0)return false;p.poisonMs=0;p.poisonDps=0;
  } else if(item.useEffect==='ale') {
    p.atkBuffMs=Math.max(p.atkBuffMs,15000);p.atkBuffMult=Math.max(p.atkBuffMult,1.05);
  } else if(item.learnSkill) {
    if(p.learnedTomes.includes(item.learnSkill))return false;
    try{getSkill(item.learnSkill);}catch{return false;}
    p.learnedTomes.push(item.learnSkill);
  } else return false;
  removeItem(p,id);return true;
}
