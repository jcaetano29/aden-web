import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import type { PlayerState } from '../state/PlayerState.js';
import { MessageType, getItem, getNpc, getWorldObject, MINES_COMPLETE, FORGE_COMPLETE, FORGE_ARENA, FORGE_ANVILS } from '@aden/shared';

/** El equipo del catálogo se entrega como instancia: se busca por su id base. */
const owns = (p: PlayerState, id: string) => [...p.inventory.keys()].some(key => key === id || getItem(key).baseId === id);
const killMob = (room: GameRoom, mob: unknown, id: string, killer: string) =>
  (room as unknown as { killMob(m: unknown, id: string, killer: string): void }).killMob(mob, id, killer);

describe('Forge campaign over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2598); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('starts with Brenna, runs the chapter and ends with Dorne paying once', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'ForgeTraveler', className: 'rogue' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    const replies: { success: boolean; text: string }[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    const brenna = getNpc('brenna');
    p.questId = MINES_COMPLETE; p.level = 19; p.mapId = 'minas'; p.x = brenna.x; p.z = brenna.z;
    c.send(MessageType.InteractNpc, { npcId: 'brenna' });
    await vi.waitFor(() => expect(replies.some(r => r.text.includes('nivel 20'))).toBe(true));
    p.level = 20;
    c.send(MessageType.WarpTo, { mapId: 'fragua' });
    await vi.waitFor(() => expect(replies.some(r => r.text.includes('Brenna'))).toBe(true));
    expect(p.mapId).toBe('minas');
    c.send(MessageType.InteractNpc, { npcId: 'brenna' });
    await vi.waitFor(() => expect(p.questId).toBe('f_caldera'));
    c.send(MessageType.WarpTo, { mapId: 'fragua' });
    await vi.waitFor(() => expect(p.questProgress).toBe(1));

    const talk = async (npcId = 'ysolde') => {
      const before = p.questId; const npc = getNpc(npcId); p.mapId = npc.mapId!; p.x = npc.x; p.z = npc.z;
      c.send(MessageType.InteractNpc, { npcId });
      await vi.waitFor(() => expect(p.questId).not.toBe(before));
    };
    const defeat = (template: string, id: string) => {
      p.mapId = 'fragua'; p.x = 1500; p.z = 470; p.moving = false;
      const mob = room.spawnMob(id, template, p.x, p.z, 'fragua');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = id; p.attackCooldownMs = 0;
      room.tick(.05); expect(mob.dead, template).toBe(true);
    };
    const interact = async (id: string) => {
      const o = getWorldObject(id); p.x = o.x; p.z = o.z;
      c.send(MessageType.InteractObject, { objectId: id }); await room.waitForNextPatch();
    };
    await talk(); expect(p.questId).toBe('f_rune_1');
    await interact('forge_rune_1'); expect(p.questId).toBe('f_rune_2');
    await interact('forge_rune_2'); expect(p.questId).toBe('f_rune_3');
    await interact('forge_rune_3'); await talk(); expect(p.questId).toBe('f_imps');
    for (let i = 0; i < 10; i++) defeat('ember_imp', `imp-${i}`);
    await talk(); expect(p.questId).toBe('f_drakes');
    for (let i = 0; i < 6; i++) defeat('young_drake', `drake-${i}`);
    await talk(); expect(p.questId).toBe('f_constructs'); expect(owns(p, 'aden_coraza_de_el_vendaval_gris')).toBe(true);
    for (let i = 0; i < 6; i++) defeat('forge_construct', `construct-${i}`);
    await talk(); expect(p.questId).toBe('f_smelter');
    defeat('primal_smelter', 'smelter'); await talk(); expect(p.questId).toBe('f_anvil_1');
    expect(owns(p, 'ember_dagger')).toBe(true);
    for (const id of FORGE_ANVILS) { await interact(id); expect(room.state.worldObjects.get(id)!.active).toBe(true); }
    expect(p.questProgress).toBe(1); await talk(); expect(p.questId).toBe('f_vharzul');
    defeat('vharzul', 'vharzul');
    await talk('smith'); expect(p.questId).toBe(FORGE_COMPLETE);
    expect(owns(p, 'vharzul_heart')).toBe(true);
    const gold = p.gold;
    c.send(MessageType.InteractNpc, { npcId: 'smith' }); await room.waitForNextPatch();
    expect(p.gold).toBe(gold); expect(p.questId).toBe(FORGE_COMPLETE);
  });

  it('cools anvils during the fight, interrupts the channel with a hot one and restores them afterwards', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'ForgeCooler' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    const replies: { success: boolean; text: string }[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    p.questId = 'f_vharzul'; p.level = 25; p.mapId = 'fragua'; p.maxHp = p.hp = 1e6;
    const boss = room.spawnMob('vharzul-cool', 'vharzul', FORGE_ARENA.x, FORGE_ARENA.z, 'fragua');
    boss.aggroTargetId = c.sessionId; boss.aiState = 'chase';
    const interact = async (id: string) => {
      const o = getWorldObject(id); p.x = o.x; p.z = o.z;
      c.send(MessageType.InteractObject, { objectId: id }); await room.waitForNextPatch();
    };
    await interact('forge_anvil_1');
    const anvil1 = room.state.worldObjects.get('forge_anvil_1')!;
    expect(anvil1.active).toBe(false); expect(anvil1.cooled).toBe(true);
    room.tick(.05); expect(anvil1.active).toBe(false);
    boss.channeling = true; boss.hazardMs = 6000;
    await interact('forge_anvil_2');
    expect(boss.channeling).toBe(false); expect(boss.stunMs).toBe(3000);
    expect(room.state.worldObjects.get('forge_anvil_2')!.active).toBe(false);
    killMob(room, boss, 'vharzul-cool', c.sessionId);
    for (const id of FORGE_ANVILS) { expect(room.state.worldObjects.get(id)!.active, id).toBe(true); expect(room.state.worldObjects.get(id)!.cooled).toBe(false); }
    expect(replies.some(r => r.text.includes('Enfriaste'))).toBe(true);
  });

  it('refuses to cool an anvil from a far lower level', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'ForgeWeak' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    const replies: { success: boolean; text: string }[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    p.questId = 'f_vharzul'; p.level = 18; p.mapId = 'fragua';
    const boss = room.spawnMob('vharzul-weak', 'vharzul', FORGE_ARENA.x, FORGE_ARENA.z, 'fragua');
    boss.aggroTargetId = c.sessionId; boss.aiState = 'chase';
    const o = getWorldObject('forge_anvil_1'); p.x = o.x; p.z = o.z;
    c.send(MessageType.InteractObject, { objectId: 'forge_anvil_1' });
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    expect(replies[0].success).toBe(false);
    expect(room.state.worldObjects.get('forge_anvil_1')!.active).toBe(true);
  });

  it("pays Halden's repeatable contracts and rotates to the next one", async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'ForgeContracts' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    c.onMessage(MessageType.ItemResult, () => {});
    const halden = getNpc('halden_npc'); p.level = 21; p.mapId = 'fragua';
    const talk = async () => { p.x = halden.x; p.z = halden.z; c.send(MessageType.InteractNpc, { npcId: 'halden_npc' }); await room.waitForNextPatch(); };
    await talk(); expect(p.sideChains.get('halden')?.id).toBe('h_imps');
    for (let i = 0; i < 8; i++) {
      p.x = 1500; p.z = 470; p.moving = false;
      const mob = room.spawnMob(`contract-imp-${i}`, 'ember_imp', p.x, p.z, 'fragua');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = `contract-imp-${i}`; p.attackCooldownMs = 0; room.tick(.05);
    }
    expect(p.sideChains.get('halden')?.progress).toBe(8);
    const gold = p.gold;
    await talk(); expect(p.sideChains.get('halden')?.id).toBe('h_drakes'); expect(p.gold).toBe(gold + 300);
  });
});
