import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BalanceSimulator, balancedAttributes, seededRandom } from './BalanceSimulator.js';
import { baselineScenarios, forgeScenarios, manaProfile, minesScenarios, type ScenarioSet } from './scenarios.js';
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
  /** Mediana del tiempo de victoria de las cinco clases atentas (Infinity si no gana). */
  const median = (set: ScenarioSet, name: string) => {
    const t = CLASS_ORDER.map(cls => sim.fight(set(cls).find(s => s.name === name)!, 'attentive'))
      .map(r => r.outcome === 'kill' ? r.seconds : Infinity).sort((a, b) => a - b);
    return t[Math.floor(t.length / 2)];
  };
  const within = (m: number, min: number, max: number, name: string) => { expect(m, name).toBeGreaterThanOrEqual(min); expect(m, name).toBeLessThanOrEqual(max); };
  it('calibrates the Mines: normals 5–9 s, the foreman 15–30 s and Halden 60–100 s (median, attentive)', () => {
    for (const name of ['Excavador', 'Armadura', 'Troll']) within(median(minesScenarios, name), 5, 9, name);
    within(median(minesScenarios, 'Capataz'), 15, 30, 'Capataz');
    within(median(minesScenarios, 'Halden'), 60, 100, 'Halden');
  });
  it('lets an attentive knight beat Halden but not a stationary one', () => {
    const halden = minesScenarios('knight').find(s => s.name === 'Halden')!;
    expect(sim.fight(halden, 'attentive').outcome).toBe('kill');
    expect(sim.fight(halden, 'stationary').outcome).not.toBe('kill');
  });
  it('calibrates the Forge: normals 5–9 s, the smelter 15–30 s and Vharzul 60–100 s (median, attentive)', () => {
    for (const name of ['Imp', 'Draco', 'Guardián']) within(median(forgeScenarios, name), 5, 9, name);
    within(median(forgeScenarios, 'Fundidor'), 15, 30, 'Fundidor');
    within(median(forgeScenarios, 'Vharzul'), 60, 100, 'Vharzul');
  });
  it('lets an attentive knight beat Vharzul but not a stationary one', () => {
    const vharzul = forgeScenarios('knight').find(s => s.name === 'Vharzul')!;
    expect(sim.fight(vharzul, 'attentive').outcome).toBe('kill');
    expect(sim.fight(vharzul, 'stationary').outcome).not.toBe('kill');
  });
  it('keeps a far lower level character from beating a boss', () => {
    const prior = baselineScenarios('knight').find(s => s.templateId === 'memory_prior')!;
    const r = sim.fight({ ...prior, profile: { ...prior.profile, level: 8 } }, 'stationary', 1, 30);
    expect(r.outcome).not.toBe('kill');
  });
});
