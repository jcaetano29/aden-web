import { getItem, type ItemTemplate } from './items.js';
import { EQUIP_SLOTS, type EquipSlot, type StatTotals } from './equipment.js';
import { emptyEffects, optionEffects, type EquipmentEffects } from './itemOptions.js';

export type Loadout = Partial<Record<EquipSlot,string>>;
export function equippedItems(equipped: Loadout): ItemTemplate[] {
  const out: ItemTemplate[] = [];
  for (const slot of EQUIP_SLOTS) {
    const id=equipped[slot]; if(!id) continue;
    try { const item=getItem(id); if(item.type==='equipment' && item.slot===slot) out.push(item); } catch { /* invalid saved entry */ }
  }
  return out;
}
export function canEquipItem(id:string, className:string, level:number, equipped:Loadout):boolean {
  try {
    const item=getItem(id);
    if(item.type!=='equipment' || !item.slot || !EQUIP_SLOTS.includes(item.slot)) return false;
    if(item.classes && !item.classes.includes(className)) return false;
    if(level < (item.requiredLevel ?? 1)) return false;
    if(item.hands==='2H' && equipped.shield) return false;
    if(item.slot==='shield' && equipped.weapon && getItem(equipped.weapon).hands==='2H') return false;
    return true;
  } catch { return false; }
}
export function setBonuses(equipped:Loadout):StatTotals {
  const total:StatTotals={pAtk:0,pDef:0,maxHp:0,maxMp:0};
  const sets=new Map<string,ItemTemplate[]>();
  for(const item of equippedItems(equipped)) if(item.category==='armadura' && item.setId) {
    const parts=sets.get(item.setId)??[]; parts.push(item); sets.set(item.setId,parts);
  }
  for(const parts of sets.values()) {
    const n=parts.length;
    total.pDef+=n>=5?8:n>=3?4:n>=2?2:0;
    if(n>=3) total.maxHp+=15;
    if(n>=5) { total.pAtk+=3; total.maxHp+=20; if(parts.every(p=>p.options?.luck)) total.pDef+=3; }
  }
  return total;
}
export function loadoutEffects(equipped:Loadout):EquipmentEffects {
  const total=emptyEffects();
  for(const item of equippedItems(equipped)) {
    const effects=optionEffects(item);
    for(const key of Object.keys(total) as (keyof EquipmentEffects)[]) total[key]+=effects[key];
  }
  total.dodge=Math.min(.5,total.dodge); total.reduction=Math.min(.6,total.reduction);
  total.reflect=Math.min(.3,total.reflect); total.critChance=Math.min(.5,total.critChance);
  total.excellentChance=Math.min(.5,total.excellentChance); total.attackSpeed=Math.min(.5,total.attackSpeed);
  return total;
}
export function weaponRange(equipped:Loadout):number {
  if(!equipped.weapon) return 2.5;
  try { const item=getItem(equipped.weapon); return item.ammo ? 10 : 2.5; } catch { return 2.5; }
}
