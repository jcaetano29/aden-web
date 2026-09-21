import { CharacterPersistenceCoordinator } from './CharacterPersistenceCoordinator.js';
import { describe, expect, it } from 'vitest';
import { InMemoryPersistence } from './PersistenceService.js';
import { toCharacterSave } from './CharacterSave.js';
import { PlayerState } from '../state/PlayerState.js';

describe('character snapshots', () => {
  it('isolates learned tomes from mutations after saving and loading', async () => {
    const backend = new InMemoryPersistence();
    const snapshot = toCharacterSave(new PlayerState());
    snapshot.inventory = { potion: 2 };
    snapshot.progress.learnedTomes = ['tome_a'];
    await backend.save('Snapshot', snapshot);
    snapshot.inventory.potion = 99;
    snapshot.progress.learnedTomes.push('tome_b');
    const loaded = (await backend.load('Snapshot'))!;
    expect(loaded.inventory).toEqual({ potion: 2 });
    expect(loaded.progress.learnedTomes).toEqual(['tome_a']);
    loaded.progress.learnedTomes!.push('tome_c');
    expect((await backend.load('Snapshot'))!.progress.learnedTomes).toEqual(['tome_a']);
  });
});



function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}
const snapshot = (gold: number) => ({ ...toCharacterSave(new PlayerState()), gold });

describe('character persistence coordinator', () => {
  it('orders committed snapshots and copies every mutable field at enqueue time', async () => {
    const coordinator = new CharacterPersistenceCoordinator();
    const lease = coordinator.acquire('Hero');
    const gate = deferred();
    const backend = new InMemoryPersistence();
    const started: number[] = [], committed: number[] = [];
    const writer = async (name: string, data: ReturnType<typeof snapshot>) => {
      started.push(data.gold);
      if (data.gold === 10) await gate.promise;
      await backend.save(name, data);
      committed.push(data.gold);
    };
    const first = coordinator.save(lease, snapshot(10), writer);
    const latest = snapshot(20);
    latest.inventory = { potion: 2 };
    latest.equipment = { weapon: 'sword' };
    latest.progress.achievements = ['first'];
    latest.progress.learnedTomes = ['tome_a'];
    const final = coordinator.save(lease, latest, writer);
    latest.inventory.potion = 99;
    latest.equipment.weapon = 'axe';
    latest.progress.achievements.push('second');
    latest.progress.learnedTomes.push('tome_b');
    expect(started).toEqual([10]);
    expect(committed).toEqual([]);
    gate.resolve();
    await Promise.all([first, final]);
    expect(committed).toEqual([10, 20]);
    expect(await backend.load('Hero')).toMatchObject({ gold: 20, inventory: { potion: 2 }, equipment: { weapon: 'sword' }, progress: { achievements: ['first'], learnedTomes: ['tome_a'] } });
    await coordinator.release(lease);
  });

  it('retains the newest failed snapshot and retries using its original writer', async () => {
    const coordinator = new CharacterPersistenceCoordinator();
    const backend = new InMemoryPersistence();
    let failing = true;
    const writer = async (name: string, data: ReturnType<typeof snapshot>) => {
      if (failing) throw new Error('offline');
      await backend.save(name, data);
    };
    const lease = coordinator.acquire('Hero');
    await expect(coordinator.save(lease, snapshot(10), writer)).rejects.toThrow('offline');
    await expect(coordinator.save(lease, snapshot(20), writer)).rejects.toThrow('offline');
    await coordinator.release(lease);
    const retryLease = coordinator.acquire('Hero');
    await expect(coordinator.retry(retryLease)).rejects.toThrow('offline');
    await coordinator.release(retryLease);
    failing = false;
    const recovered = coordinator.acquire('Hero');
    await coordinator.retry(recovered);
    expect((await backend.load('Hero'))!.gold).toBe(20);
    await coordinator.release(recovered);
  });

  it('keeps ownership through release, permits other names, and ignores old releases', async () => {
    const coordinator = new CharacterPersistenceCoordinator();
    const old = coordinator.acquire('Hero');
    const gate = deferred();
    const saving = coordinator.save(old, snapshot(10), async () => gate.promise);
    const releasing = coordinator.release(old);
    expect(() => coordinator.acquire('Hero')).toThrow(/sesión/i);
    const other = coordinator.acquire('Other');
    const backend = new InMemoryPersistence();
    await coordinator.save(other, snapshot(30), backend.save.bind(backend));
    expect((await backend.load('Other'))!.gold).toBe(30);
    gate.resolve();
    await Promise.all([saving, releasing]);
    const current = coordinator.acquire('Hero');
    await coordinator.release(old);
    expect(() => coordinator.acquire('Hero')).toThrow(/sesión/i);
    await expect(coordinator.save(old, snapshot(99), backend.save.bind(backend))).rejects.toThrow();
    await coordinator.release(current);
    await coordinator.release(other);
  });

  it('does not let an older rejection replace the newest pending progress', async () => {
    const coordinator = new CharacterPersistenceCoordinator();
    const lease = coordinator.acquire('Hero');
    const gate = deferred();
    let fail = true;
    const backend = new InMemoryPersistence();
    const writer = async (name: string, data: ReturnType<typeof snapshot>) => {
      if (data.gold === 10) await gate.promise;
      if (fail) throw new Error('offline');
      await backend.save(name, data);
    };
    const first = coordinator.save(lease, snapshot(10), writer).catch(() => {});
    const final = coordinator.save(lease, snapshot(20), writer).catch(() => {});
    gate.resolve();
    await Promise.all([first, final]);
    await coordinator.release(lease);
    fail = false;
    const next = coordinator.acquire('Hero');
    await coordinator.retry(next);
    expect((await backend.load('Hero'))!.gold).toBe(20);
    await coordinator.release(next);
  });
});
