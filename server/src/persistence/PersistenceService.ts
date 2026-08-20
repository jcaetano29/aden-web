import type { CharacterSave } from "./CharacterSave.js";
import type { GuildSave } from "./GuildSave.js";

export interface PersistenceService {
  load(name: string): Promise<CharacterSave | null>;
  save(name: string, data: CharacterSave): Promise<void>;
  loadGuild(id: string): Promise<GuildSave | null>;
  saveGuild(g: GuildSave): Promise<void>;
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

  private readonly guilds = new Map<string, GuildSave>();

  async loadGuild(id: string): Promise<GuildSave | null> {
    const g = this.guilds.get(id);
    return g ? { ...g } : null;
  }

  async saveGuild(g: GuildSave): Promise<void> {
    this.guilds.set(g.id, { ...g });
  }
}
