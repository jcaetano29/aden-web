import { describe, it, expect } from 'vitest';
import { TRAVEL_COMBAT_LOCK_MS, travelLockRemainingMs, travelLockText } from './travel.js';

describe('travel lock', () => {
  it('requires five seconds without combat', () => {
    expect(TRAVEL_COMBAT_LOCK_MS).toBe(5000);
    expect(travelLockRemainingMs(0)).toBe(5000);
    expect(travelLockRemainingMs(3200)).toBe(1800);
    expect(travelLockRemainingMs(5000)).toBe(0);
    expect(travelLockText(1800)).toBe('Estás en combate: podés viajar en 2 s.');
  });
});
