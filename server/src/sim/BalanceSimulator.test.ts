import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BalanceSimulator, balancedAttributes, seededRandom } from './BalanceSimulator.js';
import { baselineScenarios, castleScenarios, forgeScenarios, invasionScenarios, manaProfile, minesScenarios, type ScenarioSet } from './scenarios.js';
import { CLASS_ORDER, getSkill } from '@aden/shared';
import type { GameRoom } from '../rooms/GameRoom.js';

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
  it('lets every class beat Halden and Vharzul within 1.5× the median time', () => {
    for (const [set, name] of [[minesScenarios, 'Halden'], [forgeScenarios, 'Vharzul']] as const) {
      const results = CLASS_ORDER.map(cls => sim.fight(set(cls).find(s => s.name === name)!, 'attentive'));
      const times = results.map(r => r.outcome === 'kill' ? r.seconds : Infinity).sort((a, b) => a - b);
      const limit = times[Math.floor(times.length / 2)] * 1.5;
      for (const r of results) {
        expect(r.outcome, `${r.className} vs ${name}`).toBe('kill');
        expect(r.seconds, `${r.className} vs ${name}`).toBeLessThanOrEqual(limit);
      }
    }
  });
  it('makes the Chaos Castle guards a 6–10 s fight for their bracket (median, attentive)', () => {
    for (const name of ['Guardia Menor', 'Guardia Mayor']) within(median(castleScenarios, name), 6, 10, name);
  });
  it('lets the intended group beat each invader in time and not even its strongest member alone', () => {
    for (const inv of invasionScenarios()) {
      const group = sim.fightGroup(inv.scenario, inv.group);
      expect(group.outcome, inv.name).toBe('kill');
      expect(group.seconds, inv.name).toBeGreaterThanOrEqual(inv.target[0]);
      expect(group.seconds, inv.name).toBeLessThanOrEqual(inv.target[1]);
      const solo = sim.fightGroup(inv.scenario, inv.group.filter(p => p.className === inv.soloClass));
      expect(solo.outcome, `${inv.name} solo ${inv.soloClass}`).not.toBe('kill');
    }
  }, 120_000);
  it('keeps a far lower level character from beating a boss', () => {
    const prior = baselineScenarios('knight').find(s => s.templateId === 'memory_prior')!;
    const r = sim.fight({ ...prior, profile: { ...prior.profile, level: 8 } }, 'stationary', 1, 30);
    expect(r.outcome).not.toBe('kill');
  });

  it('forms an actual party and clears it before the next solo simulation', () => {
    const inv = invasionScenarios()[0];
    let room!: GameRoom;
    const scenario = { ...inv.scenario, setup: (r: GameRoom) => { room = r; } };
    sim.fightGroup(scenario, inv.group, 1, 0);
    const players = [...room.state.players.values()];
    expect(players.every(p => p.loaded)).toBe(true);
    expect(room.state.parties.size).toBe(1);
    const party = room.state.parties.get(players[0].partyId)!;
    expect([...party.members]).toEqual(['sim_bot_0', 'sim_bot_1', 'sim_bot_2', 'sim_bot_3', 'sim_bot_4']);
    expect(players.every(p => p.partyId === players[0].partyId)).toBe(true);
    sim.fightGroup(scenario, [inv.group[0]], 1, 0);
    expect(room.state.parties.size).toBe(0);
    expect(room.state.players.get('sim_bot_0')!.partyId).toBe('');
  });

  it('heals the most injured party member without changing the enemy target and measures recovered health', () => {
    const inv = invasionScenarios()[0];
    const group = ['mage', 'knight', 'barbarian'].map(cls => inv.group.find(p => p.className === cls)!);
    let room!: GameRoom, before = 0;
    const scenario = { ...inv.scenario, setup: (r: GameRoom) => {
      room = r;
      const wounded = r.state.players.get('sim_bot_1')!;
      before = wounded.hp = Math.round(wounded.maxHp * .25);
      r.state.players.get('sim_bot_2')!.hp *= .5;
    } };
    const result = sim.fightGroup(scenario, group, 7, .05);
    const wounded = room.state.players.get('sim_bot_1')!;
    const mage = room.state.players.get('sim_bot_0')!;
    expect(wounded.hp).toBeGreaterThan(before);
    expect(result.support.healing).toBe(Math.round(mage.maxHp * getSkill('arcane_mend').healPct!));
    expect(result.support.heals).toBe(1);
    expect(mage.targetId).toBe('sim_target');
    expect(mage.skillCooldowns.get('arcane_mend')).toBeGreaterThan(0);
  });

  it('can disable cooperative decisions while keeping the same party and never credits self healing as support', () => {
    const inv = invasionScenarios()[0];
    const group = ['mage', 'knight'].map(cls => inv.group.find(p => p.className === cls)!);
    let room!: GameRoom;
    const scenario = { ...inv.scenario, setup: (r: GameRoom) => {
      room = r;
      r.state.players.get('sim_bot_0')!.hp *= .2;
      r.state.players.get('sim_bot_1')!.hp *= .1;
    } };
    const result = sim.fightGroup(scenario, group, 7, .05, { cooperation: false });
    expect(room.state.parties.size).toBe(1);
    expect(room.state.players.get('sim_bot_0')!.skillCooldowns.get('arcane_mend')).toBeGreaterThan(0);
    expect(result.support).toEqual({ heals: 0, healing: 0, protections: 0 });
    expect(result.potions).toBe(2);
  });

  it('protects a threatened companion without losing the offensive target', () => {
    const inv = invasionScenarios()[0];
    const group = ['knight', 'mage'].map(cls => inv.group.find(p => p.className === cls)!);
    let room!: GameRoom;
    const scenario = { ...inv.scenario, setup: (r: GameRoom) => {
      room = r;
      const threat = r.spawnMob('pressure', 'forged_guardian', inv.scenario.x, inv.scenario.z, inv.scenario.mapId);
      threat.aggroTargetId = 'sim_bot_1'; threat.aiState = 'chase';
    } };
    const result = sim.fightGroup(scenario, group, 1, .05);
    expect(room.state.players.get('sim_bot_1')!.cooperation.protectedBy).toBe('sim_bot_0');
    expect(room.state.players.get('sim_bot_0')!.targetId).toBe('sim_target');
    expect(result.support.protections).toBe(1);
  });

  it('limits the Crimson Dragon to two threshold waves even when all reinforcements remain alive', () => {
    const inv = invasionScenarios()[0];
    let room!: GameRoom;
    sim.fightGroup({ ...inv.scenario, setup: r => { room = r; } }, inv.group, 1, 0);
    const boss = room.state.mobs.get('sim_target')!;
    boss.aggroTargetId = 'sim_bot_0'; boss.aiState = 'chase'; boss.hazardCooldownMs = 1e9;
    for (const p of room.state.players.values()) { p.attackCooldownMs = 1e9; p.pDef = 100000; }
    const adds = () => [...room.state.mobs.values()].filter(m => m.summonedBy === 'sim_target' && !m.dead);
    boss.hp = Math.floor(boss.maxHp * .71); room.tick(.05);
    expect(adds()).toHaveLength(0);
    boss.hp = Math.floor(boss.maxHp * .7); room.tick(.05);
    expect(adds()).toHaveLength(2);
    boss.hp = Math.floor(boss.maxHp * .35); room.tick(.05);
    expect(adds()).toHaveLength(4);
    for (let i = 0; i < 10; i++) room.tick(.05);
    expect(adds()).toHaveLength(4);
    for (const add of adds()) { add.dead = true; add.hp = 0; }
    for (let i = 0; i < 10; i++) room.tick(.05);
    expect(adds()).toHaveLength(0);
  });

  it('counts the deaths that cause a complete wipe', () => {
    const inv = invasionScenarios()[0];
    const profiles = inv.group.slice(0, 2).map(p => ({ ...p, potions: {} }));
    const result = sim.fightGroup({ ...inv.scenario, setup: room => {
      for (const p of room.state.players.values()) {
        p.hp = p.maxHp = 1; p.stunMs = 1e9; p.mp = 0;
      }
    } }, profiles, 4, 30);
    expect(result.outcome).toBe('wipe');
    expect(result.deaths).toBe(2);
  });

  it('repeats party fights with the same seed without retaining previous support or deaths', () => {
    const inv = invasionScenarios()[0];
    const first = sim.fightGroup(inv.scenario, inv.group, 23, 30);
    expect(first).toEqual(sim.fightGroup(inv.scenario, inv.group, 23, 30));
  });

  it('starts consecutive short party fights with independent potion recovery', () => {
    const inv = invasionScenarios()[0];
    const group = inv.group.slice(0, 2).map(p => ({ ...p, potions: { health_potion: 2 } }));
    let room!: GameRoom;
    const scenario = { ...inv.scenario, setup: (r: GameRoom) => {
      room = r;
      for (const p of r.state.players.values()) { p.hp = Math.round(p.maxHp * .2); p.mp = 0; }
    } };
    const run = () => {
      const result = sim.fightGroup(scenario, group, 7, .1, { cooperation: false });
      return { result, players: [...room.state.players.values()].map(p => ({
        hp: p.hp, potions: p.inventory.get('health_potion')?.qty ?? 0, cooldownMs: p.hpPotionCooldownMs,
      })) };
    };
    const first = run();
    expect(first.players.map(p => p.potions)).toEqual([1, 1]);
    expect(run()).toEqual(first);
  });
});
