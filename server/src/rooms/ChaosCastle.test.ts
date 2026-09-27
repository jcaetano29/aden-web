import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

  /** Partida activa con los jugadores dados; los guardias quedan aturdidos. */
  const match = async (ctx: Awaited<ReturnType<typeof setup>>, specs: [string, number, string?][]) => {
    ctx.room.castle.openNow('menor', 60_000);
    const players = [];
    for (const [name, level, guild] of specs) { const pl = await ctx.join(name, level, 1, guild ?? ''); await ctx.register(pl); players.push(pl); }
    ctx.advance(60_000);
    expect(ctx.room.state.castle.phase).toBe('active');
    for (const m of ctx.room.state.mobs.values()) m.stunMs = 1e9;
    return players;
  };
  const hit = (ctx: Awaited<ReturnType<typeof setup>>, attacker: { p: any }, victim: { p: any; id: string }) => {
    attacker.p.x = victim.p.x + 1; attacker.p.z = victim.p.z; attacker.p.moving = false; victim.p.moving = false;
    attacker.p.targetId = victim.id; attacker.p.attackCooldownMs = 0;
    ctx.room.tick(0.05); attacker.p.targetId = '';
  };

  it('pits guildmates against each other at half damage, scores kills and sends the fallen home unpunished', async () => {
    const ctx = await setup();
    const [a, b] = await match(ctx, [['Rojo', 15, 'g1'], ['Rojo2', 15, 'g1'], ['Testigo', 15]]); // un tercero: la partida sigue
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    b.p.hp = b.p.maxHp; hit(ctx, a, b);
    const inside = b.p.maxHp - b.p.hp;
    expect(inside).toBeGreaterThan(0);
    // Mismo golpe fuera del castillo (mapa PvP, sin ser aliados): el doble.
    const out = await ctx.join('Afuera', 15, 0, 'g9'), target = await ctx.join('Blanco', 15, 0, 'g8');
    out.p.mapId = target.p.mapId = 'bosque'; out.p.x = 300; out.p.z = 0; target.p.x = 301; target.p.z = 0;
    target.p.hp = target.p.maxHp; hit(ctx, out, target);
    expect(inside).toBe(Math.max(1, Math.round((target.p.maxHp - target.p.hp) * 0.5)));
    vi.restoreAllMocks();
    // Un guardia: 2 puntos.
    const guardId = [...ctx.room.state.mobs.keys()][0], guard = ctx.room.state.mobs.get(guardId)!;
    guard.hp = 1; a.p.x = guard.x; a.p.z = guard.z + 1; a.p.targetId = guardId; a.p.attackCooldownMs = 0; ctx.room.tick(0.05);
    expect(ctx.room.state.castle.points.get(a.id)).toBe(2);
    // Eliminar al compañero: 1 punto más; vuelve al pueblo vivo y sin perder nada.
    const gold = b.p.gold = 700, exp = b.p.exp = 300;
    b.p.hp = 1; hit(ctx, a, b);
    expect(ctx.room.state.castle.points.get(a.id)).toBe(3);
    expect(b.p.mapId).toBe('pueblo'); expect(b.p.dead).toBe(false); expect(b.p.hp).toBe(b.p.maxHp);
    expect(b.p.gold).toBe(gold); expect(b.p.exp).toBe(exp);
  });

  it('keeps the guards on the platform while they roam and chase', async () => {
    const ctx = await setup();
    const [a, b] = await match(ctx, [['Firme', 15], ['Firme2', 15]]);
    for (const m of ctx.room.state.mobs.values()) m.stunMs = 0; // que deambulen y persigan
    for (let i = 0; i < 600; i++) { for (const pl of [a, b]) pl.p.hp = pl.p.maxHp; ctx.advance(50); }
    expect(ctx.room.state.castle.phase).toBe('active');
    expect(ctx.room.state.castle.monsters).toBe(14);
  });

  it('crumbles the edge when few remain and drops whoever stands on it', async () => {
    const ctx = await setup();
    const [a, b, c] = await match(ctx, [['Borde', 15], ['Medio', 15], ['Centro', 15]]);
    const { x: cx, z: cz } = { x: 900, z: 300 };
    a.p.x = cx + 25; a.p.z = cz; b.p.x = cx + 15; b.p.z = cz; c.p.x = cx; c.p.z = cz;
    const guards = [...ctx.room.state.mobs.keys()];
    for (const id of guards.slice(0, 4)) ctx.room.state.mobs.delete(id); // quedan 12 participantes vivos
    const edgeGuard = ctx.room.state.mobs.get(guards[4])!; edgeGuard.x = cx - 26; edgeGuard.z = cz;
    ctx.advance(50);
    expect(ctx.room.state.castle.collapseAt).toBeGreaterThan(0);
    expect(ctx.room.state.castle.ring).toBe(0);
    ctx.advance(5_000);
    expect(ctx.room.state.castle.ring).toBe(1);
    expect(a.p.mapId).toBe('pueblo');
    await vi.waitFor(() => expect(a.replies.some(t => t.includes('abismo'))).toBe(true));
    expect(b.p.mapId).toBe('castillo'); expect(c.p.mapId).toBe('castillo');
    expect(ctx.room.state.mobs.has(guards[4])).toBe(false);
    expect(ctx.room.state.castle.points.get(b.id)).toBe(0);
  });

  it('crumbles the edge after 2:30 even with many alive, and walking off the platform drops you', async () => {
    const ctx = await setup();
    const [a, b] = await match(ctx, [['Paciente', 15], ['Torpe', 15]]);
    a.p.x = 900; a.p.z = 300; b.p.x = 900; b.p.z = 290;
    ctx.advance(150_000);
    expect(ctx.room.state.castle.collapseAt).toBeGreaterThan(0);
    b.p.x = 900 + 31; ctx.advance(50);
    expect(b.p.mapId).toBe('pueblo');
  });

  it('crowns the last one standing and rewards the podium', async () => {
    const ctx = await setup();
    const [a, b, c] = await match(ctx, [['Campeón', 15], ['Segundo', 15], ['Tercero', 15]]);
    const guardId = [...ctx.room.state.mobs.keys()][0], guard = ctx.room.state.mobs.get(guardId)!;
    guard.hp = 1; a.p.x = guard.x; a.p.z = guard.z + 1; a.p.targetId = guardId; a.p.attackCooldownMs = 0; ctx.room.tick(0.05);
    const before = { gold: a.p.gold, exp: a.p.exp };
    b.p.hp = 1; hit(ctx, a, b);
    c.p.hp = 1; hit(ctx, a, c);
    expect(ctx.room.state.castle.phase).toBe('');
    const gems = (pl: typeof a) => [...pl.p.inventory.values()].filter(e => ['aden_gema_del_pacto', 'aden_gema_del_azar', 'aden_prisma_del_caos', 'aden_gema_del_pulso'].includes(e.itemTemplateId)).reduce((n, e) => n + e.qty, 0);
    expect(a.p.gold - before.gold).toBe(1500);
    expect(gems(a)).toBe(2); expect(gems(b)).toBe(1); expect(gems(c)).toBe(1);
    expect(a.p.exp !== before.exp || a.p.level > 15).toBe(true); // 4 puntos × 120 de EXP
    expect(a.p.mapId).toBe('pueblo');
    await vi.waitFor(() => expect(a.replies.some(t => t.includes('Ganaste'))).toBe(true));
  });

  it('gives the win to the survivor with most points when time runs out', async () => {
    const ctx = await setup();
    const [a, b] = await match(ctx, [['Puntos', 15], ['Quieto', 15]]);
    const guardId = [...ctx.room.state.mobs.keys()][0], guard = ctx.room.state.mobs.get(guardId)!;
    guard.hp = 1; a.p.x = guard.x; a.p.z = guard.z + 1; a.p.targetId = guardId; a.p.attackCooldownMs = 0; ctx.room.tick(0.05);
    a.p.targetId = ''; a.p.x = 900; a.p.z = 300; b.p.x = 902; b.p.z = 300;
    const gold = { a: a.p.gold, b: b.p.gold };
    ctx.advance(CASTLE_DURATION_MS);
    expect(ctx.room.state.castle.phase).toBe('');
    expect(a.p.gold - gold.a).toBe(1500);
    expect(b.p.gold).toBe(gold.b);
  });

  it('eliminates whoever travels away or disconnects', async () => {
    const ctx = await setup();
    const [a, b, c] = await match(ctx, [['Uno', 15], ['Dos', 15], ['Tres', 15]]);
    a.c.send(MessageType.WarpTo, { mapId: 'bosque' });
    await new Promise(r => setTimeout(r, 60));
    expect(a.p.mapId).toBe('pueblo');
    expect(ctx.room.state.castle.alive).toBe(2);
    await c.c.leave();
    await new Promise(r => setTimeout(r, 100));
    expect(ctx.room.state.castle.alive).toBe(1);
    expect(b.p.mapId).toBe('castillo');
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
