import { describe, it, expect } from 'vitest';
import { INVADERS, INVASION_SPOTS, INVASION_DURATION_MS, nextDailyInvasion, nextMinorInvasion, inInvasionArea, invasionProtected, getZone, getItem, getTemplate } from './index.js';

const H = 3_600_000;
describe('invasion rules', () => {
  it('schedules the daily invasion at 21:00 Argentina (00:00 UTC)', () => {
    expect(new Date(nextDailyInvasion(Date.UTC(2026, 8, 26, 12))).toISOString()).toBe('2026-09-27T00:00:00.000Z');
    expect(new Date(nextDailyInvasion(Date.UTC(2026, 8, 27, 0, 0, 1))).toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });
  it('places minor invasions 2–4 h later and away from the daily one', () => {
    const from = Date.UTC(2026, 8, 26, 12);
    expect(nextMinorInvasion(from, () => 0)).toBe(from + 2 * H);
    expect(nextMinorInvasion(from, () => 0.999999)).toBeLessThanOrEqual(from + 4 * H);
    const daily = nextDailyInvasion(from);
    // Caería 12 minutos antes de la gran invasión: se corre a media hora después de su fin.
    expect(nextMinorInvasion(daily - 2.2 * H, () => 0)).toBe(daily + INVASION_DURATION_MS + 0.5 * H);
  });
  it('defines four invaders on real templates, maps and catalog loot', () => {
    expect(Object.values(INVADERS).filter(i => i.kind === 'daily').map(i => i.id)).toEqual(['crimson_dragon']);
    for (const inv of Object.values(INVADERS)) {
      expect(getTemplate(inv.templateId).rank).toBe('boss');
      for (const m of inv.maps) { expect(getZone(m)).toBeTruthy(); expect(INVASION_SPOTS[m], m).toBeDefined(); }
      for (const id of inv.uniqueLoot) expect(['alas', 'mascota', 'joya']).toContain(getItem(id).category);
    }
  });
  it('knows who is inside the active area and protects low levels', () => {
    const ev = { phase: 'active', mapId: 'pueblo', x: 0, z: -24, radius: 30 };
    expect(inInvasionArea(ev, 'pueblo', 10, -20)).toBe(true);
    expect(inInvasionArea(ev, 'pueblo', 0, 14)).toBe(false);
    expect(inInvasionArea(ev, 'bosque', 0, -24)).toBe(false);
    expect(inInvasionArea({ ...ev, phase: 'announced' }, 'pueblo', 0, -24)).toBe(false);
    expect(invasionProtected(9)).toBe(true);
    expect(invasionProtected(10)).toBe(false);
  });
});
