import { describe, it, expect } from 'vitest';
import { PlayerState } from './PlayerState.js';

const fieldCount = (cls: unknown) => Object.keys((cls as { _definition: { schema: object } })._definition.schema).length;

describe('PlayerState schema budget', () => {
  it('leaves headroom under the 64-field Colyseus limit', () => {
    expect(fieldCount(PlayerState)).toBeLessThanOrEqual(45);
  });
  it('groups attributes and retention into sub-states', () => {
    const p = new PlayerState();
    expect(p.attributes.str).toBe(0);
    expect(p.attributes.statPoints).toBe(0);
    expect(p.retention.loginStreak).toBe(0);
    expect(p.retention.dailyDone).toBe(false);
    expect('str' in p).toBe(false);
    expect('loginStreak' in p).toBe(false);
    expect(p.sideChains.size).toBe(0);
    expect('bountyId' in p).toBe(false);
  });
});
