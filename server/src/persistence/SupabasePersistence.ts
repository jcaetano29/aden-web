import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterSave, ProgressSave } from "./CharacterSave.js";
import { emptyProgress } from "./CharacterSave.js";
import type { GuildSave } from "./GuildSave.js";
import type { AccountRecord, CharacterRank, GuildRank, PersistenceService } from "./PersistenceService.js";
import { PersistenceError } from "./PersistenceError.js";

type SupabaseResponse<T> = {
  data: T;
  error: { message: string } | null;
};

async function requireResponse<T>(request: PromiseLike<SupabaseResponse<T>>, message: string): Promise<T> {
  try {
    const { data, error } = await request;
    if (error) throw new PersistenceError(message, { cause: error });
    return data;
  } catch (cause) {
    if (cause instanceof PersistenceError) throw cause;
    throw new PersistenceError(message, { cause });
  }
}

export class SupabasePersistence implements PersistenceService {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async load(name: string): Promise<CharacterSave | null> {
    const data = await requireResponse(this.client
      .from("characters")
      .select("level,exp,pos_x,pos_z,mapId,inventory,gold,questId,questProgress,className,pvpKills,guildId,guildName,guildTag,equipment,progress")
      .eq("name", name)
      .maybeSingle(), "No se pudo cargar el personaje. Intentá nuevamente.");

    if (!data) {
      return null;
    }

    return {
      level: data.level,
      exp: data.exp,
      pos_x: data.pos_x,
      pos_z: data.pos_z,
      mapId: data.mapId ?? "pueblo",
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
    await requireResponse(this.client.from("characters").upsert(
      {
        name,
        level: data.level,
        exp: data.exp,
        pos_x: data.pos_x,
        pos_z: data.pos_z,
        mapId: data.mapId,
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
    ), "No se pudo guardar el personaje. Intentá nuevamente.");
  }

  async loadGuild(id: string): Promise<GuildSave | null> {
    const data = await requireResponse(this.client
      .from("guilds")
      .select("id,name,tag,leaderName,bossKills")
      .eq("id", id)
      .maybeSingle(), "No se pudo cargar la guild. Intentá nuevamente.");
    if (!data) return null;
    return { id: data.id, name: data.name, tag: data.tag, leaderName: data.leaderName ?? "", bossKills: (data.bossKills as number) ?? 0 };
  }

  async saveGuild(g: GuildSave): Promise<void> {
    await requireResponse(this.client.from("guilds").upsert(
      { id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    ), "No se pudo guardar la guild. Intentá nuevamente.");
  }

  async topCharacters(limit: number): Promise<CharacterRank[]> {
    const data = await requireResponse(this.client
      .from("characters")
      .select("name,level,pvpKills,className")
      .order("level", { ascending: false })
      .order("pvpKills", { ascending: false })
      .limit(limit), "No se pudo cargar el ranking de personajes. Intentá nuevamente.");
    return (data ?? []).map((r) => ({ name: r.name, level: r.level, pvpKills: (r.pvpKills as number) ?? 0, className: r.className ?? "knight" }));
  }

  async topGuilds(limit: number): Promise<GuildRank[]> {
    const data = await requireResponse(this.client
      .from("guilds")
      .select("name,tag,bossKills")
      .order("bossKills", { ascending: false })
      .limit(limit), "No se pudo cargar el ranking de guilds. Intentá nuevamente.");
    return (data ?? []).map((r) => ({ name: r.name, tag: r.tag, bossKills: (r.bossKills as number) ?? 0 }));
  }

  async loadAccount(name: string): Promise<AccountRecord | null> {
    const data = await requireResponse(this.client
      .from("accounts")
      .select("name,password_hash,password_salt")
      .eq("name", name)
      .maybeSingle(), "No se pudo cargar la cuenta. Intentá nuevamente.");
    if (!data) return null;
    return { name: data.name, passwordHash: data.password_hash ?? "", passwordSalt: data.password_salt ?? "" };
  }

  async saveAccount(acct: AccountRecord): Promise<void> {
    await requireResponse(this.client.from("accounts").upsert(
      { name: acct.name, password_hash: acct.passwordHash, password_salt: acct.passwordSalt },
      { onConflict: "name" },
    ), "No se pudo guardar la cuenta. Intentá nuevamente.");
  }
}
