import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { getNpc, getWorldObject, getItem, MessageType, MEMORY_COMPLETE } from '@aden/shared';
import { toCharacterSave } from '../persistence/CharacterSave.js';

describe('Monastery campaign', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2591); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('validates the route, advances distinct clues in order and rewards the finale once', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MemoryTraveler' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!; p.level = 15; p.gold = 1000;
    const replies: any[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    c.send(MessageType.WarpTo, { mapId: 'monasterio' });
    await vi.waitFor(() => expect(replies.some(m => !m.success)).toBe(true));
    expect(p.mapId).toBe('pueblo');
    const talk = async (npcId: string) => {
      const before = p.questId, npc = getNpc(npcId);
      p.mapId = npc.mapId!; p.x = npc.x; p.z = npc.z;
      c.send(MessageType.InteractNpc, { npcId });
      await vi.waitFor(() => expect(p.questId).not.toBe(before));
    };
    p.questId = 'veil_prologue_complete'; await talk('maera'); expect(p.questId).toBe('a2_monastery');
    c.send(MessageType.WarpTo, { mapId: 'monasterio' });
    await vi.waitFor(() => expect(p.questProgress).toBe(1)); await talk('iria');
    const interact = async (id: string) => {
      const object = getWorldObject(id); p.x = object.x; p.z = object.z;
      c.send(MessageType.InteractObject, { objectId: id }); await room.waitForNextPatch();
    };
    await interact('monastery_archive_2'); expect(p.questId).toBe('a2_archive'); expect(p.questProgress).toBe(0);
    await interact('monastery_archive_1'); await vi.waitFor(() => expect(p.questId).toBe('a2_testimony'));
    await interact('monastery_archive_1'); expect(p.questProgress).toBe(0);
    await interact('monastery_archive_2'); expect(p.questProgress).toBe(1); await talk('iria');
    for (const id of ['monastery_cell_1','monastery_cell_2','monastery_cell_3']) await interact(id);
    expect(p.questId).toBe('a2_cell_3'); expect(p.questProgress).toBe(1); await talk('iria');
    const defeat = (template: string) => {
      const mob = room.spawnMob(template, template, p.x, p.z, 'monasterio');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = template; p.attackCooldownMs = 0;
      room.tick(.05); expect(mob.dead).toBe(true);
    };
    defeat('memory_jailer'); expect(p.questProgress).toBe(1); await talk('iria');
    await interact('monastery_anchor_1'); expect(p.questId).toBe('a2_anchor_2');
    await interact('monastery_anchor_2'); expect(p.questProgress).toBe(1); await talk('iria');
    expect(p.questId).toBe('a2_prior'); defeat('memory_prior'); await talk('iria');
    expect(p.questId).toBe(MEMORY_COMPLETE); expect(toCharacterSave(p).questId).toBe(MEMORY_COMPLETE);
    expect([...p.inventory.values()].filter(item => getItem(item.itemTemplateId).name === 'Relicario de los Nombres')).toHaveLength(1);
    const gold = p.gold; c.send(MessageType.InteractNpc, { npcId: 'iria' }); await room.waitForNextPatch(); expect(p.gold).toBe(gold);
  });

  it('interrupts the Prior channel through an anchor without bypassing the level boundary', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MemoryInterrupt' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'monasterio'; p.questId = 'a2_prior'; p.level = 9; p.x = 1188; p.z = 407;
    const boss = room.spawnMob('prior', 'memory_prior', 1200, 401, 'monasterio');
    boss.channeling = true; boss.hazardMs = 6000; boss.aggroTargetId = c.sessionId;
    room.tick(.05); expect(boss.x).toBe(1200); expect(boss.z).toBe(401);
    const replies: any[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    c.send(MessageType.InteractObject, { objectId: 'monastery_anchor_1' });
    await vi.waitFor(() => expect(replies).toHaveLength(1)); expect(boss.channeling).toBe(true);
    p.level = 15; c.send(MessageType.InteractObject, { objectId: 'monastery_anchor_1' });
    await vi.waitFor(() => expect(boss.channeling).toBe(false)); expect(boss.hazardMs).toBe(0); expect(boss.stunMs).toBe(3000);
  });
});
