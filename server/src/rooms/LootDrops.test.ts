import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { getItem, catalogDropPool } from '@aden/shared';

describe('catalog drops by source', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2599); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });
  afterEach(() => { vi.restoreAllMocks(); });

  /** Mata al enemigo con un azar fijo y devuelve la pieza del catálogo que soltó. */
  let dropRun = 0;
  /** Mata al enemigo con un azar fijo y devuelve los ids base de todo lo que soltó. */
  const allDrops = async (templateId: string, mapId: string, x: number, z: number, roll: number) => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: `Drop${++dropRun}` });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear(); room.state.droppedItems.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.level = 25; p.mapId = mapId; p.x = x; p.z = z;
    const mob = room.spawnMob('drop-target', templateId, x, z + 1, mapId);
    mob.hp = 1; mob.stunMs = 10000;
    vi.spyOn(Math, 'random').mockReturnValue(roll);
    p.targetId = 'drop-target'; p.attackCooldownMs = 0; room.tick(0.05);
    expect(mob.dead, templateId).toBe(true);
    return [...room.state.droppedItems.values()].map(d => getItem(d.itemTemplateId).baseId ?? d.itemTemplateId);
  };

  it('rolls a Chaos Seal apart from the catalog piece, and nothing drops inside the castle', async () => {
    expect(await allDrops('ember_imp', 'fragua', 1500, 470, 0.001)).toContain('chaos_seal');
    expect(await allDrops('ember_imp', 'fragua', 1500, 470, 0.9)).not.toContain('chaos_seal');
    expect(await allDrops('chaos_guard_minor', 'castillo', 900, 300, 0.001)).toEqual([]);
  });

  const catalogDrop = async (templateId: string) => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: `Loot${templateId}` });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear(); room.state.droppedItems.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.level = 25; p.mapId = 'fragua'; p.x = 1500; p.z = 470; p.questId = 'f_vharzul';
    const mob = room.spawnMob('loot-target', templateId, 1500, 471, 'fragua');
    mob.hp = 1; mob.stunMs = 10000;
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    p.targetId = 'loot-target'; p.attackCooldownMs = 0; room.tick(0.05);
    expect(mob.dead).toBe(true);
    const pool = catalogDropPool('fragua', templateId);
    return [...room.state.droppedItems.values()].map(d => getItem(d.itemTemplateId)).find(item => pool.includes(item.baseId ?? item.id))!;
  };

  it('turns the same lucky roll into an excellent piece from a boss and a magic one from a normal enemy', async () => {
    expect((await catalogDrop('vharzul')).options?.quality).toBe('excellent');
    expect((await catalogDrop('ember_imp')).options?.quality).toBe('magic');
  });
});
