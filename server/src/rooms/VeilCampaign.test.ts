import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getNpc, getQuest, getWorldObject, VEIL_COMPLETE } from '@aden/shared';
import { toCharacterSave } from '../persistence/CharacterSave.js';

describe('Veil campaign over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2589); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });
  it('continues an old completed campaign, validates regional delivery and pays once', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'VeilTraveler' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.questId = 'campaign_complete'; p.level = 10; p.mapId = 'pueblo'; p.x = 0; p.z = 0;
    const errors: any[] = []; c.onMessage(MessageType.ItemResult, x => errors.push(x));
    c.send(MessageType.InteractNpc, { npcId: 'elder' });
    await vi.waitFor(() => expect(p.questId).toBe('a2_arrival'));
    const initialGold = p.gold;
    c.send(MessageType.InteractNpc, { npcId: 'maera' });
    await vi.waitFor(() => expect(errors.some(x => x.success === false)).toBe(true));
    expect(p.questId).toBe('a2_arrival'); expect(p.gold).toBe(initialGold);
    c.send(MessageType.WarpTo, { mapId: 'marismas' });
    await vi.waitFor(() => expect(p.questProgress).toBe(1));
    const talk = async () => {
      const before = p.questId; const npc = getNpc('maera'); p.x = npc.x; p.z = npc.z;
      c.send(MessageType.InteractNpc, { npcId: 'maera' });
      await vi.waitFor(() => expect(p.questId).not.toBe(before));
    };
    await talk(); expect(p.questId).toBe('a2_caravan');
    for (const id of ['veil_caravan', 'veil_manifest']) {
      const object = getWorldObject(id); p.x = object.x; p.z = object.z;
      c.send(MessageType.InteractObject, { objectId: id });
      await vi.waitFor(() => expect(p.questProgress).toBe(1));
      expect(room.state.worldObjects.get(id)!.active).toBe(true);
      await talk();
      // The prior clue cannot complete the next distinct objective.
      p.x = object.x; p.z = object.z; c.send(MessageType.InteractObject, { objectId: id });
      await room.waitForNextPatch(); expect(p.questProgress).toBe(0);
    }
    expect(p.questId).toBe('a2_raiders');
    const defeat = (template: string, id: string) => {
      p.x = 1200; p.z = 102; p.moving = false;
      const mob = room.spawnMob(id, template, p.x, p.z, 'marismas');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = id; p.attackCooldownMs = 0;
      room.tick(.05); expect(mob.dead).toBe(true);
    };
    for (let i = 0; i < 4; i++) defeat('veil_raider', `raider-${i}`);
    expect(p.questProgress).toBe(getQuest(p.questId).amount); await talk();
    expect(p.questId).toBe('a2_crossing');
    defeat('veil_guardian', 'guardian');
    expect(p.questProgress).toBe(1); await talk(); expect(p.questId).toBe(VEIL_COMPLETE);
    expect(toCharacterSave(p).questId).toBe(VEIL_COMPLETE);
    const finalGold = p.gold;
    c.send(MessageType.InteractNpc, { npcId: 'maera' });
    await room.waitForNextPatch(); expect(p.gold).toBe(finalGold);
  });

  it('allows supplies near Boren and rejects buying remotely or delivering regional quests to Rowan', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'VeilSupply' });
    room.setSimulationInterval(() => {}, 50);
    const p = room.state.players.get(c.sessionId)!;
    const boren = getNpc('boren'); p.mapId = 'marismas'; p.x = boren.x; p.z = boren.z; p.gold = 1000;
    c.onMessage(MessageType.ItemResult, () => {});
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 });
    await vi.waitFor(() => expect(p.gold).toBeLessThan(1000));
    const gold = p.gold; p.x += 20;
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 });
    await room.waitForNextPatch(); expect(p.gold).toBe(gold);
    p.mapId = 'pueblo'; p.x = 0; p.z = 0; p.questId = 'a2_caravan'; p.questProgress = 1;
    c.send(MessageType.InteractNpc, { npcId: 'elder' });
    await room.waitForNextPatch(); expect(p.questId).toBe('a2_caravan'); expect(p.gold).toBe(gold);
  });
});
