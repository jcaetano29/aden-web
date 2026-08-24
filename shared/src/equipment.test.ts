import { describe, it, expect } from "vitest";
import {
  EQUIP_SLOTS,
  RARITY_ORDER,
  RARITY_COLORS,
  isEquipment,
  getEquipSlot,
  getRarity,
  equipmentBonuses,
} from "./equipment.js";
import { ITEM_TEMPLATES, getItem } from "./items.js";

describe("catálogo de equipo", () => {
  it("todo ítem de equipo tiene slot y rarity válidos", () => {
    for (const item of Object.values(ITEM_TEMPLATES)) {
      if (item.type !== "equipment") continue;
      expect(item.slot).toBeDefined();
      expect(EQUIP_SLOTS).toContain(item.slot);
      expect(item.rarity).toBeDefined();
      expect(RARITY_ORDER).toContain(item.rarity);
      expect(RARITY_COLORS[item.rarity!]).toMatch(/^#/);
    }
  });

  it("isEquipment / getEquipSlot / getRarity", () => {
    expect(isEquipment("iron_sword")).toBe(true);
    expect(isEquipment("health_potion")).toBe(false);
    expect(getEquipSlot("crypt_plate")).toBe("armor");
    expect(getRarity("crown_blade")).toBe("legendary");
  });
});

describe("equipmentBonuses", () => {
  it("suma los bonuses de los slots ocupados", () => {
    const b = equipmentBonuses({ weapon: "iron_sword", armor: "iron_mail" });
    expect(b.pAtk).toBe(getItem("iron_sword").bonuses!.pAtk);
    expect(b.pDef).toBe(getItem("iron_mail").bonuses!.pDef);
    expect(b.maxHp).toBe(getItem("iron_mail").bonuses!.maxHp);
  });

  it("slots vacíos o ausentes no aportan", () => {
    const b = equipmentBonuses({ weapon: "worn_sword", armor: "", accessory: undefined });
    expect(b.pAtk).toBe(4);
    expect(b.pDef).toBe(0);
    expect(b.maxHp).toBe(0);
  });

  it("ids inválidos o no-equipo se ignoran (no rompen)", () => {
    const b = equipmentBonuses({ weapon: "no_existe", armor: "health_potion" });
    expect(b).toEqual({ pAtk: 0, pDef: 0, maxHp: 0, maxMp: 0 });
  });

  it("la rareza legendaria pega más que la común (mismo slot)", () => {
    const legendary = equipmentBonuses({ weapon: "crown_blade" }).pAtk;
    const common = equipmentBonuses({ weapon: "worn_sword" }).pAtk;
    expect(legendary).toBeGreaterThan(common);
  });
});
