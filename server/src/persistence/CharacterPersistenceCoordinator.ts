import { cloneCharacterSave, type CharacterSave } from './CharacterSave.js';

type Writer = (name: string, data: CharacterSave) => Promise<void>;
/** Identity is canonicalized by authentication; the token belongs to one connection. */
export interface CharacterLease { readonly name: string; readonly token: symbol; }
interface PendingSave { snapshot: CharacterSave; writer: Writer; }
interface Entry {
  owner?: CharacterLease;
  closing?: boolean;
  tail?: Promise<void>;
  pending?: PendingSave;
}

/** Process-local exclusion and ordering, shared even when a room is disposed. */
export class CharacterPersistenceCoordinator {
  private readonly entries = new Map<string, Entry>();

  acquire(name: string): CharacterLease {
    const entry = this.entries.get(name) ?? {};
    if (entry.owner || entry.tail) throw new Error('Ese personaje ya tiene una sesión activa o un guardado en curso. Intentá nuevamente.');
    const lease = { name, token: Symbol(name) };
    entry.owner = lease;
    entry.closing = false;
    this.entries.set(name, entry);
    return lease;
  }

  private owned(lease: CharacterLease): Entry {
    const entry = this.entries.get(lease.name);
    if (!entry || entry.owner !== lease || entry.closing) throw new Error('La sesión del personaje ya terminó.');
    return entry;
  }

  async save(lease: CharacterLease, data: CharacterSave, writer: Writer): Promise<void> {
    const entry = this.owned(lease);
    const job = { snapshot: cloneCharacterSave(data), writer };
    // Record the newest snapshot immediately; an older failure cannot replace it.
    entry.pending = job;
    const previous = entry.tail;
    const result = (async () => {
      if (previous) await previous;
      await job.writer(lease.name, job.snapshot);
      if (entry.pending === job) entry.pending = undefined;
    })();
    // Only the internal queue handles rejection; callers still receive the error.
    const tail = result.then(() => {}, () => {});
    entry.tail = tail;
    void tail.then(() => {
      if (entry.tail === tail) entry.tail = undefined;
      this.prune(lease.name, entry);
    });
    return result;
  }

  async retry(lease: CharacterLease): Promise<void> {
    const pending = this.owned(lease).pending;
    if (pending) await this.save(lease, pending.snapshot, pending.writer);
  }

  async release(lease: CharacterLease): Promise<void> {
    const entry = this.entries.get(lease.name);
    if (!entry || entry.owner !== lease) return;
    entry.closing = true;
    await entry.tail;
    if (entry.owner === lease) {
      entry.owner = undefined;
      this.prune(lease.name, entry);
    }
  }

  private prune(name: string, entry: Entry): void {
    if (!entry.owner && !entry.tail && !entry.pending && this.entries.get(name) === entry) {
      this.entries.delete(name);
    }
  }
}

export const characterPersistenceCoordinator = new CharacterPersistenceCoordinator();
