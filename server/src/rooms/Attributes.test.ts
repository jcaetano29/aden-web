import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { MessageType, TRAVEL_COMBAT_LOCK_MS } from '@aden/shared';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { PlayerState } from '../state/PlayerState.js';
import { toCharacterSave } from '../persistence/CharacterSave.js';

describe('legacy attribute redistribution', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2614); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  async function legacy() {
    const room = await server.createRoom('game', {}) as GameRoom;
    await server.connectTo(room, { name: 'StatsObserver' });
    room.setSimulationInterval(() => {}, 1000);
    const source = new PlayerState(); source.className = 'mage'; source.level = 40;
    source.attributes.str = 117;
    const save = toCharacterSave(source);
    delete save.progress.attributeRulesVersion;
    delete save.progress.attributeResetAvailable;
    await room['persistence'].save('LegacyBuild', save);
    const client = await server.connectTo(room, { name: 'LegacyBuild' });
    return { room, client, player: room.state.players.get(client.sessionId)! };
  }

  it('preserva la inversión anterior y ofrece una sola redistribución que persiste entre sesiones', async () => {
    const { room, client, player } = await legacy();
    expect(player.attributes.str).toBe(117);
    expect(player.attributes.statPoints).toBe(0);
    expect(player.attributes.resetAvailable).toBe(true);
    await client.leave(); await room.waitForNextPatch();
    const returned = await server.connectTo(room, { name: 'LegacyBuild' });
    const p = room.state.players.get(returned.sessionId)!;
    expect(p.attributes.resetAvailable).toBe(true);
    const replies: { success: boolean }[] = [];
    returned.onMessage(MessageType.ItemResult, m => replies.push(m));
    returned.send('resetAttributes', {});
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    expect(replies[0].success).toBe(true);
    expect(p.attributes).toMatchObject({ str: 0, agi: 0, vit: 0, ene: 0, statPoints: 117, resetAvailable: false });
    returned.send(MessageType.AllocateStat, { attr: 'ene' });
    await vi.waitFor(() => expect(p.attributes.ene).toBe(1));
    returned.send('resetAttributes', {});
    await vi.waitFor(() => expect(replies).toHaveLength(2));
    expect(replies[1].success).toBe(false);
    expect(p.attributes.statPoints).toBe(116);
    await returned.leave(); await room.waitForNextPatch();
    const again = await server.connectTo(room, { name: 'LegacyBuild' });
    expect(room.state.players.get(again.sessionId)!.attributes).toMatchObject({ ene: 1, statPoints: 116, resetAvailable: false });
  });

  it('rechaza la redistribución fuera del pueblo, en combate o estando muerto sin consumirla', async () => {
    const { client, player: p } = await legacy();
    const replies: { success: boolean }[] = [];
    client.onMessage(MessageType.ItemResult, m => replies.push(m));
    for (const [i, blocked] of [
      { mapId: 'bosque', dead: false, msSinceCombat: 100000 },
      { mapId: 'pueblo', dead: false, msSinceCombat: TRAVEL_COMBAT_LOCK_MS - 1 },
      { mapId: 'pueblo', dead: true, msSinceCombat: 100000 },
    ].entries()) {
      Object.assign(p, blocked);
      client.send('resetAttributes', {});
      await vi.waitFor(() => expect(replies).toHaveLength(i + 1));
      expect(replies[i].success).toBe(false);
      expect(p.attributes.str).toBe(117);
      expect(p.attributes.resetAvailable).toBe(true);
    }
  });

  it('no concede reinicios a personajes nuevos al guardar y volver a conectar', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    await server.connectTo(room, { name: 'NewObserver' });
    const c = await server.connectTo(room, { name: 'NewBuild', className: 'mage' });
    const p = room.state.players.get(c.sessionId)!;
    p.level = 2; p.attributes.ene = 3;
    await c.leave(); await room.waitForNextPatch();
    const returned = await server.connectTo(room, { name: 'NewBuild' });
    expect(room.state.players.get(returned.sessionId)!.attributes.resetAvailable).toBe(false);
  });
});
