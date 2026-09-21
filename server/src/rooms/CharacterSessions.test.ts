import type { Client } from 'colyseus';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { toCharacterSave } from '../persistence/CharacterSave.js';
import { PlayerState } from '../state/PlayerState.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import appConfig from '../testServer.js';
import { InMemoryPersistence } from '../persistence/PersistenceService.js';
import type { CharacterSave } from '../persistence/CharacterSave.js';
import type { GameRoom } from './GameRoom.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}

describe('character sessions', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(appConfig, 2595); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('commits the final gold after an older delayed autosave', async () => {
    const first = deferred();
    const started: number[] = [], committed: number[] = [];
    class DelayedBackend extends InMemoryPersistence {
      override async save(name: string, snapshot: CharacterSave) {
        started.push(snapshot.gold);
        if (snapshot.gold === 10) await first.promise;
        await super.save(name, snapshot);
        committed.push(snapshot.gold);
      }
    }
    const backend = new DelayedBackend();
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 50);
    room['persistence'] = backend;
    const client = await server.connectTo(room, { name: 'Ordered' });
    const player = room.state.players.get(client.sessionId)!;
    player.gold = 10;
    await room['saveAll']();
    player.gold = 20;
    const leaving = room.onLeave(room.clients.find(c => c.sessionId === client.sessionId)!);
    try {
      expect(started).toEqual([10]);
      expect(committed).toEqual([]);
      expect(room.state.players.has(client.sessionId)).toBe(false);
    } finally {
      first.resolve();
      await leaving;
    }
    expect(committed).toEqual([10, 20]);
    expect((await backend.load('Ordered'))!.gold).toBe(20);
  });
});

// These tests drive real Colyseus clients; only storage latency/failure is controlled.

class ControlledBackend extends InMemoryPersistence {
  beforeLoad?: (name: string) => Promise<void>;
  beforeAccountLoad?: (name: string) => Promise<void>;
  beforeAccountSave?: (name: string) => Promise<void>;
  beforeSave?: (name: string, data: CharacterSave) => Promise<void>;
  override async load(name: string) { await this.beforeLoad?.(name); return super.load(name); }
  override async loadAccount(name: string) { await this.beforeAccountLoad?.(name); return super.loadAccount(name); }
  override async saveAccount(account: Parameters<InMemoryPersistence['saveAccount']>[0]) { await this.beforeAccountSave?.(account.name); return super.saveAccount(account); }
  override async save(name: string, data: CharacterSave) { await this.beforeSave?.(name, data); return super.save(name, data); }
}

describe('real Colyseus character ownership', () => {
  let server: ColyseusTestServer;
  let backend: ControlledBackend;
  beforeAll(async () => { server = await boot(appConfig, 2596); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(() => {
    backend = new ControlledBackend();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(async () => { await server.cleanup(); vi.restoreAllMocks(); });
  async function room() {
    const result = await server.createRoom('game', {}) as GameRoom;
    result.autoDispose = false;
    result.setSimulationInterval(() => {}, 50);
    result['persistence'] = backend;
    return result;
  }
  async function account(name: string) {
    const { hash, salt } = hashPassword('secret');
    await backend.saveAccount({ name, passwordHash: hash, passwordSalt: salt });
  }
  const login = (name: string) => ({ name, password: 'secret', mode: 'login' });

  it.each([false, true])('reserves concurrent logins before load (second room: %s)', async secondRoom => {
    await account('Exclusive');
    const a = await room(), b = secondRoom ? await room() : a;
    const entered = deferred(), gate = deferred();
    backend.beforeLoad = async name => { if (name === 'Exclusive') { entered.resolve(); await gate.promise; } };
    const first = server.connectTo(a, login('Exclusive'));
    await entered.promise;
    backend.beforeLoad = undefined;
    try {
      await expect(server.connectTo(b, login('Exclusive'))).rejects.toThrow(/sesión/i);
      const other = await server.connectTo(b, { name: 'Independent' });
      expect(b.state.players.get(other.sessionId)!.name).toBe('Independent');
    } finally { gate.resolve(); await first; }
    expect([...a.state.players.values()].filter(p => p.name === 'Exclusive')).toHaveLength(1);
  });

  it('prevents simultaneous account creation from replacing the first password', async () => {
    const a = await room(), b = await room();
    const entered = deferred(), gate = deferred();
    backend.beforeAccountSave = async () => { entered.resolve(); await gate.promise; };
    const first = server.connectTo(a, { name: 'Created', password: 'first-pass', mode: 'create' });
    await entered.promise;
    backend.beforeAccountSave = undefined;
    try {
      await expect(server.connectTo(b, { name: 'Created', password: 'second-pass', mode: 'create' })).rejects.toThrow(/sesión/i);
    } finally { gate.resolve(); await first; }
    const saved = (await backend.loadAccount('Created'))!;
    expect(verifyPassword('first-pass', saved.passwordHash, saved.passwordSalt)).toBe(true);
    expect(verifyPassword('second-pass', saved.passwordHash, saved.passwordSalt)).toBe(false);
  });

  it('uses the authenticated trimmed name for ownership, player state and saves', async () => {
    await account('Canonical');
    const a = await room(), b = await room();
    const client = await server.connectTo(a, login('  Canonical  '));
    const player = a.state.players.get(client.sessionId)!;
    expect(player.name).toBe('Canonical');
    player.gold = 321;
    await expect(server.connectTo(b, login('Canonical'))).rejects.toThrow(/sesión/i);
    await client.leave();
    await vi.waitFor(async () => expect((await backend.load('Canonical'))?.gold).toBe(321));
    expect(await backend.load('  Canonical  ')).toBeNull();
  });

  it.each(['password', 'accountLoad', 'accountSave', 'characterLoad'])('releases ownership after %s failure', async failure => {
    const a = await room();
    if (failure !== 'accountSave') await account('RetryAuth');
    const offline = async () => { throw new Error('offline'); };
    if (failure === 'accountLoad') backend.beforeAccountLoad = offline;
    if (failure === 'accountSave') backend.beforeAccountSave = offline;
    if (failure === 'characterLoad') backend.beforeLoad = offline;
    await expect(server.connectTo(a, { name: 'RetryAuth', password: failure === 'password' ? 'wrong' : 'secret', mode: failure === 'accountSave' ? 'create' : 'login' })).rejects.toThrow();
    backend.beforeAccountLoad = backend.beforeAccountSave = backend.beforeLoad = undefined;
    const client = await server.connectTo(a, { name: 'RetryAuth', password: 'secret', mode: failure === 'accountSave' ? 'create' : 'login' });
    expect(a.state.players.has(client.sessionId)).toBe(true);
  });

  it.each(['load', 'saveAccount'])('holds the reservation until %s settles after a real socket closes', async operation => {
    const a = await room(), b = await room();
    if (operation === 'load') await account('Aborted');
    const entered = deferred(), gate = deferred(), authDone = deferred();
    const block = async () => { entered.resolve(); await gate.promise; };
    if (operation === 'load') backend.beforeLoad = block;
    else backend.beforeAccountSave = block;
    let authenticating!: Client;
    const original = a.onAuth.bind(a);
    vi.spyOn(a, 'onAuth').mockImplementation(async (client, options) => {
      authenticating = client;
      try { return await original(client, options); } finally { authDone.resolve(); }
    });
    const first = server.connectTo(a, { name: 'Aborted', password: 'secret', mode: operation === 'load' ? 'login' : 'create' }).catch(error => error);
    await entered.promise;
    const closed = new Promise<void>(resolve => authenticating.ref.once('close', () => resolve()));
    authenticating.leave();
    await closed;
    try {
      await expect(server.connectTo(b, login('Aborted'))).rejects.toThrow(/sesión/i);
    } finally { gate.resolve(); await authDone.promise; await first; }
    expect(a.state.players.size).toBe(0);
    backend.beforeLoad = backend.beforeAccountSave = undefined;
    const returned = await server.connectTo(b, login('Aborted'));
    expect(b.state.players.has(returned.sessionId)).toBe(true);
    if (operation === 'saveAccount') {
      const saved = (await backend.loadAccount('Aborted'))!;
      expect(verifyPassword('secret', saved.passwordHash, saved.passwordSalt)).toBe(true);
    }
  });

  it('blocks reentry during final save then restores the final progress', async () => {
    const a = await room(), b = await room();
    const client = await server.connectTo(a, { name: 'Returning' });
    a.state.players.get(client.sessionId)!.gold = 654;
    const entered = deferred(), gate = deferred();
    backend.beforeSave = async () => { entered.resolve(); await gate.promise; };
    const left = client.leave();
    await entered.promise;
    try {
      expect(a.state.players.has(client.sessionId)).toBe(false);
      await expect(server.connectTo(b, { name: 'Returning' })).rejects.toThrow(/sesión/i);
    } finally { gate.resolve(); await left; }
    await vi.waitFor(async () => expect((await backend.load('Returning'))?.gold).toBe(654));
    backend.beforeSave = undefined;
    const returned = await server.connectTo(b, { name: 'Returning' });
    expect(b.state.players.get(returned.sessionId)!.gold).toBe(654);
  });

  it('retains a failed final snapshot across room disposal and retries before loading', async () => {
    const a = await room();
    const initial = toCharacterSave(new PlayerState());
    initial.gold = 10;
    await backend.save('Pending', initial);
    const client = await server.connectTo(a, { name: 'Pending' });
    a.state.players.get(client.sessionId)!.gold = 987;
    backend.beforeSave = async () => { throw new Error('offline'); };
    await a.disconnect();
    expect((await backend.load('Pending'))!.gold).toBe(10);
    const b = await room();
    await expect(server.connectTo(b, { name: 'Pending' })).rejects.toThrow(/servicio de guardado/i);
    expect(b.state.players.size).toBe(0);
    backend.beforeSave = undefined;
    const returned = await server.connectTo(b, { name: 'Pending' });
    expect(b.state.players.get(returned.sessionId)!.gold).toBe(987);
    expect((await backend.load('Pending'))!.gold).toBe(987);
  });

  it('dispose waits for an in-flight final write before permitting another room to load', async () => {
    const a = await room(), b = await room();
    const client = await server.connectTo(a, { name: 'Disposing' });
    a.state.players.get(client.sessionId)!.gold = 777;
    const entered = deferred(), gate = deferred();
    backend.beforeSave = async () => { entered.resolve(); await gate.promise; };
    const disposal = a.onDispose();
    await Promise.race([entered.promise, disposal.then(() => { throw new Error('Disposed without saving the live character'); })]);
    try {
      expect(a.state.players.size).toBe(0);
      await expect(server.connectTo(b, { name: 'Disposing' })).rejects.toThrow(/sesión/i);
    } finally { gate.resolve(); await disposal; }
    backend.beforeSave = undefined;
    const returned = await server.connectTo(b, { name: 'Disposing' });
    expect(b.state.players.get(returned.sessionId)!.gold).toBe(777);
  });
  it('cleans up a socket closed after authentication succeeds but before Colyseus joins', async () => {
    const a = await room(), b = await room();
    await account('AuthGap');
    const original = a.onAuth.bind(a);
    vi.spyOn(a, 'onAuth').mockImplementation(async (client, options) => {
      const auth = await original(client, options);
      const closed = new Promise<void>(resolve => client.ref.once('close', () => resolve()));
      client.leave();
      await closed;
      return auth;
    });
    await expect(server.connectTo(a, login('AuthGap'))).rejects.toThrow();
    expect(a.state.players.size).toBe(0);
    const returned = await server.connectTo(b, login('AuthGap'));
    expect(b.state.players.has(returned.sessionId)).toBe(true);
  });

  it('dispose holds an authenticating account mutation until settlement', async () => {
    const a = await room(), b = await room();
    const entered = deferred(), gate = deferred();
    backend.beforeAccountSave = async () => { entered.resolve(); await gate.promise; };
    const attempt = server.connectTo(a, { name: 'AuthDispose', password: 'secret', mode: 'create' }).catch(error => error);
    await entered.promise;
    const disposal = a.onDispose();
    try {
      await expect(server.connectTo(b, login('AuthDispose'))).rejects.toThrow(/sesión/i);
    } finally { gate.resolve(); await disposal; await attempt; }
    expect(a.state.players.size).toBe(0);
    backend.beforeAccountSave = undefined;
    const returned = await server.connectTo(b, login('AuthDispose'));
    expect(b.state.players.has(returned.sessionId)).toBe(true);
    const saved = (await backend.loadAccount('AuthDispose'))!;
    expect(verifyPassword('secret', saved.passwordHash, saved.passwordSalt)).toBe(true);
  });
});
