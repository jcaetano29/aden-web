import { describe, it, expect } from 'vitest';
import {
  CATALOG_ITEMS, ITEM_SKILLS, QUESTS, SIDE_CHAINS, SMITH_STOCK, SHOP_STOCK, SPAWN_ZONES, WORLD_OBJECTS, getItem, getZone,
  CATALOG_DROP_CHANCE, LOOT_QUALITY_ODDS, RARITY_WEIGHT, catalogDropPool, lootSourceFor, rollCatalogDrop, rollItemOptions,
} from './index.js';

/** Azar fijo: primero decide si cae una pieza, después cuál. */
const fixed = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };
const SOURCES = [...SPAWN_ZONES.map(s => ({ mapId: s.mapId, lootId: s.templateId })), ...WORLD_OBJECTS.map(o => ({ mapId: o.mapId, lootId: o.lootId ?? '' }))];

describe('catalog loot by source and value', () => {
  it('drops more often and better from harder sources', () => {
    expect(CATALOG_DROP_CHANCE).toEqual({ normal: 0.25, elite: 0.4, boss: 0.9, chest: 0.5 });
    expect(LOOT_QUALITY_ODDS).toEqual({
      normal: { excellent: 0.04, upgrade: 0.2 }, chest: { excellent: 0.08, upgrade: 0.35 },
      elite: { excellent: 0.1, upgrade: 0.35 }, boss: { excellent: 0.25, upgrade: 0.8 },
    });
    expect(lootSourceFor('vharzul')).toBe('boss');
    expect(lootSourceFor('primal_smelter')).toBe('elite');
    expect(lootSourceFor('ember_imp')).toBe('normal');
    expect(lootSourceFor('chest_fragua')).toBe('chest');
    expect(lootSourceFor('breakable')).toBe('normal');
  });
  it('rolls whether a piece drops, then picks by value so gems and top tomes drop less', () => {
    expect(rollCatalogDrop('fragua', 'ember_imp', fixed(0.3, 0))).toBeUndefined();
    expect(rollCatalogDrop('fragua', 'ember_imp', fixed(0.1, 0))).toBe(catalogDropPool('fragua', 'ember_imp')[0]);
    expect(rollCatalogDrop('bosque', 'breakable', fixed(0, 0))).toBeUndefined();
    const pool = catalogDropPool('minas', 'halden');
    const weights = pool.map(id => RARITY_WEIGHT[getItem(id).rarity ?? 'common'] ?? 1), total = weights.reduce((a, b) => a + b, 0);
    expect(getItem('aden_prisma_del_caos').rarity).toBe('rare');
    expect(RARITY_WEIGHT.rare!).toBeLessThan(RARITY_WEIGHT.uncommon!);
    // Recorrer la ruleta entera: cada pieza sale en proporción a su peso.
    const hits: Record<string, number> = {};
    for (let k = 0; k < total; k++) { const id = rollCatalogDrop('minas', 'halden', fixed(0, (k + 0.5) / total))!; hits[id] = (hits[id] ?? 0) + 1; }
    pool.forEach((id, i) => expect(hits[id], id).toBe(weights[i]));
  });
  it('rolls better qualities with better odds without changing the default roll', () => {
    const sword = getItem('aden_filo_de_brasa_viva');
    expect(rollItemOptions(sword, fixed(0.2, 0, 0.9, 0.9)).quality).toBe('magic');
    expect(rollItemOptions(sword, fixed(0.2, 0, 0.9, 0.9), 2, LOOT_QUALITY_ODDS.boss).quality).toBe('excellent');
    expect(rollItemOptions(sword, fixed(0.9, 0.5, 0.5), 2, LOOT_QUALITY_ODDS.boss).level).toBeGreaterThan(0);
    expect(rollItemOptions(sword, fixed(0.9, 0.5, 0.5)).level).toBe(0);
  });
  it('shows gems and strong tomes as rare, following the damage of the skill they teach', () => {
    for (const item of Object.values(CATALOG_ITEMS)) {
      const rarity = getItem(item.id).rarity;
      if (item.category === 'joya') expect(rarity, item.id).toBe('rare');
      if (!item.learnSkill) continue;
      const skill = ITEM_SKILLS[item.learnSkill];
      const expected = (skill.factor ?? 0) >= 2.8 ? 'rare' : (skill.factor ?? 0) >= 2.2 || skill.type === 'dash' ? 'uncommon' : undefined;
      expect(rarity, item.id).toBe(expected);
    }
  });
  it('keeps every list short, on level for its map, without wings or pets, and jewels from strong sources', () => {
    for (const { mapId, lootId } of SOURCES) {
      const pool = catalogDropPool(mapId, lootId);
      expect(pool.length, `${mapId}/${lootId}`).toBeLessThanOrEqual(8);
      const zone = getZone(mapId), cap = zone.levelMax <= 10 ? 10 : zone.levelMax + 1;
      for (const id of pool) {
        const item = getItem(id);
        expect(item.requiredLevel ?? 1, `${id} en ${mapId}`).toBeLessThanOrEqual(cap);
        expect(['alas', 'mascota']).not.toContain(item.category);
        if (item.category === 'joya') expect(['elite', 'boss', 'chest']).toContain(lootSourceFor(lootId));
      }
    }
    expect(catalogDropPool('pueblo', 'chest_pueblo')).toEqual([]);
    expect(catalogDropPool('trono', 'chest_trono')).toEqual([]);
    expect(catalogDropPool('bosque', 'skeleton_king')).toEqual([]);
    expect(catalogDropPool('bosque', 'umbra_alpha')).not.toEqual(catalogDropPool('bosque', 'skeleton_minion'));
  });
  it('makes every catalog piece up to level 25 obtainable, except pets kept for events', () => {
    const base = (id: string) => getItem(id).baseId ?? id;
    const sources = new Set<string>([
      ...SOURCES.flatMap(s => catalogDropPool(s.mapId, s.lootId)),
      ...Object.values(QUESTS).flatMap(q => [q.rewardItemId, ...Object.values(q.rewardByClass ?? {})]).filter((id): id is string => !!id).map(base),
      ...SIDE_CHAINS.flatMap(c => c.steps.map(s => s.rewardItemId)).filter((id): id is string => !!id),
      ...SMITH_STOCK, ...SHOP_STOCK,
    ]);
    const missing = Object.values(CATALOG_ITEMS).filter(i => (i.requiredLevel ?? 1) <= 25 && i.category !== 'mascota' && !sources.has(i.id)).map(i => i.id);
    expect(missing).toEqual([]);
  });
});
