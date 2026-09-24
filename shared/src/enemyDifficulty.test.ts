import { describe, it, expect } from 'vitest';
import { pvePower, enemyThreat } from './enemyDifficulty.js';
import { MOB_TEMPLATES } from './mobs.js';

describe('fixed enemy levels', () => {
  it('lets progression unlock a fixed level-12 enemy without scaling it', () => {
    expect(pvePower(5, 12).outgoing).toBe(0);
    expect(pvePower(7, 12).outgoing).toBeGreaterThan(0);
    expect(pvePower(8, 12).outgoing).toBeLessThan(pvePower(10, 12).outgoing);
    expect(pvePower(12, 12)).toEqual({ outgoing: 1, incoming: 1 });
    expect(enemyThreat(15, 12).label).toBe('Inferior');
  });
  it('warns at the exact impossible boundary and never rewards being underleveled', () => {
    expect(enemyThreat(1, 7).label).toBe('Fuera de tu alcance');
    expect(enemyThreat(2, 7).label).toBe('Peligroso');
    for (let level=1;level<15;level++) {
      expect(pvePower(level, 12).outgoing).toBeLessThanOrEqual(pvePower(level+1,12).outgoing);
      expect(pvePower(level, 12).incoming).toBeGreaterThanOrEqual(pvePower(level+1,12).incoming);
    }
  });
  it('assigns every template a level and rank, including threats within the forest', () => {
    for (const mob of Object.values(MOB_TEMPLATES)) {
      expect(Number.isInteger(mob.level)).toBe(true);
      expect(mob.level).toBeGreaterThan(0);
      expect(['normal','elite','boss']).toContain(mob.rank);
    }
    expect(MOB_TEMPLATES.skeleton_minion.level).toBe(1);
    expect(MOB_TEMPLATES.forest_troll.level).toBe(7);
    expect(MOB_TEMPLATES.skeleton_king.level).toBe(10);
  });
});
