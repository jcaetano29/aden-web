import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { ENCOUNTERS } from '@aden/shared';

describe('encounter summons', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2594); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => {
    await server.cleanup();
    ENCOUNTERS.forest_troll = { templateId: 'forest_troll', aggroRadius: 14, cooldownMs: 1000,
      patterns: [{ shape: 'circle', anchor: 'self', radius: 0.1, windupMs: 999999, power: 0 }],
      summons: [
        { templateId: 'umbra_orc', atHpPct: 0.5, count: 2, maxAlive: 2 },
        { templateId: 'skeleton_minion', everyMs: 1000, fromObjects: ['bosque_shrine'], maxAlive: 1 },
      ] };
  });
  afterEach(() => { delete ENCOUNTERS.forest_troll; });

  const addsOf = (room: GameRoom, templateId?: string) =>
    [...room.state.mobs.entries()].filter(([, m]) => m.summonedBy === 'owner' && !m.dead && (!templateId || m.templateId === templateId));
  const killMob = (room: GameRoom, mob: unknown, id: string, killer: string) =>
    (room as unknown as { killMob(m: unknown, id: string, killer: string): void }).killMob(mob, id, killer);

  it('summons once below half life and periodically from active objects, without rewards', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'SummonTester' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear(); room.state.droppedItems.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 330; p.z = p.targetZ = 0; p.level = 30; p.maxHp = p.hp = 1e6;
    const owner = room.spawnMob('owner', 'forest_troll', 333, 0, 'bosque');
    owner.aggroTargetId = c.sessionId; owner.aiState = 'chase';
    owner.hp = Math.floor(owner.maxHp * 0.4);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    for (let i = 0; i < 25; i++) room.tick(0.05);
    expect(addsOf(room, 'skeleton_minion')).toHaveLength(1);
    for (let i = 0; i < 25; i++) room.tick(0.05);
    expect(addsOf(room, 'skeleton_minion')).toHaveLength(1);

    const exp = p.exp, kills = p.retention.totalKills;
    const [addId, add] = addsOf(room, 'umbra_orc')[0];
    killMob(room, add, addId, c.sessionId);
    expect(p.exp).toBe(exp);
    expect(p.retention.totalKills).toBe(kills);
    expect(room.state.droppedItems.size).toBe(0);
    room.tick(0.05);
    expect(room.state.mobs.has(addId)).toBe(false);

    killMob(room, owner, 'owner', c.sessionId);
    expect(addsOf(room)).toHaveLength(0);
    room.tick(0.05);
    expect([...room.state.mobs.values()].some(m => m.summonedBy === 'owner')).toBe(false);
  });

  it('clears summons when the encounter leashes', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'SummonLeash' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 330; p.z = p.targetZ = 0; p.maxHp = p.hp = 1e6;
    const owner = room.spawnMob('owner', 'forest_troll', 333, 0, 'bosque');
    owner.aggroTargetId = c.sessionId; owner.aiState = 'chase'; owner.hp = Math.floor(owner.maxHp * 0.4);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    owner.hazardMs = 0; p.x = p.targetX = 250; owner.aggroTargetId = ''; owner.aiState = 'chase';
    room.tick(0.05);
    expect(owner.hp).toBe(owner.maxHp);
    expect(addsOf(room)).toHaveLength(0);
  });
});
