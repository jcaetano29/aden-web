import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getItem } from '@aden/shared';
import { tryPickup } from '../systems/LootSystem.js';

describe('boss invasions over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2600); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  /** Sala con reloj de eventos manual y tres jugadores de nivel 25 junto al punto de invasión del pueblo. */
  const setup = async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    let clock = Date.UTC(2026, 8, 26, 12);
    room.events.host.now = () => clock;
    const join = async (name: string, guild: string, tag: string, x: number) => {
      const c = await server.connectTo(room, { name });
      c.onMessage(MessageType.ItemResult, () => {}); c.onMessage(MessageType.WorldAnnounce, () => {});
      const p = room.state.players.get(c.sessionId)!;
      p.level = 25; p.mapId = 'pueblo'; p.x = x; p.z = -20; p.guildId = guild; p.guildTag = tag;
      return { c, p, id: c.sessionId };
    };
    return { room, join, advance: (ms: number) => { clock += ms; } };
  };

  it('ranks guilds by damage and reserves the unique loot for the winner before it goes public', async () => {
    const { room, join, advance } = await setup();
    const a = await join('Alfa', 'g1', 'AAA', 2), b = await join('Beta', 'g2', 'BBB', -2), solo = await join('Solo', '', '', 4);
    room.events.startNow('crimson_dragon', 'pueblo', 0); room.tick(0.05);
    const bossId = room.state.worldEvent.bossId, boss = room.state.mobs.get(bossId)!;
    expect(room.state.worldEvent.phase).toBe('active');
    room.events.recordDamage(bossId, a.id, 7000); room.events.recordDamage(bossId, b.id, 3000); room.events.recordDamage(bossId, solo.id, 50);
    advance(1000); room.tick(0.05);
    expect([...room.state.worldEvent.ranking]).toEqual(['AAA · 70%', 'BBB · 30%', 'Solo · 0%']);
    const gold = { a: a.p.gold, b: b.p.gold, solo: solo.p.gold };
    boss.hp = 1; boss.stunMs = 10000; a.p.x = boss.x; a.p.z = boss.z + 1; a.p.targetId = bossId; a.p.attackCooldownMs = 0;
    room.tick(0.05);
    expect(room.state.worldEvent.phase).toBe('');
    const reserved = [...room.state.droppedItems.entries()].filter(([, d]) => d.reservedFor === 'AAA');
    expect(reserved.map(([, d]) => getItem(d.itemTemplateId).category).sort()).toEqual(expect.arrayContaining(['joya']));
    expect(reserved.some(([, d]) => ['alas', 'mascota'].includes(getItem(d.itemTemplateId).category!))).toBe(true);
    const [firstId, first] = reserved[0], [secondId, second] = reserved[1];
    for (const d of [first, second]) d.pickDelayMs = 0;
    b.p.x = first.x; b.p.z = first.z;
    expect(tryPickup(room.state, b.id, firstId)).toBe(false);
    a.p.x = first.x; a.p.z = first.z;
    expect(tryPickup(room.state, a.id, firstId)).toBe(true);
    for (let s = 0; s < 61; s++) room.tick(1);
    expect(second.reservedFor).toBe('');
    b.p.x = second.x; b.p.z = second.z; b.p.dead = false;
    expect(tryPickup(room.state, b.id, secondId)).toBe(true);
    expect(a.p.gold).toBeGreaterThan(gold.a);
    expect(b.p.gold).toBeGreaterThan(gold.b);
    expect(solo.p.gold).toBe(gold.solo);
  });

  it('lets the invader retreat when time runs out, without loot', async () => {
    const { room, join, advance } = await setup();
    await join('Tardío', 'g1', 'AAA', 2);
    room.events.startNow('veil_specter', 'marismas', 0); room.tick(0.05);
    const bossId = room.state.worldEvent.bossId;
    advance(20 * 60_000); room.tick(0.05);
    expect(room.state.worldEvent.phase).toBe('');
    expect(room.state.mobs.has(bossId)).toBe(false);
    expect(room.state.droppedItems.size).toBe(0);
  });
});
