import { describe, it, expect } from "vitest";
import { toCharacterSave, inventoryRecordToEntries } from "./CharacterSave.js";

describe("toCharacterSave", () => {
  it("serializa nivel/exp/pos e inventario a Record", () => {
    const inv = new Map([["gold", { qty: 5 }], ["bone", { qty: 2 }]]);
    const save = toCharacterSave({ level: 3, exp: 40, x: 12, z: -7, inventory: inv, gold: 100, questId: "q1", questProgress: 2, className: "mage", pvpKills: 0 });
    expect(save).toEqual({ level: 3, exp: 40, pos_x: 12, pos_z: -7, inventory: { gold: 5, bone: 2 }, gold: 100, questId: "q1", questProgress: 2, className: "mage", pvpKills: 0 });
  });
});

describe("inventoryRecordToEntries", () => {
  it("convierte el Record a pares [id, qty]", () => {
    expect(inventoryRecordToEntries({ gold: 5, bone: 2 })).toEqual(
      expect.arrayContaining([["gold", 5], ["bone", 2]]),
    );
  });
});
