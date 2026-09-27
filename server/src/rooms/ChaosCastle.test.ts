import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getNpc, ringAt, CASTLE_DURATION_MS } from '@aden/shared';
import { grantItem } from '../systems/ItemSystem.js';

describe('Chaos Castle over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2601); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  /** Sala con reloj del castillo manual y jugadores listos junto al Custodio. */
  const setup = async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    let clock = Date.UTC(2026, 8, 27, 12);
    room.castle.host.now = () => clock;
    const keeper = getNpc('chaos_keeper');
    const join = async (name: string, level: number, seals = 1, guild = '') => {
      const c = await server.connectTo(room, { name });
      const replies: string[] = [];
      c.onMessage(MessageType.ItemResult, (m: { text: string }) => replies.push(m.text)); c.onMessage(MessageType.WorldAnnounce, () => {});
      const p = room.state.players.get(c.sessionId)!;
      p.level = level; p.mapId = 'pueblo'; p.x = keeper.x; p.z = keeper.z; p.guildId = guild;
      if (seals) grantItem(p, 'chaos_seal', seals);
      return { c, p, id: c.sessionId, replies };
    };
    const register = async (pl: Awaited<ReturnType<typeof join>>) => {
      pl.c.send(MessageType.InteractNpc, { npcId: 'chaos_keeper' });
      await new Promise(r => setTimeout(r, 60));
    };
    return { room, join, register, advance: (ms: number) => { clock += ms; room.tick(0.05); } };
  };

  it('registers the right bracket with a seal and refunds when too few join', async () => {
    const { room, join, register, advance } = await setup();
    room.castle.openNow('menor', 60_000);
    expect(room.state.castle.phase).toBe('registration');
    const ok = await join('Menor', 15), high = await join('Mayor', 25), broke = await join('Pobre', 12, 0);
    await register(ok); await register(high); await register(broke);
    expect(ok.p.inventory.get('chaos_seal')?.qty ?? 0).toBe(0);
    expect(room.state.castle.registered).toBe(1);
    expect(high.replies.at(-1)).toContain('tramo');
    expect(broke.replies.at(-1)).toContain('Sello del Caos');
    advance(60_000);
    expect(room.state.castle.phase).toBe('');
    expect(ok.p.inventory.get('chaos_seal')?.qty).toBe(1);
    expect(ok.p.mapId).toBe('pueblo');
  });

  it('teleports the entrants onto the outer ring, fills with guards and sends everyone home when time runs out', async () => {
    const { room, join, register, advance } = await setup();
    room.castle.openNow('menor', 60_000);
    const a = await join('Uno', 15), b = await join('Dos', 18);
    await register(a); await register(b);
    advance(60_000);
    expect(room.state.castle.phase).toBe('active');
    for (const pl of [a, b]) { expect(pl.p.mapId).toBe('castillo'); expect(ringAt(pl.p.x, pl.p.z)).toBe(1); }
    expect(room.state.castle.monsters).toBe(14);
    expect([...room.state.mobs.values()].filter(m => m.templateId === 'chaos_guard_minor')).toHaveLength(14);
    for (const m of room.state.mobs.values()) m.stunMs = 1e9; // que no interfieran
    advance(CASTLE_DURATION_MS);
    expect(room.state.castle.phase).toBe('');
    expect(a.p.mapId).toBe('pueblo'); expect(b.p.mapId).toBe('pueblo');
    expect(room.state.mobs.size).toBe(0);
  });

  it('never lets anyone travel into the arena outside the event', async () => {
    const { room, join } = await setup();
    const pl = await join('Viajero', 20, 0);
    pl.c.send(MessageType.WarpTo, { mapId: 'castillo' });
    await new Promise(r => setTimeout(r, 60));
    expect(pl.p.mapId).toBe('pueblo');
    expect(room.state.castle.phase).toBe('');
  });
});
