import { describe, expect, it } from 'vitest';
import { addPoison, tickPoisons, type PoisonEffect } from './PoisonSystem.js';

describe('independent poisons', () => {
  it('refreshes only its caster without losing either partial tick', () => {
    const effects = new Map<string, PoisonEffect>(), hits: string[] = [];
    const tick = (effect: PoisonEffect) => { hits.push(effect.attackerId); return true; };
    addPoison(effects, 'a', 25, 14, 1000);
    tickPoisons(effects, 300, () => true, tick);
    addPoison(effects, 'b', 25, 14, 1000);
    addPoison(effects, 'a', 25, 14, 1000);
    tickPoisons(effects, 200, () => true, tick);
    expect(hits).toEqual(['a']);
    tickPoisons(effects, 300, () => true, tick);
    expect(hits).toEqual(['a', 'b']);
  });

  it('removes an invalid caster without cancelling a valid poison', () => {
    const effects = new Map<string, PoisonEffect>(), hits: string[] = [];
    for (const id of ['a', 'b']) addPoison(effects, id, 25, 14, 1000);
    const remaining = tickPoisons(effects, 500, e => e.attackerId === 'b', e => { hits.push(e.attackerId); return true; });
    expect(hits).toEqual(['b']); expect(remaining).toBe(500); expect(effects.has('a')).toBe(false);
  });

  it('limits delayed ticks to the duration and expires every effect', () => {
    const effects = new Map<string, PoisonEffect>(); let hits = 0;
    addPoison(effects, 'a', 25, 14, 1000);
    expect(tickPoisons(effects, 10000, () => true, () => { hits++; return true; })).toBe(0);
    expect(hits).toBe(2); expect(effects.size).toBe(0);
  });

  it('stops at the lethal tick without giving a second kill to another caster', () => {
    const effects = new Map<string, PoisonEffect>(), hits: string[] = [];
    for (const id of ['a', 'b']) addPoison(effects, id, 25, 14, 1000);
    tickPoisons(effects, 1000, () => true, e => { hits.push(e.attackerId); return false; });
    expect(hits).toEqual(['a']); expect(effects.size).toBe(0);
  });
});
