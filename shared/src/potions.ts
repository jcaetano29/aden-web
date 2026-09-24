import { getItem } from './items.js';
export const POTION_COOLDOWN_MS=8000;
export type PotionResource='hp'|'mp';
export function potionResource(id:string):PotionResource|undefined {
  try { const item=getItem(id); return item.heal ? 'hp' : item.mana ? 'mp' : undefined; } catch { return undefined; }
}
/** Choose the smallest adequate potion, or the strongest if none covers the missing HP. */
export function chooseHealthPotion(inventory:ReadonlyArray<{itemTemplateId:string;qty:number}>,missingHp:number,level:number,className:string):string|undefined {
  if(missingHp<=0)return undefined;
  const candidates=inventory.flatMap(entry=>{
    if(entry.qty<=0)return [];
    try {
      const item=getItem(entry.itemTemplateId);
      return item.heal && level>=(item.requiredLevel??1) && (!item.classes || item.classes.includes(className)) ? [{id:entry.itemTemplateId,heal:item.heal}] : [];
    } catch { return []; }
  }).sort((a,b)=>a.heal-b.heal);
  return (candidates.find(p=>p.heal>=missingHp) ?? candidates[candidates.length-1])?.id;
}
