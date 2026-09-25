import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getSkill } from '@aden/shared';

describe('skills while auto-attacking', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2596); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('casts a damage skill even though the auto-attack swing is on cooldown', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MeleeCaster', className: 'knight' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 300; p.z = p.targetZ = 40; p.level = 5; p.mp = p.maxMp;
    const mob = room.spawnMob('dummy', 'skeleton_warrior', 301, 40, 'bosque');
    mob.maxHp = mob.hp = 100000; mob.stunMs = 1e9;
    p.targetId = 'dummy';
    room.tick(0.05);
    expect(p.attackCooldownMs).toBeGreaterThan(0);
    const mp = p.mp;
    c.send(MessageType.UseSkill, { skillId: 'shield_bash' });
    await room.waitForNextPatch();
    expect(p.mp).toBe(mp - getSkill('shield_bash').mpCost);
    expect(p.skillCooldowns.get('shield_bash')).toBeGreaterThan(0);
  });

  it('applies a poison while the auto-attack swing is on cooldown', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MeleePoison', className: 'rogue' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 300; p.z = p.targetZ = 40; p.level = 5; p.mp = p.maxMp;
    const mob = room.spawnMob('dummy', 'skeleton_warrior', 301, 40, 'bosque');
    mob.maxHp = mob.hp = 100000; mob.stunMs = 1e9;
    p.targetId = 'dummy';
    room.tick(0.05);
    expect(p.attackCooldownMs).toBeGreaterThan(0);
    c.send(MessageType.UseSkill, { skillId: 'poison' });
    await room.waitForNextPatch();
    expect(mob.dotMs).toBeGreaterThan(0);
  });
});
