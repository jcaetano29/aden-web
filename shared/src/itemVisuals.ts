import type { ItemTemplate } from './items.js';
import { RARITY_COLORS, type Rarity } from './equipment.js';

export type ItemFamily = 'sword'|'axe'|'mace'|'spear'|'staff'|'bow'|'crossbow'|'shield'|'helmet'|'armor'|'gloves'|'pants'|'boots'|'wings'|'ring'|'pendant'|'crown'|'pet'|'mount'|'potion'|'scroll'|'gem'|'arrows'|'bolts'|'coins'|'bone'|'relic'|'core';
export const RARITY_VISUALS: Record<Rarity, {color:string; glow:number; halo:number}> = {
  common:{color:RARITY_COLORS.common,glow:.025,halo:.08},
  uncommon:{color:RARITY_COLORS.uncommon,glow:.07,halo:.13},
  rare:{color:RARITY_COLORS.rare,glow:.12,halo:.18},
  epic:{color:RARITY_COLORS.epic,glow:.2,halo:.23},
  legendary:{color:RARITY_COLORS.legendary,glow:.3,halo:.3},
  magic:{color:RARITY_COLORS.magic,glow:.12,halo:.18},
  excellent:{color:RARITY_COLORS.excellent,glow:.22,halo:.25},
};
const weapons:Record<string,ItemFamily>={espada:'sword',hacha:'axe',maza:'mace',lanza:'spear',baston:'staff',arco:'bow',ballesta:'crossbow'};
const legacy:Record<string,ItemFamily>={gold:'coins',bone:'bone',health_potion:'potion',greater_potion:'potion',ancient_relic:'relic',ember_core:'core',worn_sword:'sword',iron_sword:'sword',bone_blade:'sword',crown_blade:'sword',ember_axe:'axe',leather_vest:'armor',iron_mail:'armor',crypt_plate:'armor',ash_guard:'armor',nihil_aegis:'armor',hunter_charm:'pendant',crypt_ring:'ring',ember_band:'ring',skull_crown:'crown'};
export function itemVisual(item:ItemTemplate) {
  let family:ItemFamily|undefined=legacy[item.baseId??item.id];
  if(!family) {
    if(item.category==='arma') family=weapons[item.subcategory??''];
    else if(item.slot==='pet') family=item.petEffect==='mount'?'mount':'pet';
    else if(item.slot==='accessory') family='pendant';
    else if(item.slot && item.slot!=='weapon') family=item.slot as ItemFamily;
    else if(item.category==='joya') family='gem';
    else if(item.category==='municion') family=item.ammo==='bolt'?'bolts':'arrows';
    else if(item.learnSkill || item.category==='pergamino' || item.subcategory?.includes('pergamino') || item.useEffect==='town_portal') family='scroll';
    else if(item.category==='consumible') family='potion';
  }
  if(!family) throw new Error(`Sin representación: ${item.id}`);
  const identity=`${item.baseId??item.id} ${item.subcategory??''}`;
  const surface = /bone|hueso/.test(identity)?'bone':/leather|cuero/.test(identity)?'leather':/silk|pad|wind|spirit|sphinx|grand_soul/.test(identity)?'cloth': ['bow','crossbow','staff','arrows','bolts'].includes(family)?'wood':['scroll','wings'].includes(family)?'cloth':['pet','mount'].includes(family)?'leather':'metal';
  const tint=surface==='bone'?0xd9ceb0:surface==='leather'?0x896047:surface==='cloth'?0x667f9e:surface==='wood'?0x906242:0xaeb7bd;
  const accent=item.heal?0xc83743:item.mana?0x387cc9:family==='coins'?0xe1ad40:family==='core'?0xe37431:0x65aaa0;
  return {family,surface,tint,accent,...RARITY_VISUALS[item.rarity??'common']};
}
