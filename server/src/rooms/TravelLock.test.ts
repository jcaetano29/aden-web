import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, TRAVEL_COMBAT_LOCK_MS } from '@aden/shared';

describe('travel lock', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2595); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('blocks M travel and the return seal right after combat', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'TravelLocked' });
    room.setSimulationInterval(() => {}, 1000);
    const p = room.state.players.get(c.sessionId)!;
    p.level = 10; p.mapId = 'bosque'; p.x = p.targetX = 300; p.z = p.targetZ = 40; p.msSinceCombat = 1000;
    const replies: { success: boolean; text: string }[] = [];
    c.onMessage(MessageType.ItemResult, m => replies.push(m));
    c.send(MessageType.WarpTo, { mapId: 'pueblo' });
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    expect(replies[0]).toEqual({ success: false, text: 'Estás en combate: podés viajar en 4 s.' });
    expect(p.mapId).toBe('bosque');

    (room as unknown as { addToInventory(p: unknown, id: string, qty: number): void }).addToInventory(p, 'aden_sello_de_retorno', 1);
    c.send(MessageType.UseItem, { itemTemplateId: 'aden_sello_de_retorno' });
    await vi.waitFor(() => expect(replies).toHaveLength(2));
    expect(replies[1].success).toBe(false);
    expect(p.inventory.get('aden_sello_de_retorno')?.qty).toBe(1);

    p.msSinceCombat = TRAVEL_COMBAT_LOCK_MS;
    c.send(MessageType.WarpTo, { mapId: 'pueblo' });
    await vi.waitFor(() => expect(p.mapId).toBe('pueblo'));
  });
});
