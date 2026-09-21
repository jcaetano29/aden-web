import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import appConfig from '../testServer.js';
import type { GameRoom } from './GameRoom.js';

describe('chat delivery over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(appConfig, 2582); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  async function setup() {
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 50);
    const clients = await Promise.all(['Ana', 'Beto', 'Ciro', 'Dora'].map(name => server.connectTo(room, { name })));
    const messages = clients.map(() => [] as any[]);
    const errors = clients.map(() => [] as any[]);
    clients.forEach((client, i) => {
      client.onMessage('chatMessage', data => messages[i].push(data));
      client.onMessage('chatError', data => errors[i].push(data));
    });
    await room.waitForNextPatch();
    const players = clients.map(client => room.state.players.get(client.sessionId)!);
    players.forEach(player => { player.x = 0; player.z = 0; player.mapId = 'pueblo'; });
    return { room, clients, messages, errors, players };
  }

  it('delivers proximity chat only in the same map within a circular inclusive radius', async () => {
    const { room, clients, messages, players } = await setup();
    players[1].x = 15; players[1].z = 20; // Exactly 25 units.
    players[2].x = 20; players[2].z = 20; // Outside circle, inside bounding square.
    players[3].mapId = 'bosque';
    clients[0].send('chatSend', { channel: 'local', text: '  Hola\n vecinos  ', senderName: 'Admin', x: 1000, mapId: 'bosque' });
    await vi.waitFor(() => expect(messages[0]).toHaveLength(1));
    await room.waitForNextPatch();
    expect(messages[0][0]).toMatchObject({ channel: 'local', text: 'Hola vecinos', senderName: 'Ana', senderId: clients[0].sessionId, mapId: 'pueblo' });
    expect(messages[1]).toEqual(messages[0]);
    expect(messages[2]).toEqual([]);
    expect(messages[3]).toEqual([]);
  });

  it('delivers Global once to everyone, including another map and another game room', async () => {
    const { room, clients, messages, players } = await setup();
    players[1].x = 900; players[2].mapId = 'cripta';
    const other = await server.createRoom('game', {}) as GameRoom;
    other.setSimulationInterval(() => {}, 50);
    const remote = await server.connectTo(other, { name: 'Eva' });
    const remoteMessages: any[] = [];
    remote.onMessage('chatMessage', data => remoteMessages.push(data));
    clients[0].send('chatSend', { channel: 'global', text: 'Busco grupo' });
    await vi.waitFor(() => expect(remoteMessages).toHaveLength(1));
    await room.waitForNextPatch();
    messages.forEach(inbox => expect(inbox).toEqual(remoteMessages));
  });

  it('rejects spam privately without blocking another player', async () => {
    const { clients, messages, errors } = await setup();
    clients[0].send('chatSend', { channel: 'global', text: 'Primero' });
    clients[0].send('chatSend', { channel: 'local', text: 'Spam' });
    await vi.waitFor(() => expect(errors[0]).toHaveLength(1));
    expect(errors[0][0].code).toBe('rate_limited');
    clients[1].send('chatSend', { channel: 'local', text: 'Respuesta' });
    await vi.waitFor(() => expect(messages[0]).toHaveLength(2));
    expect(messages[0].map(message => message.text)).toEqual(['Primero', 'Respuesta']);
    errors.slice(1).forEach(inbox => expect(inbox).toEqual([]));
  });

  it('rejects malformed requests and accepts the next valid message', async () => {
    const { clients, messages, errors, room } = await setup();
    const bad = [null, {}, { channel: 'admin', text: 'Hola' }, { channel: 'global', text: 2 }, { channel: 'local', text: ' \n\u200b ' }, { channel: 'local', text: 'a'.repeat(241) }];
    for (const data of bad) clients[0].send('chatSend', data);
    await vi.waitFor(() => expect(errors[0]).toHaveLength(bad.length));
    messages.forEach(inbox => expect(inbox).toEqual([]));
    clients[0].send('chatSend', { channel: 'local', text: '¡Hola, señor! 🧙' });
    await vi.waitFor(() => expect(messages[1]).toHaveLength(1));
    await room.waitForNextPatch();
    expect(messages[1][0].text).toBe('¡Hola, señor! 🧙');
  });
});
