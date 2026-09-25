import { describe, it, expect } from "vitest";
import { toCharacterSave, inventoryRecordToEntries, sideChainsFromSave } from "./CharacterSave.js";

describe("toCharacterSave", () => {
  it("serializa nivel/exp/pos, inventario, equipo y progreso a Record", () => {
    const inv = new Map([["gold", { qty: 5 }], ["bone", { qty: 2 }]]);
    const equip = new Map([["weapon", "iron_sword"], ["armor", ""]]); // "" se ignora
    const achievements = ["first_blood", "adventurer"];
    const save = toCharacterSave({
      level: 3, exp: 40, x: 12, z: -7, mapId: "bosque", inventory: inv, gold: 100, questId: "q1", questProgress: 2,
      className: "mage", pvpKills: 0, guildId: "", guildName: "", guildTag: "", equipment: equip,
      retention: { loginStreak: 4, dailyQuestId: "d_hunt", dailyProgress: 3, dailyDone: false, totalKills: 42 },
      lastLoginDay: "2026-08-24", bossKills: 1, title: "Aventurero", achievements,
      sideChains: new Map([["varek", { id: "b_forest", progress: 3 }]]),
      attributes: { str: 5, agi: 2, vit: 3, ene: 1, statPoints: 4 },
    });
    expect(save.mapId).toBe("bosque");
    expect(save.equipment).toEqual({ weapon: "iron_sword" });
    expect(save.progress).toEqual({
      gender: 'male',
      loginStreak: 4, lastLoginDay: "2026-08-24", dailyQuestId: "d_hunt", dailyProgress: 3,
      dailyDone: false, totalKills: 42, bossKills: 1, title: "Aventurero",
      achievements: ["first_blood", "adventurer"],
      bountyId: "b_forest", bountyProgress: 3,
      sideChains: { varek: { id: "b_forest", progress: 3 } },
      str: 5, agi: 2, vit: 3, ene: 1, statPoints: 4,
    });
  });
});

describe("sideChainsFromSave", () => {
  it("prefiere el formato nuevo y migra los campos viejos", () => {
    expect(sideChainsFromSave({ sideChains: { boren: { id: "b_veil_tool", progress: 1 } } }))
      .toEqual({ boren: { id: "b_veil_tool", progress: 1 } });
    expect(sideChainsFromSave({ bountyId: "b_crypt", bountyProgress: 2, veilContractId: "b_veil_supplies", veilContractProgress: 1 }))
      .toEqual({ varek: { id: "b_crypt", progress: 2 }, boren: { id: "b_veil_supplies", progress: 1 } });
    expect(sideChainsFromSave({ bountyId: "" })).toEqual({});
  });
});

describe("inventoryRecordToEntries", () => {
  it("convierte el Record a pares [id, qty]", () => {
    expect(inventoryRecordToEntries({ gold: 5, bone: 2 })).toEqual(
      expect.arrayContaining([["gold", 5], ["bone", 2]]),
    );
  });
});
