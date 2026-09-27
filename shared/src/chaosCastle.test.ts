import { describe, it, expect } from 'vitest';
import { nextCastle, castleBracket, ringAt, fallsAt, CHAOS_SEAL_CHANCE, CASTLE_BRACKETS, CASTLE_CENTER, getZone, getItem, getNpc, getTemplate, ZONES } from './index.js';

describe('Chaos Castle rules', () => {
  it('opens at half past even Argentina hours, alternating brackets', () => {
    const at = (iso: string) => nextCastle(Date.parse(iso));
    expect(at('2026-09-27T03:00:00Z')).toEqual({ startsAt: Date.parse('2026-09-27T03:30:00Z'), bracket: 'menor' });   // 00:30 Argentina
    expect(at('2026-09-27T03:30:00Z')).toEqual({ startsAt: Date.parse('2026-09-27T05:30:00Z'), bracket: 'mayor' });   // 02:30
    expect(at('2026-09-27T23:00:00Z').bracket).toBe('menor');                                                        // 20:30
    expect(at('2026-09-28T00:00:00Z')).toEqual({ startsAt: Date.parse('2026-09-28T01:30:00Z'), bracket: 'mayor' });   // 22:30
  });
  it('splits levels into two brackets', () => {
    expect(castleBracket(9)).toBeNull();
    expect(castleBracket(10)).toBe('menor'); expect(castleBracket(19)).toBe('menor');
    expect(castleBracket(20)).toBe('mayor'); expect(castleBracket(40)).toBe('mayor');
  });
  it('knows the rings and who falls', () => {
    const { x, z } = CASTLE_CENTER;
    expect(ringAt(x, z)).toBe(3); expect(ringAt(x + 15, z - 5)).toBe(2); expect(ringAt(x - 25, z + 29)).toBe(1); expect(ringAt(x + 31, z)).toBe(0);
    expect(fallsAt(x + 25, z, 0)).toBe(false); expect(fallsAt(x + 25, z, 1)).toBe(true);
    expect(fallsAt(x + 15, z, 1)).toBe(false); expect(fallsAt(x + 15, z, 2)).toBe(true);
    expect(fallsAt(x, z, 2)).toBe(false); expect(fallsAt(x + 31, z, 0)).toBe(true);
  });
  it('defines the seal, the keeper, the guards and a hidden arena', () => {
    expect(CHAOS_SEAL_CHANCE).toEqual({ normal: 0.005, elite: 0.03, chest: 0.03, boss: 0.1 });
    expect(getItem('chaos_seal')).toMatchObject({ name: 'Sello del Caos', stackable: true, rarity: 'rare', requiredLevel: 10 });
    expect(getNpc('chaos_keeper').mapId).toBe('pueblo');
    expect(getTemplate(CASTLE_BRACKETS.menor.guard).level).toBe(15);
    expect(getTemplate(CASTLE_BRACKETS.mayor.guard).level).toBe(25);
    expect(getZone('castillo').hidden).toBe(true);
    expect(ZONES.filter(z => z.hidden).map(z => z.id)).toEqual(['castillo']);
  });
});
