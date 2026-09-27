import { describe, it, expect } from 'vitest';
import type { CastleView } from '@aden/shared';
import { castleDialog } from './castleDialog.js';

const registration: CastleView = { phase: 'registration', bracket: 'menor', startsAt: 300_000, endsAt: 900_000, registered: 1, alive: 0, monsters: 0, ring: 0, collapseAt: 0, myPoints: null };
const next = { startsAt: Date.parse('2026-09-27T05:30:00Z'), bracket: 'mayor' as const };

describe('Chaos Castle keeper dialog', () => {
  it('offers registration to the right bracket with a seal', () => {
    const d = castleDialog(registration, next, 15, true, 120_000);
    expect(d).toMatchObject({ send: true, actionLabel: 'Inscribirme (entregar Sello del Caos)' });
    expect(d.text).toContain('03:00');
  });
  it('explains what is missing otherwise', () => {
    expect(castleDialog(registration, next, 15, false, 0)).toMatchObject({ send: false });
    expect(castleDialog(registration, next, 15, false, 0).text).toContain('Necesitás un Sello del Caos');
    expect(castleDialog(registration, next, 25, true, 0).text).toContain('nivel 10–19');
    expect(castleDialog(registration, next, 5, true, 0).text).toContain('nivel 10');
  });
  it('tells when the next castle opens when nothing is open', () => {
    const d = castleDialog(null, next, 25, true, 0);
    expect(d.send).toBe(false);
    expect(d.text).toContain('Castillo del Caos Mayor');
    expect(d.text).toContain('02:30');
  });
});
