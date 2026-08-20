import { describe, it, expect } from "vitest";
import { InMemoryPersistence } from "./PersistenceService.js";
import type { CharacterSave } from "./CharacterSave.js";

describe("InMemoryPersistence", () => {
  it("save luego load devuelve los datos guardados", async () => {
    const persistence = new InMemoryPersistence();
    const data: CharacterSave = {
      level: 4,
      exp: 120,
      pos_x: 5,
      pos_z: -3,
      inventory: { gold: 10, bone: 2 },
      gold: 100,
      questId: "q1",
      questProgress: 2,
      className: "mage",
      pvpKills: 0,
      guildId: "",
      guildName: "",
      guildTag: "",
    };

    await persistence.save("Aiden", data);
    const loaded = await persistence.load("Aiden");

    expect(loaded).toEqual(data);
  });

  it("load de un nombre inexistente devuelve null", async () => {
    const persistence = new InMemoryPersistence();
    const loaded = await persistence.load("Nadie");
    expect(loaded).toBeNull();
  });

  it("no devuelve una referencia mutable al objeto guardado", async () => {
    const persistence = new InMemoryPersistence();
    const data: CharacterSave = {
      level: 1,
      exp: 0,
      pos_x: 0,
      pos_z: 0,
      inventory: { gold: 1 },
      gold: 0,
      questId: "q1",
      questProgress: 0,
      className: "knight",
      pvpKills: 0,
      guildId: "",
      guildName: "",
      guildTag: "",
    };

    await persistence.save("Mob", data);
    const loaded = await persistence.load("Mob");
    loaded!.level = 99;
    loaded!.inventory.gold = 999;

    const reloaded = await persistence.load("Mob");
    expect(reloaded).toEqual({ level: 1, exp: 0, pos_x: 0, pos_z: 0, inventory: { gold: 1 }, gold: 0, questId: "q1", questProgress: 0, className: "knight", pvpKills: 0, guildId: "", guildName: "", guildTag: "" });
  });

  it("persiste y devuelve pvpKills", async () => {
    const svc = new InMemoryPersistence();
    await svc.save("Boromir", {
      level: 3, exp: 10, pos_x: 1, pos_z: 2, inventory: {}, gold: 50,
      questId: "q1", questProgress: 0, className: "knight", pvpKills: 7,
      guildId: "", guildName: "", guildTag: "",
    });
    const loaded = await svc.load("Boromir");
    expect(loaded?.pvpKills).toBe(7);
  });

  it("persiste y devuelve la identidad de guild del personaje", async () => {
    const svc = new InMemoryPersistence();
    await svc.save("Aragorn", {
      level: 1, exp: 0, pos_x: 0, pos_z: 0, inventory: {}, gold: 0,
      questId: "q1", questProgress: 0, className: "knight", pvpKills: 0,
      guildId: "wolf-abc123", guildName: "Los Lobos", guildTag: "WOLF",
    });
    const loaded = await svc.load("Aragorn");
    expect(loaded?.guildId).toBe("wolf-abc123");
    expect(loaded?.guildName).toBe("Los Lobos");
    expect(loaded?.guildTag).toBe("WOLF");
  });

  it("guarda y carga una guild (round-trip)", async () => {
    const svc = new InMemoryPersistence();
    await svc.saveGuild({ id: "wolf-abc123", name: "Los Lobos", tag: "WOLF", leaderName: "Aragorn", bossKills: 3 });
    const g = await svc.loadGuild("wolf-abc123");
    expect(g).toEqual({ id: "wolf-abc123", name: "Los Lobos", tag: "WOLF", leaderName: "Aragorn", bossKills: 3 });
  });

  it("loadGuild devuelve null si no existe", async () => {
    const svc = new InMemoryPersistence();
    expect(await svc.loadGuild("nope")).toBeNull();
  });
});
