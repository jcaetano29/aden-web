import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { MessageType, getSkill } from '@aden/shared';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';

describe('cooperative combat over the room protocol', () => {
  let server: ColyseusTestServer;
  let serial = 0;
  beforeAll(async () => { server = await boot(config, 2622); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });
  async function setup(className: string, second = 'knight') {
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 1000);
    const a = await server.connectTo(room, { name: `CoopA${++serial}`, className });
    const b = await server.connectTo(room, { name: `CoopB${serial}`, className: second });
    for (const c of [a, b]) c.onMessage('*', () => {});
    await room.waitForNextPatch();
    room.state.mobs.clear();
    room['parties'].invite(a.sessionId, b.sessionId);
    room['parties'].respond(b.sessionId, a.sessionId, true);
    const p = room.state.players.get(a.sessionId)!, q = room.state.players.get(b.sessionId)!;
    for (const x of [p, q]) {
      x.mapId = 'bosque'; x.x = x.targetX = 300; x.z = x.targetZ = 40;
      x.level = 25; x.maxHp = 1000; x.hp = 500; x.maxMp = x.mp = 500;
      x.attackCooldownMs = 100000; x.moving = false;
    }
    q.x = q.targetX = 302;
    return { room, a, b, p, q };
  }

  it('heals the selected ally without changing the hostile target or healing the caster', async () => {
    const { room, a, b, p, q } = await setup('mage');
    p.targetId = 'enemy';
    a.send(MessageType.UseSkill, { skillId: 'arcane_mend', allyId: b.sessionId });
    await room.waitForNextPatch();
    expect(q.hp).toBe(820); expect(p.hp).toBe(500);
    expect(p.targetId).toBe('enemy'); expect(p.mp).toBe(480);
  });

  it.each(['far', 'dead', 'other-map', 'other-party', 'castle', 'unknown'])('rejects %s support atomically', async mode => {
    const { room, a, b, p, q } = await setup('mage');
    if (mode === 'far') q.x = 330;
    if (mode === 'dead') q.dead = true;
    if (mode === 'other-map') q.mapId = 'ruinas';
    if (mode === 'other-party') q.partyId = 'another';
    if (mode === 'castle') p.mapId = q.mapId = 'castillo';
    a.send(MessageType.UseSkill, { skillId: 'arcane_mend', allyId: mode === 'unknown' ? 'missing' : b.sessionId });
    await room.waitForNextPatch();
    expect(p.mp).toBe(500); expect(p.hp).toBe(500); expect(q.hp).toBe(500);
    expect(p.skillCooldowns.has('arcane_mend')).toBe(false);
  });

  it('keeps self healing when no ally was selected and reports actual healing', async () => {
    const { room, a, p } = await setup('mage');
    p.hp = 990;
    const casts: any[] = []; a.onMessage(MessageType.SkillCast, ev => casts.push(ev));
    a.send(MessageType.UseSkill, { skillId: 'arcane_mend' });
    await room.waitForNextPatch();
    expect(p.hp).toBe(1000); expect(casts.at(-1)?.amount).toBe(10);
  });

  it('gives a nearby party member a non-stacking rally without replacing personal buffs', async () => {
    const { room, a, p, q } = await setup('barbarian');
    q.atkBuffMs = 4000; q.atkBuffMult = 1.4;
    a.send(MessageType.UseSkill, { skillId: 'rage' });
    await room.waitForNextPatch();
    expect((q as any).cooperation?.rallyMs ?? 0).toBe(6000);
    expect(q.atkBuffMult).toBe(1.4); expect(p.atkBuffMult).toBe(1.5);
    q.partyId = 'left'; room.tick(.05);
    expect((q as any).cooperation?.rallyMs ?? 0).toBe(0);
  });

  it('protects an ally and removes protection when the knight leaves the party', async () => {
    const { room, a, b, p, q } = await setup('knight');
    a.send(MessageType.UseSkill, { skillId: 'guard', allyId: b.sessionId });
    await room.waitForNextPatch();
    expect((q as any).cooperation?.protectedBy ?? '').toBe(a.sessionId);
    expect((q as any).cooperation?.protectedMs ?? 0).toBe(6000);
    expect(p.defBuffMult).toBe(getSkill('guard').buffMult);
    room['parties'].leave(a.sessionId); room.tick(.05);
    expect((q as any).cooperation?.protectedMs ?? 0).toBe(0);
  });

  it('provokes a monster off a nearer ally and keeps it after the stun ends', async () => {
    const { room, a, b, p, q } = await setup('knight');
    const mob = room.spawnMob('enemy', 'mine_digger', 302, 40, 'bosque');
    mob.hp = mob.maxHp = 10000; mob.aggroTargetId = b.sessionId;
    p.targetId = 'enemy'; q.x = 302; q.z = 40.1;
    a.send(MessageType.UseSkill, { skillId: 'shield_bash' }); await room.waitForNextPatch();
    mob.stunMs = 0; mob.attackCooldownMs = 100000;
    room.tick(.05);
    expect(mob.aggroTargetId).toBe(a.sessionId);
  });

  it('keeps independent poison ticks for two rogues', async () => {
    const { room, a, b, p, q } = await setup('rogue', 'rogue');
    const mob = room.spawnMob('enemy', 'mine_digger', 301, 40, 'bosque');
    mob.maxHp = mob.hp = 10000; mob.stunMs = 100000;
    p.targetId = q.targetId = 'enemy';
    a.send(MessageType.UseSkill, { skillId: 'poison' });
    b.send(MessageType.UseSkill, { skillId: 'poison' });
    await room.waitForNextPatch(); room.tick(.5);
    expect(mob.hp).toBe(9986);
  });

  it('protects low level bystanders from invasion reinforcements, including in town', async () => {
    const { room, a, b, p, q } = await setup('knight');
    p.mapId = q.mapId = 'pueblo'; p.x = 20; p.z = 0; q.x = 1; q.z = 0; q.level = 1;
    room.spawnMob('dragon', 'crimson_dragon', 0, 0, 'pueblo');
    const add = room.spawnMob('guardian', 'forged_guardian', 0, 0, 'pueblo');
    add.summonedBy = 'dragon';
    // A target becomes ineligible even if it was already in the threat table.
    add.threat.set(b.sessionId, 1000);
    add.threat.set(a.sessionId, 100);
    room.tick(.05);
    expect(add.aggroTargetId).toBe(a.sessionId);
    expect(q.hp).toBe(500);
  });

  it('removes reinforcements when their invasion ends without killing the boss', async () => {
    const { room } = await setup('knight');
    room.spawnMob('dragon', 'crimson_dragon', 300, 40, 'bosque');
    const add = room.spawnMob('guardian', 'forged_guardian', 300, 40, 'bosque');
    add.summonedBy = 'dragon';
    room.state.mobs.delete('dragon'); // EventSystem.close on timeout retires the owner.
    room.tick(.05);
    expect(room.state.mobs.has('guardian')).toBe(false);
    expect(room.state.droppedItems.size).toBe(0);
  });
});
