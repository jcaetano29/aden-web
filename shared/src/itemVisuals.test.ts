import { describe, it, expect } from 'vitest';
import { ITEM_TEMPLATES, getItem } from './items.js';
import { createItemInstance } from './itemOptions.js';
import { itemVisual, RARITY_VISUALS } from './itemVisuals.js';
import { RARITY_COLORS } from './equipment.js';

describe('item visual coverage', () => {
  it('covers every catalog and legacy item without a generic fallback', () => {
    for (const item of Object.values(ITEM_TEMPLATES)) {
      expect(itemVisual(item).family, item.id).toBeTruthy();
      expect(itemVisual(item).surface, item.id).toBeTruthy();
    }
  });
  it('keeps variant silhouette and uses resolved rarity, independently of upgrades', () => {
    const base = getItem('aden_punal_del_umbral');
    const normal = getItem(createItemInstance(base, {level: 9}, 'a'));
    const magic = getItem(createItemInstance(base, {quality: 'magic', luck:true}, 'b'));
    expect(itemVisual(normal).family).toBe(itemVisual(base).family);
    expect(itemVisual(normal).glow).toBe(itemVisual(base).glow);
    expect(itemVisual(magic).color).toBe(RARITY_COLORS.magic);
  });
  it('defines bounded glow for every existing rarity', () => {
    for (const rarity of Object.keys(RARITY_COLORS)) {
      const v = RARITY_VISUALS[rarity as keyof typeof RARITY_VISUALS];
      expect(v.glow).toBeGreaterThanOrEqual(0);
      expect(v.glow).toBeLessThan(.5);
    }
  });
  it('covers every allowed quality without changing base identity',()=>{
    for(const base of Object.values(ITEM_TEMPLATES)) {
      if(base.type!=='equipment')continue;
      for(const quality of base.allowedQualities??[]) {
        const options=quality==='normal'?{}:quality==='magic'?{quality,luck:true} as const:{quality,excellent:[0]} as const;
        const variant=getItem(createItemInstance(base,{...options,excellent:quality==='excellent'?[0]:[]},'coverage'));
        expect(itemVisual(variant).family,base.id).toBe(itemVisual(base).family);
      }
    }
  });
});
