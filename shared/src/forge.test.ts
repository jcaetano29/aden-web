import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { FORGE_LAVA, FORGE_ANVILS, FORGE_ARENA, FORGE_QUEST_ORDER, FORGE_COMPLETE } from './forge.js';
import { MINES_COMPLETE } from './mines.js';
import { getQuest } from './quests.js';
import { chapterAfter, mapGate, nextQuestId } from './chapters.js';
import { getNpc } from './npcs.js';
import { getWorldObject } from './worldobjects.js';
import { getItem } from './items.js';
import { questReward } from './adventure.js';
import { expToNextLevel } from './progression.js';
import { getSideChain } from './sideChains.js';
import { encounterCoolFor } from './encounters.js';
import { learnedSkillIds } from './classes.js';

const FORGE_MOBS = ['ember_imp', 'young_drake', 'forge_construct', 'primal_smelter', 'vharzul', 'magma_wyrm'];

describe('Fragua de los Primeros: mapa y enemigos', () => {
  it('opens a level 20 map that does not overlap others', () => {
    const zone = getZone('fragua');
    expect(canEnterZone(zone, 19)).toBe(false); expect(canEnterZone(zone, 20)).toBe(true);
    for (const other of ZONES.filter(z => z.id !== 'fragua')) {
      const a = zone.bounds, b = other.bounds;
      expect(a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ).toBe(true);
    }
  });
  it('defines every enemy with a fixed level, stats, EXP and loot', () => {
    for (const id of FORGE_MOBS) { expect(MOB_TEMPLATES[id], id).toBeDefined(); expect(getMobCombat(id).maxHp).toBeGreaterThan(0); expect(getMobExp(id)).toBeGreaterThan(0); }
    expect(FORGE_MOBS.map(id => MOB_TEMPLATES[id].level)).toEqual([21, 22, 23, 24, 25, 30]);
    expect(MOB_TEMPLATES.vharzul).toMatchObject({ rank: 'boss', boss: true });
    expect(getMobCombat('forged_guardian').maxHp).toBeGreaterThan(0);
  });
  it('places spawns, anvils and the arena on reachable ground and keeps lava solid', () => {
    const zone = getZone('fragua');
    for (const s of SPAWN_ZONES.filter(s => s.mapId === 'fragua')) {
      const at = { x: s.centerX, z: s.centerZ };
      expect(isWalkable('fragua', at), s.id).toBe(true);
      expect(findPath('fragua', zone.spawn, at).length, s.id).toBeGreaterThan(0);
    }
    expect(isWalkable('fragua', FORGE_ARENA)).toBe(true);
    for (const lava of FORGE_LAVA) expect(isWalkable('fragua', lava)).toBe(false);
    expect(FORGE_ANVILS).toHaveLength(3);
  });
  it('gives Vharzul a breath cone, embers, an anvil-interruptible channel and anvil reinforcements', () => {
    const v = getEncounter('vharzul')!;
    expect(v.requiresQuest).toBe('f_vharzul');
    expect(v.patterns.map(p => p.shape)).toEqual(['cone', 'circle']);
    const channel = v.belowHalf!.patterns!.find(p => p.channel)!;
    expect(channel.interruptObjects).toEqual(FORGE_ANVILS);
    expect(v.summons).toEqual([{ templateId: 'forged_guardian', everyMs: 20000, fromObjects: FORGE_ANVILS, maxAlive: 1 }]);
  });
});

describe('Fragua de los Primeros: capítulo', () => {
  it('starts from the Mines ending through Brenna at level 20 and gates the map', () => {
    expect(chapterAfter(MINES_COMPLETE)).toMatchObject({ id: 'forge', start: { npcId: 'brenna', minLevel: 20 } });
    expect(mapGate('fragua')!.from).toBe('f_caldera');
    expect(nextQuestId(FORGE_QUEST_ORDER[FORGE_QUEST_ORDER.length - 1])).toBe(FORGE_COMPLETE);
  });
  it('delivers to Ysolde, except the dragon, which Dorne receives in Aden', () => {
    for (const id of FORGE_QUEST_ORDER) {
      const q = getQuest(id);
      expect(q.mapId).toBe('fragua');
      expect(q.returnNpcId).toBe(id === 'f_vharzul' ? 'smith' : 'ysolde');
      if (q.objective === 'interact') expect(findPath('fragua', getZone('fragua').spawn, getWorldObject(q.targetId!)).length).toBeGreaterThan(0);
      if (q.objective === 'kill') expect(MOB_TEMPLATES[q.mobTemplateId]).toBeDefined();
    }
    for (const id of ['ysolde', 'halden_npc']) expect(findPath('fragua', getZone('fragua').spawn, getNpc(id)).length).toBeGreaterThan(0);
  });
  it('learns the level 25 skill on the anvils turn-in, before Vharzul, with usable rewards', () => {
    let level = 21, xp = 219;
    const gates: Record<string, number> = { f_imps: 21, f_drakes: 22, f_constructs: 23, f_smelter: 24, f_vharzul: 25 };
    for (const id of FORGE_QUEST_ORDER) {
      const q = getQuest(id);
      if (gates[id]) expect(level, id).toBeGreaterThanOrEqual(gates[id]);
      if (id === 'f_anvil_3') expect(level).toBe(24);
      if (q.objective === 'kill') xp += getMobExp(q.mobTemplateId) * q.amount;
      xp += q.rewardExp;
      while (xp >= expToNextLevel(level)) { xp -= expToNextLevel(level); level++; }
      for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) {
        const reward = questReward(q, cls); if (!reward) continue;
        const item = getItem(reward);
        expect(item.requiredLevel ?? 1, `${id} ${cls}`).toBeLessThanOrEqual(level);
        if (item.classes) expect(item.classes).toContain(cls);
      }
      if (id === 'f_anvil_3') for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) expect(learnedSkillIds(cls, level)).toHaveLength(5);
    }
    expect(level).toBe(26);
    expect(getItem('vharzul_heart')).toMatchObject({ rarity: 'legendary', slot: 'accessory', requiredLevel: 25 });
  });
  it("offers Halden's repeatable contracts and lets the anvils be cooled", () => {
    expect(getSideChain('halden')).toMatchObject({ npcId: 'halden_npc', kind: 'repeatable', minLevel: 20, announce: true });
    for (const id of ['forge_anvil_1', 'forge_anvil_2', 'forge_anvil_3']) expect(encounterCoolFor(id)?.templateId).toBe('vharzul');
    expect(encounterCoolFor('forge_rune_1')).toBeNull();
  });
});
