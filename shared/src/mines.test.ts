import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MAP_BOUNDS } from './constants.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { MINES_PITS, MINES_LIFT, MINES_GATE } from './mines.js';

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
