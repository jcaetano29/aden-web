import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, type CharacterSave } from "./CharacterSave.js";

const boundary = vi.hoisted(() => ({
  next: Promise.resolve({ data: null, error: null }) as Promise<unknown>,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => {
      const query: Record<string, unknown> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.order = vi.fn(() => query);
      query.maybeSingle = vi.fn(() => boundary.next);
      query.limit = vi.fn(() => boundary.next);
      query.upsert = vi.fn(() => boundary.next);
      return query;
    }),
  })),
}));

import { SupabasePersistence } from "./SupabasePersistence.js";

const saved: CharacterSave = {
  level: 7,
  exp: 345,
  pos_x: 12,
  pos_z: -8,
  mapId: "ruinas",
  inventory: { health_potion: 4 },
  gold: 912,
  questId: "q4",
  questProgress: 2,
  className: "mage",
  pvpKills: 3,
  guildId: "guild-1",
  guildName: "Centinelas",
  guildTag: "CENT",
  equipment: {},
  progress: emptyProgress(),
};

function resolveWith(data: unknown, error: unknown = null): void {
  boundary.next = Promise.resolve({ data, error });
}

describe("SupabasePersistence failure semantics", () => {
  let persistence: SupabasePersistence;

  beforeEach(() => {
    resolveWith(null);
    persistence = new SupabasePersistence("https://example.supabase.co", "test-service-key");
  });

  it.each([
    ["character", () => persistence.load("Veterano")],
    ["account", () => persistence.loadAccount("Veterano")],
    ["guild", () => persistence.loadGuild("guild-1")],
  ])("returns null for a successful absent %s query", async (_kind, load) => {
    await expect(load()).resolves.toBeNull();
  });

  it.each([
    ["character", () => persistence.load("Veterano")],
    ["account", () => persistence.loadAccount("Veterano")],
    ["guild", () => persistence.loadGuild("guild-1")],
  ])("rejects when the %s query reports an error", async (_kind, load) => {
    const cause = { message: "database unavailable" };
    resolveWith(null, cause);

    const rejection = load();

    await expect(rejection).rejects.toThrow(/No se pudo/i);
    await expect(rejection).rejects.toMatchObject({ cause });
  });

  it.each([
    ["character", () => persistence.load("Veterano")],
    ["account", () => persistence.loadAccount("Veterano")],
    ["guild", () => persistence.loadGuild("guild-1")],
  ])("wraps a rejected %s transport request as a persistence error", async (_kind, load) => {
    const cause = new Error("socket exposed internal-host.example");
    boundary.next = Promise.reject(cause);

    const rejection = load();

    await expect(rejection).rejects.toThrow(/No se pudo/i);
    await expect(rejection).rejects.toMatchObject({ cause });
  });

  it.each([
    ["character", () => persistence.save("Veterano", saved)],
    ["account", () => persistence.saveAccount({ name: "Veterano", passwordHash: "hash", passwordSalt: "salt" })],
    ["guild", () => persistence.saveGuild({ id: "guild-1", name: "Centinelas", tag: "CENT", leaderName: "Veterano", bossKills: 2 })],
  ])("rejects when the %s write reports an error", async (_kind, save) => {
    resolveWith(null, { message: "database unavailable" });

    await expect(save()).rejects.toThrow(/No se pudo/i);
  });

  it.each([
    ["characters", () => persistence.topCharacters(20)],
    ["guilds", () => persistence.topGuilds(20)],
  ])("rejects when the %s leaderboard query reports an error", async (_kind, load) => {
    resolveWith(null, { message: "database unavailable" });

    await expect(load()).rejects.toThrow(/No se pudo/i);
  });
});
