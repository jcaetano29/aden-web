import { describe, it, expect } from "vitest";
import { createPersistence } from "./createPersistence.js";
import { InMemoryPersistence } from "./PersistenceService.js";
import { SupabasePersistence } from "./SupabasePersistence.js";

describe("createPersistence", () => {
  it("sin SUPABASE_URL/SUPABASE_SERVICE_KEY devuelve InMemoryPersistence", () => {
    const persistence = createPersistence({});
    expect(persistence).toBeInstanceOf(InMemoryPersistence);
  });

  it("con SUPABASE_URL y SUPABASE_SERVICE_KEY devuelve SupabasePersistence", () => {
    const persistence = createPersistence({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "fake-service-key",
    });
    expect(persistence).toBeInstanceOf(SupabasePersistence);
  });

  it("con solo una de las dos variables devuelve InMemoryPersistence", () => {
    const persistence = createPersistence({ SUPABASE_URL: "https://example.supabase.co" });
    expect(persistence).toBeInstanceOf(InMemoryPersistence);
  });
});
