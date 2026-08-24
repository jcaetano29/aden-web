import { describe, it, expect } from "vitest";
import { toCharacterSave, inventoryRecordToEntries } from "./CharacterSave.js";

describe("toCharacterSave", () => {
  it("serializa nivel/exp/pos, inventario, equipo y progreso a Record", () => {
    const inv = new Map([["gold", { qty: 5 }], ["bone", { qty: 2 }]]);
    const equip = new Map([["weapon", "iron_sword"], ["armor", ""]]); // "" se ignora
    const achievements = ["first_blood", "adventurer"];
    const save = toCharacterSave({
      level: 3, exp: 40, x: 12, z: -7, inventory: inv, gold: 100, questId: "q1", questProgress: 2,
      className: "mage", pvpKills: 0, guildId: "", guildName: "", guildTag: "", equipment: equip,
      loginStreak: 4, lastLoginDay: "2026-08-24", dailyQuestId: "d_hunt", dailyProgress: 3,
      dailyDone: false, totalKills: 42, bossKills: 1, title: "Aventurero", achievements,
    });
    expect(save.equipment).toEqual({ weapon: "iron_sword" });
    expect(save.progress).toEqual({
      loginStreak: 4, lastLoginDay: "2026-08-24", dailyQuestId: "d_hunt", dailyProgress: 3,
      dailyDone: false, totalKills: 42, bossKills: 1, title: "Aventurero",
      achievements: ["first_blood", "adventurer"],
    });
  });
});

describe("inventoryRecordToEntries", () => {
  it("convierte el Record a pares [id, qty]", () => {
    expect(inventoryRecordToEntries({ gold: 5, bone: 2 })).toEqual(
      expect.arrayContaining([["gold", 5], ["bone", 2]]),
    );
  });
});
