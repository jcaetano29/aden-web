import { InMemoryPersistence, type PersistenceService } from "./PersistenceService.js";
import { SupabasePersistence } from "./SupabasePersistence.js";

export function createPersistence(env: NodeJS.ProcessEnv = process.env): PersistenceService {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    return new SupabasePersistence(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }

  console.warn(
    "[aden] SUPABASE_URL/SUPABASE_SERVICE_KEY ausentes — persistencia in-memory (no persiste entre reinicios)",
  );
  return new InMemoryPersistence();
}
