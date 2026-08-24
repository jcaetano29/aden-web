import type { CharacterSave } from "./CharacterSave.js";
import type { GuildSave } from "./GuildSave.js";

export interface CharacterRank { name: string; level: number; pvpKills: number; className: string; }
export interface GuildRank { name: string; tag: string; bossKills: number; }

export interface PersistenceService {
  load(name: string): Promise<CharacterSave | null>;
  save(name: string, data: CharacterSave): Promise<void>;
  loadGuild(id: string): Promise<GuildSave | null>;
  saveGuild(g: GuildSave): Promise<void>;
  topCharacters(limit: number): Promise<CharacterRank[]>;
  topGuilds(limit: number): Promise<GuildRank[]>;
}

function cloneCharacterSave(data: CharacterSave): CharacterSave {
  return { ...data, inventory: { ...data.inventory }, equipment: { ...(data.equipment ?? {}) } };
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

  async topCharacters(limit: number): Promise<CharacterRank[]> {
    return [...this.store.entries()]
      .map(([name, c]) => ({ name, level: c.level, pvpKills: c.pvpKills, className: c.className }))
      .sort((a, b) => b.level - a.level || b.pvpKills - a.pvpKills)
      .slice(0, limit);
  }

  async topGuilds(limit: number): Promise<GuildRank[]> {
    return [...this.guilds.values()]
      .map((g) => ({ name: g.name, tag: g.tag, bossKills: g.bossKills }))
      .sort((a, b) => b.bossKills - a.bossKills)
      .slice(0, limit);
  }
}
