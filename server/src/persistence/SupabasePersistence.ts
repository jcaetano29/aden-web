import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterSave } from "./CharacterSave.js";
import type { PersistenceService } from "./PersistenceService.js";

export class SupabasePersistence implements PersistenceService {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async load(name: string): Promise<CharacterSave | null> {
    const { data, error } = await this.client
      .from("characters")
      .select("level,exp,pos_x,pos_z,inventory")
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    );

    if (error) {
      console.error("[aden] SupabasePersistence.save error:", error.message);
    }
  }
}
