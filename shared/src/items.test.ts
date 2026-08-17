import { describe, it, expect } from "vitest";
import { getItem, ITEM_TEMPLATES, rollDrops, addToInventory, DROP_TABLES, getShopPrice, SHOP_PRICES, SHOP_STOCK } from "./items.js";

describe("items", () => {
  it("getItem devuelve el template y lanza si falta", () => {
    expect(getItem("gold").type).toBe("currency");
    expect(() => getItem("excalibur")).toThrow();
  });
});

describe("rollDrops", () => {
  it("con rng=0 (siempre < chance) dropea todas las entries de la tabla", () => {
    const drops = rollDrops("skeleton_minion", () => 0);
    const ids = drops.map((d) => d.itemTemplateId);
    for (const e of DROP_TABLES["skeleton_minion"]) expect(ids).toContain(e.itemTemplateId);
    for (const d of drops) expect(d.qty).toBeGreaterThanOrEqual(1);
  });
  it("con rng=0.99 (>= toda chance < 1) no dropea lo que no es seguro", () => {
    const drops = rollDrops("skeleton_minion", () => 0.99);
    // gold del minion tiene chance 0.8 → 0.99 no pasa; bone 0.5 → tampoco
    expect(drops.length).toBe(0);
  });
  it("mob sin tabla dropea vacío", () => {
    expect(rollDrops("dragon", () => 0)).toEqual([]);
  });
});

describe("addToInventory", () => {
  it("crea y luego stackea por itemTemplateId", () => {
    const inv = new Map<string, number>();
    addToInventory(inv, "gold", 5);
    addToInventory(inv, "gold", 3);
    addToInventory(inv, "bone", 1);
    expect(inv.get("gold")).toBe(8);
    expect(inv.get("bone")).toBe(1);
  });
});

describe("shop config", () => {
  it("getShopPrice retorna el precio para health_potion", () => {
    expect(getShopPrice("health_potion")).toBe(15);
  });

  it("getShopPrice lanza para ítem no a la venta", () => {
    expect(() => getShopPrice("nope")).toThrow();
  });

  it("health_potion tiene heal = 60", () => {
    expect(getItem("health_potion").heal).toBe(60);
  });

  it("SHOP_STOCK incluye health_potion", () => {
    expect(SHOP_STOCK).toContain("health_potion");
  });
});
