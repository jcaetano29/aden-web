import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import { GameRoom } from './GameRoom.js';
import { MessageType } from '@aden/shared';

describe('authoritative enemy difficulty', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2588); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('blocks attacks, control, poison and reflection six levels below, then permits progress', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'LevelProbe', className: 'knight' });
    room.setSimulationInterval(() => {}, 50);
    room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId='bosque';p.x=350;p.z=-48;p.level=1;p.pAtk=100000;p.hp=p.maxHp=100000;p.mp=100;
    const mob=room.spawnMob('threat','forest_troll',350,-48,'bosque');p.targetId='threat';
    await room.waitForNextPatch();
    await vi.waitFor(() => expect((c.state.mobs.get('threat') as any)?.level).toBe(7));
    c.send(MessageType.UseSkill,{skillId:'shield_bash'});
    await room.waitForNextPatch();
    expect(mob.hp).toBe(mob.maxHp);expect(mob.stunMs).toBe(0);expect(p.mp).toBe(100);
    mob.dotMs=6000;mob.dotDps=100000;mob.dotAttackerId=c.sessionId;
    mob.windupMs=1;mob.windupTargetId=c.sessionId;p.itemEffects.reflect=.3;
    room['tick'](.5);
    expect(mob.hp).toBe(mob.maxHp);
    p.level=7;p.attackCooldownMs=0;p.targetId='threat';
    room['tick'](.1);
    expect(mob.dead).toBe(true);
  });

  it('restores a living enemy when it leashes without respawning cleared dungeon enemies', async () => {
    const room=await server.createRoom('game',{}) as GameRoom;
    room.setSimulationInterval(()=>{},50);room.state.mobs.clear();
    const mob=room.spawnMob('leash','forest_troll',350,-48,'bosque');
    mob.hp=10;mob.dotMs=3000;mob.dotDps=99;mob.aiState='chase';mob.aggroTargetId='gone';mob.x+=30;
    room['tick'](.1);
    expect(mob.hp).toBe(mob.maxHp);expect(mob.dotMs).toBe(0);
    mob.dead=true;mob.hp=0;mob.respawnMs=999999;room['tick'](.1);
    expect(mob.dead).toBe(true);expect(mob.hp).toBe(0);
  });

  it('makes Nihil engage a ranged opener and announce his area attack', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'RangedNihil', className: 'ranger' });
    room.setSimulationInterval(() => {}, 50);
    room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'trono'; p.x = 609; p.z = 150; p.level = 10; p.moving = false;
    const boss = room.spawnMob('nihil', 'skeleton_king', 600, 150, 'trono');
    p.targetId = 'nihil'; p.attackCooldownMs = 0;
    room.tick(.05);
    expect(boss.hp).toBeLessThan(boss.maxHp);
    expect(boss.aggroTargetId).toBe(c.sessionId);
    expect(boss.hazardMs).toBe(1800);
    expect(boss.hazardX).toBe(609);
  });

  it('rejects low-level poison and retains an eligible poison after the caster leaves', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'PoisonNihil', className: 'rogue' });
    room.setSimulationInterval(() => {}, 50);
    room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'trono'; p.x = 600; p.z = 150; p.level = 3; p.mp = 100;
    const boss = room.spawnMob('nihil', 'skeleton_king', 600, 150, 'trono');
    boss.stunMs = 100000; p.targetId = 'nihil';
    const errors: unknown[] = [];
    c.onMessage(MessageType.ItemResult, message => errors.push(message));
    c.send(MessageType.UseSkill, { skillId: 'poison' });
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(boss.dotMs).toBe(0); expect(p.mp).toBe(100);
    p.level = 10;
    c.send(MessageType.UseSkill, { skillId: 'poison' });
    await vi.waitFor(() => expect(boss.dotMs).toBeGreaterThan(0));
    room.state.players.delete(c.sessionId);
    room.tick(.5);
    expect(boss.hp).toBe(boss.maxHp - 7);
  });

  it('makes ordinary beasts retaliate when shot from beyond their passive detection radius', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'RangedBeast', className: 'ranger' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'marismas'; p.x = 1209; p.z = 110; p.level = 10; p.moving = false;
    const mob = room.spawnMob('raider', 'veil_raider', 1200, 110, 'marismas');
    p.targetId = 'raider'; p.attackCooldownMs = 0;
    room.tick(.05);
    expect(mob.hp).toBeLessThan(mob.maxHp);
    expect(mob.aggroTargetId).toBe(c.sessionId);
    const distanceBefore = Math.hypot(p.x - mob.x, p.z - mob.z);
    room.tick(.05);
    expect(Math.hypot(p.x - mob.x, p.z - mob.z)).toBeLessThan(distanceBefore);
  });
});
