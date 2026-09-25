import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BalanceSimulator, balancedAttributes, seededRandom } from './BalanceSimulator.js';
import { baselineScenarios } from './scenarios.js';

describe('BalanceSimulator', () => {
  let sim: BalanceSimulator;
  beforeAll(async () => { sim = await BalanceSimulator.start(2611); });
  afterAll(async () => { await sim.stop(); });

  it('splits attribute points evenly with the remainder in vitality', () => {
    expect(balancedAttributes(10)).toEqual({ str: 6, agi: 6, ene: 6, vit: 9 });
  });
  it('is deterministic for the same seed', () => {
    const a = seededRandom(7), b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const raider = baselineScenarios('knight').find(s => s.templateId === 'veil_raider')!;
    expect(sim.fight(raider, 'attentive', 3)).toEqual(sim.fight(raider, 'attentive', 3));
  });
  it('lets an on-level knight beat a regional normal enemy', () => {
    const raider = baselineScenarios('knight').find(s => s.templateId === 'veil_raider')!;
    const r = sim.fight(raider, 'attentive');
    expect(r.outcome).toBe('kill');
    expect(r.seconds).toBeGreaterThan(0);
    expect(r.enemyLevel).toBe(10);
  });
  it('keeps a far lower level character from beating a boss', () => {
    const prior = baselineScenarios('knight').find(s => s.templateId === 'memory_prior')!;
    const r = sim.fight({ ...prior, profile: { ...prior.profile, level: 8 } }, 'stationary', 1, 30);
    expect(r.outcome).not.toBe('kill');
  });
});
