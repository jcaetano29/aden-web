import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BalanceSimulator, balancedAttributes, seededRandom } from './BalanceSimulator.js';
import { baselineScenarios, manaProfile, minesScenarios } from './scenarios.js';
import { CLASS_ORDER } from '@aden/shared';

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
  it('drains the full mage rotation in 40–70 s of combat but sustains the primary skill', () => {
    const max = sim.manaRun(manaProfile(), 'max');
    expect(max).not.toBeNull();
    expect(max!).toBeGreaterThanOrEqual(40);
    expect(max!).toBeLessThanOrEqual(70);
    expect(sim.manaRun(manaProfile(), 'primary')).toBeNull();
  });
  it('calibrates the Mines: normals 5–9 s, the foreman 15–30 s and Halden 60–100 s (median, attentive)', () => {
    const median = (name: string) => {
      const t = CLASS_ORDER.map(cls => sim.fight(minesScenarios(cls).find(s => s.name === name)!, 'attentive'))
        .map(r => r.outcome === 'kill' ? r.seconds : Infinity).sort((a, b) => a - b);
      return t[Math.floor(t.length / 2)];
    };
    for (const name of ['Excavador', 'Armadura', 'Troll']) { const m = median(name); expect(m, name).toBeGreaterThanOrEqual(5); expect(m, name).toBeLessThanOrEqual(9); }
    const foreman = median('Capataz'); expect(foreman).toBeGreaterThanOrEqual(15); expect(foreman).toBeLessThanOrEqual(30);
    const halden = median('Halden'); expect(halden).toBeGreaterThanOrEqual(60); expect(halden).toBeLessThanOrEqual(100);
  });
  it('lets an attentive knight beat Halden but not a stationary one', () => {
    const halden = minesScenarios('knight').find(s => s.name === 'Halden')!;
    expect(sim.fight(halden, 'attentive').outcome).toBe('kill');
    expect(sim.fight(halden, 'stationary').outcome).not.toBe('kill');
  });
  it('keeps a far lower level character from beating a boss', () => {
    const prior = baselineScenarios('knight').find(s => s.templateId === 'memory_prior')!;
    const r = sim.fight({ ...prior, profile: { ...prior.profile, level: 8 } }, 'stationary', 1, 30);
    expect(r.outcome).not.toBe('kill');
  });
});
