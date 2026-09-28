import { describe, it, expect } from 'vitest';
import { GameState } from '../state/GameState.js';
import { MobState } from '../state/MobState.js';
import { PlayerState } from '../state/PlayerState.js';
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
