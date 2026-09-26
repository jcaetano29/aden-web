import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { FORGE_LAVA, FORGE_ANVILS, FORGE_ARENA } from './forge.js';

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
    expect(v.summons).toEqual([{ templateId: 'forged_guardian', everyMs: 15000, fromObjects: FORGE_ANVILS, maxAlive: 1 }]);
  });
});
