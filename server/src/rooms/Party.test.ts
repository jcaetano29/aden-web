import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { MessageType, getMobExp, getZone } from '@aden/shared';
import appConfig from '../testServer.js';
import type { GameRoom } from './GameRoom.js';

describe('party integration', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(appConfig, 2578); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  async function setup() {
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 50);
    const a = await server.connectTo(room, { name: 'PartyA' });
    const b = await server.connectTo(room, { name: 'PartyB' });
    const c = await server.connectTo(room, { name: 'PartyC' });
    for (const client of [a, b, c]) {
      client.onMessage(MessageType.PartyInvitation, () => {});
      client.onMessage(MessageType.ItemResult, () => {});
    }
    await room.waitForNextPatch();
    a.send(MessageType.PartyInvite, { targetId: b.sessionId });
    await room.waitForNextPatch();
    b.send(MessageType.PartyRespond, { inviterId: a.sessionId, accept: true });
    await room.waitForNextPatch();
    const pa = room.state.players.get(a.sessionId)!, pb = room.state.players.get(b.sessionId)!, pc = room.state.players.get(c.sessionId)!;
    return { room, a, b, c, pa, pb, pc };
  }

  it('synchronizes membership and removes disconnected members', async () => {
    const { room, a, b, pa, pb } = await setup();
    expect(pa.partyId).not.toBe(''); expect(pb.partyId).toBe(pa.partyId);
    expect((b.state as any).parties.get(pa.partyId).leaderId).toBe(a.sessionId);
    await b.leave(); await room.waitForNextPatch();
    expect(pa.partyId).toBe(''); expect(room.state.parties.size).toBe(0);
  });

  it('splits EXP and shares kill objectives only with living nearby party members', async () => {
    const { room, a, pa, pb, pc } = await setup();
    for (const p of [pa, pb, pc]) { p.mapId = 'bosque'; p.x = 300; p.z = 0; p.exp = 0; p.questId = 'q1'; p.questProgress = 0; p.dailyQuestId = ''; }
    const mob = room.spawnMob('party-mob', 'skeleton_minion', 300, 0, 'bosque');
    room['killMob'](mob, 'party-mob', a.sessionId);
    const exp = getMobExp('skeleton_minion');
    expect(pa.exp + pb.exp).toBe(exp); expect(pb.exp).toBe(Math.floor(exp / 2));
    expect(pa.questProgress).toBe(1); expect(pb.questProgress).toBe(1);
    expect(pc.exp).toBe(0); expect(pc.questProgress).toBe(0);
    for (const mode of ['far', 'dead', 'other-map']) {
      pa.exp = pb.exp = 0; pb.x = mode === 'far' ? 330 : 300; pb.dead = mode === 'dead'; pb.mapId = mode === 'other-map' ? 'pueblo' : 'bosque';
      room['killMob'](room.spawnMob(mode, 'skeleton_minion', 300, 0, 'bosque'), mode, a.sessionId);
      expect(pa.exp).toBe(exp); expect(pb.exp).toBe(0); expect(pb.questProgress).toBe(1);
    }
  });

  it('removes a disconnecting player before awaiting persistence, preventing a new invitation', async () => {
    const { room, a, b, c } = await setup();
    let release!: () => void;
    vi.spyOn(room['persistence'], 'saveMany').mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    const leaving = room.onLeave(room.clients.find(client => client.sessionId === b.sessionId)!);
    try {
      expect(room.state.players.has(b.sessionId)).toBe(false);
      expect(room['parties'].invite(c.sessionId, b.sessionId).success).toBe(false);
      expect(room.state.players.get(a.sessionId)!.partyId).toBe('');
    } finally { await vi.waitFor(() => expect(release).toBeTypeOf('function')); release(); await leaving; }
  });

  it('preserves full public crypt EXP without granting it twice to a party member', async () => {
    const { room, a, pa, pb, pc } = await setup();
    const [id, mob] = [...room.state.mobs].find(([, m]) => m.templateId === 'crypt_acolyte')!;
    for (const p of [pa, pb, pc]) { p.mapId = mob.mapId; p.x = mob.x; p.z = mob.z; p.exp = 0; p.dailyQuestId = ''; }
    room['killMob'](mob, id, a.sessionId);
    for (const p of [pa, pb, pc]) expect(p.exp).toBe(getMobExp('crypt_acolyte'));
  });

  it.each(['dead', 'far', 'other-map'])('awards eligible companions when the killer is %s at the final poison tick', async mode => {
    const { room, a, pa, pb } = await setup();
    for (const p of [pa, pb]) { p.mapId = 'bosque'; p.x = 300; p.z = 0; p.exp = 0; p.questId = 'q1'; p.questProgress = 0; p.dailyQuestId = ''; }
    pa.dead = mode === 'dead'; pa.x = mode === 'far' ? 340 : 300; pa.mapId = mode === 'other-map' ? 'pueblo' : 'bosque';
    const mob = room.spawnMob('poison-final', 'skeleton_minion', 300, 0, 'bosque');
    room['killMob'](mob, 'poison-final', a.sessionId);
    expect(pb.exp).toBe(getMobExp('skeleton_minion')); expect(pb.questProgress).toBe(1);
    expect(pa.exp).toBe(0); expect(pa.questProgress).toBe(0);
  });

  it('blocks allied auto-attacks, direct skills and existing poison', async () => {
    const { room, a, b, pa, pb } = await setup();
    room.state.mobs.clear();
    const zone = getZone('bosque');
    for (const p of [pa, pb]) { p.mapId = 'bosque'; p.x = zone.center.x; p.z = zone.center.z; p.hp = p.maxHp = 100; p.mp = p.maxMp = 100; }
    pa.targetId = b.sessionId;
    room['tick'](.05);
    expect(pb.hp).toBe(100);
    a.send(MessageType.UseSkill, { skillId: 'shield_bash' }); await room.waitForNextPatch();
    expect(pb.hp).toBe(100); expect(pa.mp).toBe(100);
    pb.poisonMs = 3000; pb.poisonDps = 20; pb.poisonAttackerId = a.sessionId;
    room['tick'](.5);
    expect(pb.hp).toBe(100); expect(pb.poisonMs).toBe(0);
    // Control: with identical combat conditions, leaving the group enables PvP.
    room['parties'].leave(b.sessionId);
    a.send(MessageType.UseSkill, { skillId: 'shield_bash' }); await room.waitForNextPatch();
    expect(pb.hp).toBeLessThan(100); expect(pa.mp).toBeLessThan(100);
  });
});
