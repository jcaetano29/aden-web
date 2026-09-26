import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getItem, getNpc, getQuest, getWorldObject, MEMORY_COMPLETE, MINES_COMPLETE, questReward } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';

/** El equipo del catálogo se entrega como instancia: se busca por su id base. */
const owns = (p: PlayerState, id: string) => [...p.inventory.keys()].some(key => key === id || getItem(key).baseId === id);

describe('Mines campaign over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2597); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('starts with Dorne, gates the map and runs the chapter to Halden paying once', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesTraveler', className: 'rogue' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    const replies: { success: boolean; text: string }[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    p.questId = MEMORY_COMPLETE; p.level = 14; p.mapId = 'pueblo'; p.x = 0; p.z = 0;
    c.send(MessageType.WarpTo, { mapId: 'minas' });
    await room.waitForNextPatch();
    expect(p.mapId).toBe('pueblo');
    c.send(MessageType.InteractNpc, { npcId: 'smith' });
    await vi.waitFor(() => expect(replies.some(r => r.text.includes('nivel 15'))).toBe(true));
    expect(p.questId).toBe(MEMORY_COMPLETE);
    p.level = 15;
    c.send(MessageType.WarpTo, { mapId: 'minas' });
    await vi.waitFor(() => expect(replies.some(r => r.text.includes('Dorne'))).toBe(true));
    expect(p.mapId).toBe('pueblo');
    c.send(MessageType.InteractNpc, { npcId: 'smith' });
    await vi.waitFor(() => expect(p.questId).toBe('f_arrival'));
    c.send(MessageType.WarpTo, { mapId: 'minas' });
    await vi.waitFor(() => expect(p.questProgress).toBe(1));
    expect(p.mapId).toBe('minas');

    const talk = async () => {
      const before = p.questId; const npc = getNpc('brenna'); p.x = npc.x; p.z = npc.z;
      c.send(MessageType.InteractNpc, { npcId: 'brenna' });
      await vi.waitFor(() => expect(p.questId).not.toBe(before));
    };
    const defeat = (template: string, id: string) => {
      p.x = 1500; p.z = 160; p.moving = false;
      const mob = room.spawnMob(id, template, p.x, p.z, 'minas');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = id; p.attackCooldownMs = 0;
      room.tick(.05); expect(mob.dead, template).toBe(true);
    };
    const interact = async (id: string) => {
      const o = getWorldObject(id); p.x = o.x; p.z = o.z;
      c.send(MessageType.InteractObject, { objectId: id }); await room.waitForNextPatch();
    };
    await talk(); expect(p.questId).toBe('f_diggers');
    for (let i = 0; i < 8; i++) defeat('mine_digger', `digger-${i}`);
    await talk(); expect(p.questId).toBe('f_mark_1');
    await interact('mines_mark_2'); expect(p.questId).toBe('f_mark_1');
    await interact('mines_mark_1'); expect(p.questId).toBe('f_mark_2');
    await interact('mines_mark_2'); expect(p.questProgress).toBe(1);
    await talk(); expect(p.questId).toBe('f_armors'); expect(owns(p, 'aden_escudo_de_los_sepultados')).toBe(true);
    for (let i = 0; i < 8; i++) defeat('mine_armor', `armor-${i}`);
    await talk(); expect(p.questId).toBe('f_lift');
    await interact('mines_lift'); await talk(); expect(p.questId).toBe('f_trolls');
    for (let i = 0; i < 6; i++) defeat('cave_troll', `troll-${i}`);
    await talk(); expect(p.questId).toBe('f_foreman');
    // Halden todavía no se puede pelear.
    p.x = 1500; p.z = 100; const early = room.spawnMob('halden-early', 'halden', 1500, 100, 'minas'); early.stunMs = 10000;
    p.targetId = 'halden-early'; p.attackCooldownMs = 0; room.tick(.05); expect(early.hp).toBe(early.maxHp);
    room.state.mobs.clear();
    defeat('mine_foreman', 'foreman'); await talk(); expect(p.questId).toBe('f_halden');
    expect(owns(p, questReward(getQuest('f_foreman'), 'rogue')!)).toBe(true);
    defeat('halden', 'halden'); await talk(); expect(p.questId).toBe(MINES_COMPLETE);
    expect(owns(p, 'black_iron_fang')).toBe(true);
    const gold = p.gold;
    c.send(MessageType.InteractNpc, { npcId: 'brenna' }); await room.waitForNextPatch();
    expect(p.gold).toBe(gold); expect(p.questId).toBe(MINES_COMPLETE);
  });

  it('runs Tobías errands and sells supplies only near his post', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesErrands' });
    room.setSimulationInterval(() => {}, 50);
    const p = room.state.players.get(c.sessionId)!;
    const tobias = getNpc('tobias'); p.level = 15; p.mapId = 'minas'; p.x = tobias.x; p.z = tobias.z; p.gold = 1000;
    c.onMessage(MessageType.ItemResult, () => {});
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 });
    await vi.waitFor(() => expect(p.gold).toBeLessThan(1000));
    const gold = p.gold; p.x += 20;
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 }); await room.waitForNextPatch();
    expect(p.gold).toBe(gold);
    const talk = async () => { p.x = tobias.x; p.z = tobias.z; c.send(MessageType.InteractNpc, { npcId: 'tobias' }); await room.waitForNextPatch(); };
    await talk(); expect(p.sideChains.get('tobias')?.id).toBe('t_supplies');
    const crate = getWorldObject('tobias_crate'); p.x = crate.x; p.z = crate.z;
    c.send(MessageType.InteractObject, { objectId: 'tobias_crate' }); await room.waitForNextPatch();
    expect(p.sideChains.get('tobias')?.progress).toBe(1);
    await talk(); expect(p.sideChains.get('tobias')?.id).toBe('t_diary'); expect(p.inventory.get('greater_potion')?.qty).toBe(3);
  });

  it('announces a respawning boss by its own name and map', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesHerald' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const texts: string[] = []; c.onMessage(MessageType.WorldAnnounce, (m: { text: string }) => texts.push(m.text));
    const boss = room.spawnMob('halden-respawn', 'halden', 1500, 97, 'minas');
    boss.dead = true; boss.respawnMs = 1; room.tick(.05);
    await vi.waitFor(() => expect(texts.some(t => t.includes('Maestro Halden') && t.includes('Minas de Hierro Negro'))).toBe(true));
  });
});
