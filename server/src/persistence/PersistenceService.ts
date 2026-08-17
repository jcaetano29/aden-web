import type { CharacterSave } from "./CharacterSave.js";

export interface PersistenceService {
  load(name: string): Promise<CharacterSave | null>;
  save(name: string, data: CharacterSave): Promise<void>;
}

function cloneCharacterSave(data: CharacterSave): CharacterSave {
  return { ...data, inventory: { ...data.inventory } };
}

export class InMemoryPersistence implements PersistenceService {
  private readonly store = new Map<string, CharacterSave>();

  async load(name: string): Promise<CharacterSave | null> {
    const found = this.store.get(name);
    return found ? cloneCharacterSave(found) : null;
  }

  async save(name: string, data: CharacterSave): Promise<void> {
    this.store.set(name, cloneCharacterSave(data));
  }
}
