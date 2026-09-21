import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { dayKey } from "@aden/shared";
import appConfig from "../testServer.js";
import { hashPassword } from "../auth/password.js";
import { emptyProgress, type CharacterSave } from "../persistence/CharacterSave.js";
import { InMemoryPersistence, type CharacterRank, type GuildRank } from "../persistence/PersistenceService.js";
import type { GameRoom } from "./GameRoom.js";

class FailingPersistence extends InMemoryPersistence {
  failCharacterLoads = false;
  failAccountLoads = false;
  failAccountWrites = false;
  failGuildLoads = false;
  failLeaderboard = false;

  override async load(name: string): Promise<CharacterSave | null> {
    if (this.failCharacterLoads) throw new Error("characters table unavailable");
    return super.load(name);
  }

  loadStored(name: string): Promise<CharacterSave | null> {
    return super.load(name);
  }

  override async loadAccount(name: string) {
    if (this.failAccountLoads) throw new Error("accounts table unavailable");
    return super.loadAccount(name);
  }

  override async saveAccount(account: Parameters<InMemoryPersistence["saveAccount"]>[0]): Promise<void> {
    if (this.failAccountWrites) throw new Error("accounts insert unavailable");
    return super.saveAccount(account);
  }

  override async loadGuild(id: string) {
    if (this.failGuildLoads) throw new Error("guilds table unavailable");
    return super.loadGuild(id);
  }

  override async topCharacters(limit: number): Promise<CharacterRank[]> {
    if (this.failLeaderboard) throw new Error("leaderboard unavailable");
    return super.topCharacters(limit);
  }

  override async topGuilds(limit: number): Promise<GuildRank[]> {
    if (this.failLeaderboard) throw new Error("leaderboard unavailable");
    return super.topGuilds(limit);
  }
}

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
  guildId: "",
  guildName: "",
  guildTag: "",
  equipment: {},
  progress: { ...emptyProgress(), lastLoginDay: dayKey(new Date()), achievements: ["adventurer"] },
};

describe("GameRoom persistence failures", () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot(appConfig, 2594);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("denies login on character load failure without overwriting saved progress, then restores it after recovery", async () => {
    const room = await colyseus.createRoom("game", {}) as GameRoom;
    await colyseus.connectTo(room, { name: "Observer" });
    const persistence = new FailingPersistence();
    const { hash, salt } = hashPassword("clave123");
    await persistence.saveAccount({ name: "Veterano", passwordHash: hash, passwordSalt: salt });
    await persistence.save("Veterano", saved);
    room["persistence"] = persistence;
    persistence.failCharacterLoads = true;

    const denied = colyseus.connectTo(room, { name: "Veterano", password: "clave123", mode: "login" });

    await expect(denied).rejects.toThrow(/servicio de guardado.*intentá nuevamente/i);
    expect([...room.state.players.values()].some((player) => player.name === "Veterano")).toBe(false);
    expect(await persistence.loadStored("Veterano")).toEqual(saved);

    persistence.failCharacterLoads = false;
    const returned = await colyseus.connectTo(room, { name: "Veterano", password: "clave123", mode: "login" });
    const restored = room.state.players.get(returned.sessionId)!;
    expect(restored).toMatchObject({ name: "Veterano", level: 7, gold: 912, questId: "q4", questProgress: 2 });
    expect(restored.inventory.get("health_potion")?.qty).toBe(4);
  });

  it("denies access with a sanitized retryable message when account lookup fails", async () => {
    const room = await colyseus.createRoom("game", {}) as GameRoom;
    const persistence = new FailingPersistence();
    room["persistence"] = persistence;
    persistence.failAccountLoads = true;

    const denied = colyseus.connectTo(room, { name: "Cuenta", password: "clave123", mode: "login" });

    await expect(denied).rejects.toThrow(/servicio de guardado.*intentá nuevamente/i);
    await expect(denied).rejects.not.toThrow(/accounts table unavailable/i);
    expect([...room.state.players.values()].some((player) => player.name === "Cuenta")).toBe(false);
  });

  it("denies account creation with a sanitized retryable message when account persistence fails", async () => {
    const room = await colyseus.createRoom("game", {}) as GameRoom;
    const persistence = new FailingPersistence();
    room["persistence"] = persistence;
    persistence.failAccountWrites = true;

    const denied = colyseus.connectTo(room, { name: "Nueva", password: "clave123", mode: "create", gender: "female" });

    await expect(denied).rejects.toThrow(/servicio de guardado.*intentá nuevamente/i);
    await expect(denied).rejects.not.toThrow(/accounts insert unavailable/i);
    expect([...room.state.players.values()].some((player) => player.name === "Nueva")).toBe(false);
  });

  it("denies before creating player or empty guild state when guild loading fails", async () => {
    const room = await colyseus.createRoom("game", {}) as GameRoom;
    const persistence = new FailingPersistence();
    const guilded = { ...saved, guildId: "guild-1", guildName: "Centinelas", guildTag: "CENT" };
    await persistence.save("Veterano", guilded);
    room["persistence"] = persistence;
    persistence.failGuildLoads = true;

    const denied = colyseus.connectTo(room, { name: "Veterano" });

    await expect(denied).rejects.toThrow(/servicio de guardado.*intentá nuevamente/i);
    expect([...room.state.players.values()].some((player) => player.name === "Veterano")).toBe(false);
    expect(room.state.guilds.has("guild-1")).toBe(false);
    expect(await persistence.loadStored("Veterano")).toEqual(guilded);
  });

  it("keeps the last valid leaderboard when persistence refresh fails", async () => {
    const room = await colyseus.createRoom("game", {}) as GameRoom;
    const persistence = new FailingPersistence();
    await persistence.save("Campeona", saved);
    room["persistence"] = persistence;
    await room["refreshLeaderboard"]();
    const before = [...room.state.leaderboard.players].map((entry) => ({ name: entry.name, level: entry.level }));
    persistence.failLeaderboard = true;

    await expect(room["refreshLeaderboard"]()).resolves.toBeUndefined();

    expect([...room.state.leaderboard.players].map((entry) => ({ name: entry.name, level: entry.level }))).toEqual(before);
  });
});
