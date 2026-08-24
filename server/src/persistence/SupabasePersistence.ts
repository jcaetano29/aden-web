import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterSave, ProgressSave } from "./CharacterSave.js";
import { emptyProgress } from "./CharacterSave.js";
import type { GuildSave } from "./GuildSave.js";
import type { CharacterRank, GuildRank, PersistenceService } from "./PersistenceService.js";

export class SupabasePersistence implements PersistenceService {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async load(name: string): Promise<CharacterSave | null> {
    const { data, error } = await this.client
      .from("characters")
      .select("level,exp,pos_x,pos_z,inventory,gold,questId,questProgress,className,pvpKills,guildId,guildName,guildTag,equipment,progress")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      console.error("[aden] SupabasePersistence.load error:", error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      level: data.level,
      exp: data.exp,
      pos_x: data.pos_x,
      pos_z: data.pos_z,
      inventory: (data.inventory ?? {}) as Record<string, number>,
      gold: data.gold ?? 0,
      questId: data.questId ?? "",
      questProgress: data.questProgress ?? 0,
      className: data.className ?? "knight",
      pvpKills: (data.pvpKills as number) ?? 0,
      guildId: data.guildId ?? "",
      guildName: data.guildName ?? "",
      guildTag: data.guildTag ?? "",
      equipment: (data.equipment ?? {}) as Record<string, string>,
      progress: { ...emptyProgress(), ...((data.progress ?? {}) as Partial<ProgressSave>) },
    };
  }

  async save(name: string, data: CharacterSave): Promise<void> {
    const { error } = await this.client.from("characters").upsert(
      {
        name,
        level: data.level,
        exp: data.exp,
        pos_x: data.pos_x,
        pos_z: data.pos_z,
        inventory: data.inventory,
        gold: data.gold,
        questId: data.questId,
        questProgress: data.questProgress,
        className: data.className,
        pvpKills: data.pvpKills,
        guildId: data.guildId,
        guildName: data.guildName,
        guildTag: data.guildTag,
        equipment: data.equipment,
        progress: data.progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    );

    if (error) {
      console.error("[aden] SupabasePersistence.save error:", error.message);
    }
  }

  async loadGuild(id: string): Promise<GuildSave | null> {
    const { data, error } = await this.client
      .from("guilds")
      .select("id,name,tag,leaderName,bossKills")
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("[aden] SupabasePersistence.loadGuild error:", error.message); return null; }
    if (!data) return null;
    return { id: data.id, name: data.name, tag: data.tag, leaderName: data.leaderName ?? "", bossKills: (data.bossKills as number) ?? 0 };
  }

  async saveGuild(g: GuildSave): Promise<void> {
    const { error } = await this.client.from("guilds").upsert(
      { id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) console.error("[aden] SupabasePersistence.saveGuild error:", error.message);
  }

  async topCharacters(limit: number): Promise<CharacterRank[]> {
    const { data, error } = await this.client
      .from("characters")
      .select("name,level,pvpKills,className")
      .order("level", { ascending: false })
      .order("pvpKills", { ascending: false })
      .limit(limit);
    if (error) { console.error("[aden] SupabasePersistence.topCharacters error:", error.message); return []; }
    return (data ?? []).map((r) => ({ name: r.name, level: r.level, pvpKills: (r.pvpKills as number) ?? 0, className: r.className ?? "knight" }));
  }

  async topGuilds(limit: number): Promise<GuildRank[]> {
    const { data, error } = await this.client
      .from("guilds")
      .select("name,tag,bossKills")
      .order("bossKills", { ascending: false })
      .limit(limit);
    if (error) { console.error("[aden] SupabasePersistence.topGuilds error:", error.message); return []; }
    return (data ?? []).map((r) => ({ name: r.name, tag: r.tag, bossKills: (r.bossKills as number) ?? 0 }));
  }
}
