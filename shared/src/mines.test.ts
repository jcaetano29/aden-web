import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MAP_BOUNDS } from './constants.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { MINES_PITS, MINES_LIFT, MINES_GATE, MINES_QUEST_ORDER, MINES_COMPLETE } from './mines.js';
import { getQuest } from './quests.js';
import { chapterAfter, mapGate, nextQuestId } from './chapters.js';
import { MEMORY_COMPLETE } from './monastery.js';
import { getNpc } from './npcs.js';
import { getWorldObject } from './worldobjects.js';
import { getItem } from './items.js';
import { questReward } from './adventure.js';
import { expToNextLevel } from './progression.js';
import { getSideChain } from './sideChains.js';

const MINE_MOBS = ['mine_digger', 'mine_armor', 'cave_troll', 'mine_foreman', 'halden', 'iron_colossus'];

describe('Minas de Hierro Negro: mapa y enemigos', () => {
  it('opens a level 15 map inside the global plane without overlapping others', () => {
    const zone = getZone('minas');
    expect(canEnterZone(zone, 14)).toBe(false);
    expect(canEnterZone(zone, 15)).toBe(true);
    expect(zone.bounds.maxX).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
    for (const other of ZONES.filter(z => z.id !== 'minas')) {
      const a = zone.bounds, b = other.bounds;
      expect(a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ).toBe(true);
    }
  });
  it('defines every enemy with a fixed level, stats, EXP and loot', () => {
    for (const id of MINE_MOBS) {
      const t = MOB_TEMPLATES[id];
      expect(t, id).toBeDefined();
      expect(getMobCombat(id).maxHp).toBeGreaterThan(0);
      expect(getMobExp(id)).toBeGreaterThan(0);
    }
    expect([15, 16, 18, 19, 20, 24]).toEqual(MINE_MOBS.map(id => MOB_TEMPLATES[id].level));
    expect(MOB_TEMPLATES.halden).toMatchObject({ rank: 'boss', boss: true });
    expect(MOB_TEMPLATES.mine_foreman).toMatchObject({ rank: 'elite', miniBoss: true });
  });
  it('places every spawn on reachable ground from the arrival point', () => {
    const zone = getZone('minas');
    const spawns = SPAWN_ZONES.filter(s => s.mapId === 'minas');
    expect(spawns.map(s => s.templateId).sort()).toEqual(['cave_troll', 'cave_troll', 'halden', 'iron_colossus', 'mine_armor', 'mine_armor', 'mine_digger', 'mine_digger', 'mine_foreman']);
    for (const s of spawns) {
      const at = { x: s.centerX, z: s.centerZ };
      expect(isWalkable(zone.id, at), s.id).toBe(true);
      expect(findPath(zone.id, zone.spawn, at).length, s.id).toBeGreaterThan(0);
    }
    for (const place of [MINES_LIFT, { x: MINES_GATE.x, z: MINES_GATE.z + 6 }]) expect(isWalkable('minas', place)).toBe(true);
    for (const pit of MINES_PITS) expect(isWalkable('minas', pit)).toBe(false);
  });
  it('gives the foreman a frontal cone and Halden two patterns plus reinforcements', () => {
    expect(getEncounter('mine_foreman')!.patterns[0]).toMatchObject({ shape: 'cone', angleDeg: 80 });
    const halden = getEncounter('halden')!;
    expect(halden.requiresQuest).toBe('f_halden');
    expect(halden.patterns.map(p => p.shape)).toEqual(['cone', 'circle']);
    expect(halden.summons).toEqual([{ templateId: 'mine_armor', atHpPct: 0.5, count: 2, maxAlive: 2 }]);
  });
});

describe('Minas de Hierro Negro: capítulo', () => {
  it('starts from the Memory ending through Dorne at level 15 and gates the map', () => {
    const chapter = chapterAfter(MEMORY_COMPLETE)!;
    expect(chapter.id).toBe('mines');
    expect(chapter.start).toMatchObject({ npcId: 'smith', minLevel: 15 });
    expect(mapGate('minas')!.from).toBe('f_arrival');
    expect(nextQuestId(MINES_QUEST_ORDER[MINES_QUEST_ORDER.length - 1])).toBe(MINES_COMPLETE);
  });
  it('points every objective at real content on the map, delivered to Brenna', () => {
    for (const id of MINES_QUEST_ORDER) {
      const q = getQuest(id);
      expect(q.mapId).toBe('minas');
      expect(q.returnNpcId).toBe('brenna');
      expect(q.intro.length).toBeGreaterThan(10);
      if (q.objective === 'interact') {
        const o = getWorldObject(q.targetId!);
        expect(o.mapId).toBe('minas');
        expect(findPath('minas', getZone('minas').spawn, o).length).toBeGreaterThan(0);
      }
      if (q.objective === 'kill') expect(MOB_TEMPLATES[q.mobTemplateId]).toBeDefined();
    }
    expect(getQuest('f_mark_1').targetId).not.toBe(getQuest('f_mark_2').targetId);
    for (const id of ['brenna', 'tobias']) {
      const npc = getNpc(id);
      expect(npc.mapId).toBe('minas');
      expect(findPath('minas', getZone('minas').spawn, npc).length).toBeGreaterThan(0);
    }
  });
  it('reaches each fight at its level on the mandatory route and ends at 21 with usable rewards', () => {
    let level = 15, xp = 0;
    const gates: Record<string, number> = { f_trolls: 18, f_foreman: 19, f_halden: 20 };
    for (const id of MINES_QUEST_ORDER) {
      const q = getQuest(id);
      if (gates[id]) expect(level, id).toBeGreaterThanOrEqual(gates[id]);
      if (q.objective === 'kill') xp += getMobExp(q.mobTemplateId) * q.amount;
      xp += q.rewardExp;
      while (xp >= expToNextLevel(level)) { xp -= expToNextLevel(level); level++; }
      for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) {
        const reward = questReward(q, cls); if (!reward) continue;
        const item = getItem(reward);
        expect(item.requiredLevel ?? 1, `${id} ${cls}`).toBeLessThanOrEqual(level);
        if (item.classes) expect(item.classes).toContain(cls);
      }
    }
    expect(level).toBe(21);
  });
  it('runs Tobías errands on the map and pays with real items', () => {
    const chain = getSideChain('tobias')!;
    expect(chain).toMatchObject({ npcId: 'tobias', kind: 'sequence', minLevel: 15, announce: true });
    for (const step of chain.steps) {
      expect(getWorldObject(step.targetId).mapId).toBe('minas');
      if (step.rewardItemId) expect(getItem(step.rewardItemId).id).toBe(step.rewardItemId);
    }
    expect(getNpc('tobias').shop).toBe(true);
    expect(getNpc('boren').shop).toBe(true);
  });
});
