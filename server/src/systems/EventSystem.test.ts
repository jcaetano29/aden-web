import { describe, it, expect } from 'vitest';
import { GameState } from '../state/GameState.js';
import { MobState } from '../state/MobState.js';
import { PlayerState } from '../state/PlayerState.js';
import { PartySystem } from './PartySystem.js';
import { EventSystem, type EventHost } from './EventSystem.js';
import { nextDailyInvasion, INVASION_WARNING_MS, INVASION_DURATION_MS } from '@aden/shared';

const H = 3_600_000;
function fakeHost(start: number, online = 3) {
  const texts: string[] = [], publicDrops: string[] = [];
  let clock = start;
  const host: EventHost = {
    state: new GameState(), now: () => clock, rng: () => 0, announce: t => texts.push(t), onlinePlayers: () => online,
    spawnInvader: (id, templateId, x, z, mapId) => {
      const m = new MobState(); m.templateId = templateId; m.x = x; m.z = z; m.mapId = mapId; m.hp = m.maxHp = 100;
      host.state.mobs.set(id, m); return m;
    },
    dropReserved: () => {}, reward: () => {}, dropPublic: (itemId, qty) => publicDrops.push(`${itemId}x${qty}`),
  };
  return { host, texts, publicDrops, advance: (ms: number) => { clock += ms; } };
}

describe('invasion lifecycle', () => {
  it('uses a different reachable spawn for different random draws instead of the map center', () => {
    const points: Array<{x:number;z:number}> = [];
    for (const roll of [0.1, 0.9]) {
      const {host} = fakeHost(Date.UTC(2026, 8, 26, 12));
      host.rng = () => roll;
      const events = new EventSystem(host, {scheduled:false});
      events.startNow('waste_herald', 'bosque', 0); events.tick();
      const boss = host.state.mobs.get(host.state.worldEvent.bossId)!;
      points.push({x:boss.x,z:boss.z});
      expect(events.inArea(boss)).toBe(true);
    }
    expect(Math.hypot(points[0].x-points[1].x,points[0].z-points[1].z)).toBeGreaterThan(100);
  });
  it('announces 5 minutes early, spawns at start and retreats after 20 minutes', () => {
    const daily = nextDailyInvasion(Date.UTC(2026, 8, 26, 12));
    const { host, texts, advance } = fakeHost(daily - INVASION_WARNING_MS - 1000, 0);
    const events = new EventSystem(host);
    events.tick(); expect(host.state.worldEvent.phase).toBe('');
    advance(1000); events.tick();
    expect(host.state.worldEvent).toMatchObject({ phase: 'announced', invaderId: 'crimson_dragon', mapId: 'pueblo', startsAt: daily, endsAt: daily + INVASION_DURATION_MS });
    expect(texts.at(-1)).toContain('dragones');
    advance(INVASION_WARNING_MS); events.tick();
    expect(host.state.worldEvent.phase).toBe('active');
    expect(host.state.mobs.get(host.state.worldEvent.bossId)?.templateId).toBe('crimson_dragon');
    expect(events.inArea({ mapId: 'pueblo', x: 0, z: -20 })).toBe(true);
    advance(INVASION_DURATION_MS); events.tick();
    expect(host.state.worldEvent.phase).toBe('');
    expect(host.state.mobs.size).toBe(0);
    expect(texts.at(-1)).toContain('se retira');
    expect(events.inArea({ mapId: 'pueblo', x: 0, z: -20 })).toBe(false);
  });
  it('skips minor invasions without enough players and runs them when there are', () => {
    const start = Date.UTC(2026, 8, 26, 12);
    const quiet = fakeHost(start, 1), busy = fakeHost(start, 2);
    const a = new EventSystem(quiet.host), b = new EventSystem(busy.host);
    quiet.advance(2 * H); busy.advance(2 * H); a.tick(); b.tick();
    expect(quiet.host.state.worldEvent.phase).toBe('');
    expect(busy.host.state.worldEvent.phase).toBe('announced');
    expect(busy.host.state.worldEvent.invaderId).not.toBe('crimson_dragon');
  });
  it('drops two public Chaos Seals when the invader falls', () => {
    const { host, publicDrops, advance } = fakeHost(Date.UTC(2026, 8, 26, 12));
    const events = new EventSystem(host);
    events.startNow('veil_specter', 'marismas', 0); events.tick();
    const bossId = host.state.worldEvent.bossId;
    const hero = new PlayerState(); hero.name = 'Héroe'; host.state.players.set('hero', hero);
    events.recordDamage(bossId, 'hero', 500);
    host.state.mobs.get(bossId)!.dead = true; advance(50); events.tick();
    expect(publicDrops).toEqual(['chaos_sealx2']);
  });
  it('ends the invasion when the boss dies', () => {
    const { host, texts, advance } = fakeHost(Date.UTC(2026, 8, 26, 12));
    const events = new EventSystem(host);
    events.startNow('veil_specter', 'marismas', 0);
    events.tick();
    const boss = host.state.mobs.get(host.state.worldEvent.bossId)!;
    boss.dead = true; advance(50); events.tick();
    expect(host.state.worldEvent.phase).toBe('');
    expect(texts.some(t => t.includes('Espectro del Velo') && t.includes('cayó'))).toBe(true);
  });
});

function contributionFixture() {
  const fixture = fakeHost(Date.UTC(2026, 8, 26, 12));
  const { host } = fixture;
  const drops: Parameters<EventHost['dropReserved']>[4][] = [];
  const rewards: string[] = [];
  host.dropReserved = (_itemId, _x, _z, _mapId, owner) => drops.push(owner);
  host.reward = id => rewards.push(id);
  const events = new EventSystem(host, { scheduled: false });
  events.startNow('waste_herald', 'bosque', 0); events.tick();
  const bossId = host.state.worldEvent.bossId;
  const boss = host.state.mobs.get(bossId)!;
  boss.hp = boss.maxHp = 10000;
  for (const id of ['a', 'b', 'c', 'rival']) {
    const player = new PlayerState();
    Object.assign(player, { name: id, loaded: true, hp: 100, maxHp: 100, level: 25, mapId: boss.mapId, x: boss.x, z: boss.z });
    host.state.players.set(id, player);
  }
  const parties = new PartySystem(host.state, () => {});
  const party = () => {
    parties.invite('a', 'b'); parties.respond('b', 'a', true);
    parties.invite('a', 'c'); parties.respond('c', 'a', true);
    return host.state.players.get('a')!.partyId;
  };
  const finish = () => { boss.dead = true; fixture.advance(50); events.tick(); };
  return { ...fixture, events, boss, bossId, parties, party, drops, rewards, finish };
}

describe('invasion cooperation credit', () => {
  it('combines party contribution ahead of solo players and captures only participating recipients', () => {
    const { host, events, bossId, party, drops, finish } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 400);
    events.recordDamage(bossId, 'b', 400);
    events.recordDamage(bossId, 'rival', 700);
    finish();
    expect(drops[0]).toMatchObject({ guildId: '', playerId: '', label: 'Party de a' });
    expect(drops[0].partyMembers).toEqual(['a', 'b']);
    expect(host.state.worldEvent.phase).toBe('');
  });

  it('gives guild grouping precedence and never moves past contribution after guild or party changes', () => {
    const { host, events, bossId, party, parties, drops, finish } = contributionFixture();
    party();
    const a = host.state.players.get('a')!;
    a.guildId = 'first'; a.guildTag = 'FIRST';
    events.recordDamage(bossId, 'a', 1000);
    a.guildId = 'second'; a.guildTag = 'SECOND'; parties.leave('a');
    events.recordDamage(bossId, 'a', 100);
    events.recordDamage(bossId, 'rival', 900);
    finish();
    expect(drops[0]).toEqual({ guildId: 'first', playerId: '', label: 'FIRST' });
  });

  it('keeps captured party contributors eligible after leaving or dying and excludes later noncontributors', () => {
    const { host, events, bossId, party, parties, drops, rewards, finish } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 300);
    events.recordDamage(bossId, 'b', 300);
    parties.leave('b');
    events.recordDamage(bossId, 'b', 100);
    host.state.players.get('a')!.dead = true;
    finish();
    expect(drops[0].partyMembers).toEqual(['a', 'b']);
    expect(rewards.sort()).toEqual(['a', 'b']);
  });

  it('credits effective support from a healer with no damage and caps spam to party damage', () => {
    const { events, bossId, party, drops, rewards, finish } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 1000);
    events.recordDamage(bossId, 'rival', 1100);
    events.recordSupport(bossId, 'b', 100);
    events.recordSupport(bossId, 'b', 100);
    for (let i = 0; i < 20; i++) events.recordSupport(bossId, 'b', 10000);
    finish();
    expect(drops[0].partyMembers).toEqual(['a', 'b']);
    expect(rewards.sort()).toEqual(['a', 'b', 'rival']);
  });

  it('limits support even after repeated calls and does not bank excess support for future damage', () => {
    const { host, events, bossId, party, advance } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 1000);
    events.recordDamage(bossId, 'rival', 2000);
    for (let i = 0; i < 20; i++) events.recordSupport(bossId, 'b', 10000);
    advance(1000); events.tick();
    expect([...host.state.worldEvent.ranking]).toEqual(['rival · 63%', 'Party de a · 38%']);
    events.recordDamage(bossId, 'a', 1000);
    advance(1000); events.tick();
    expect([...host.state.worldEvent.ranking]).toEqual(['Party de a · 52%', 'rival · 48%']);
  });

  it('credits the effective bonus of a lethal hit before the combat death transition', () => {
    const { events, bossId, boss, party, rewards, finish } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 1000);
    boss.hp = 0;
    events.recordSupport(bossId, 'b', 100);
    finish();
    expect(rewards).toContain('b');
  });

  it('caps an engaged contributor without party damage at half their own damage', () => {
    const { host, events, bossId, advance } = contributionFixture();
    events.recordDamage(bossId, 'a', 100);
    events.recordDamage(bossId, 'rival', 200);
    for (let i = 0; i < 10; i++) events.recordSupport(bossId, 'a', 1000);
    advance(1000); events.tick();
    expect([...host.state.worldEvent.ranking]).toEqual(['rival · 57%', 'a · 43%']);
  });

  it('clears support, group snapshots and party recipients between invasions', () => {
    const { host, events, bossId, party, parties, rewards, drops, finish } = contributionFixture();
    party();
    events.recordDamage(bossId, 'a', 1000);
    events.recordSupport(bossId, 'b', 100);
    finish();
    rewards.length = 0; drops.length = 0;
    parties.leave('a');
    events.startNow('waste_herald', 'bosque', 0); events.tick();
    const nextId = host.state.worldEvent.bossId;
    const nextBoss = host.state.mobs.get(nextId)!;
    for (const player of host.state.players.values()) { player.x = nextBoss.x; player.z = nextBoss.z; }
    events.recordSupport(nextId, 'b', 100);
    events.recordDamage(nextId, 'a', 100);
    nextBoss.dead = true; events.tick();
    expect(rewards).toEqual(['a']);
    expect(drops[0]).toEqual({ guildId: '', playerId: 'a', label: 'a' });
  });

  it.each(['unloaded', 'dead', 'zeroHp', 'lowLevel', 'wrongMap', 'far', 'noEngagement', 'tinyEngagement', 'wrongBoss', 'deadBoss', 'expired', 'departed', 'nan', 'infinite', 'zero', 'negative'])(
    'rejects %s support without granting participation', kind => {
      const { host, events, bossId, boss, party, parties, advance, rewards, finish } = contributionFixture();
      party();
      if (kind !== 'noEngagement') events.recordDamage(bossId, 'a', kind === 'tinyEngagement' ? 1 : 1000);
      const b = host.state.players.get('b')!;
      if (kind === 'unloaded') b.loaded = false;
      if (kind === 'dead') b.dead = true;
      if (kind === 'zeroHp') b.hp = 0;
      if (kind === 'lowLevel') b.level = 9;
      if (kind === 'wrongMap') b.mapId = 'pueblo';
      if (kind === 'far') b.x += 100;
      if (kind === 'deadBoss') boss.dead = true;
      if (kind === 'expired') advance(INVASION_DURATION_MS);
      if (kind === 'departed') parties.leave('b');
      const amount = kind === 'nan' ? NaN : kind === 'infinite' ? Infinity : kind === 'zero' ? 0 : kind === 'negative' ? -50 : 1000;
      events.recordSupport(kind === 'wrongBoss' ? 'unrelated' : bossId, 'b', amount);
      finish();
      expect(rewards).not.toContain('b');
    },
  );

  it('rejects nonfinite damage so invalid input cannot poison standings', () => {
    const { events, bossId, drops, finish } = contributionFixture();
    events.recordDamage(bossId, 'a', NaN);
    events.recordDamage(bossId, 'a', Infinity);
    events.recordDamage(bossId, 'rival', 100);
    finish();
    expect(drops[0].playerId).toBe('rival');
  });
});
