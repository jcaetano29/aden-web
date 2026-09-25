import { describe, it, expect } from 'vitest';
import { mpRegenPerSecond, MP_REGEN_IN_COMBAT_PCT, MP_REGEN_OUT_OF_COMBAT_PCT, COMBAT_REGEN_DELAY_MS } from './regen.js';

describe('mana regeneration', () => {
  it('refills out of combat in under 20 s', () => {
    for (const maxMp of [60, 150, 300, 600]) expect(maxMp / mpRegenPerSecond(maxMp, COMBAT_REGEN_DELAY_MS, 0)).toBeLessThan(20);
  });
  it('is slower in combat and adds item effects on top', () => {
    expect(MP_REGEN_IN_COMBAT_PCT).toBeLessThan(MP_REGEN_OUT_OF_COMBAT_PCT);
    expect(mpRegenPerSecond(300, 0, 0)).toBeLessThan(mpRegenPerSecond(300, COMBAT_REGEN_DELAY_MS, 0));
    expect(mpRegenPerSecond(300, 0, 0.01)).toBeCloseTo(mpRegenPerSecond(300, 0, 0) + 3);
    expect(mpRegenPerSecond(10, 0, 0)).toBeGreaterThanOrEqual(1);
  });
});
