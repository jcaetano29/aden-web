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
    };

    await persistence.save("Mob", data);
    const loaded = await persistence.load("Mob");
    loaded!.level = 99;
    loaded!.inventory.gold = 999;

    const reloaded = await persistence.load("Mob");
    expect(reloaded).toEqual({ level: 1, exp: 0, pos_x: 0, pos_z: 0, inventory: { gold: 1 }, gold: 0, questId: "q1", questProgress: 0, className: "knight" });
  });
});
