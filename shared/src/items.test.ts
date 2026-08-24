import { describe, it, expect } from "vitest";
import { getItem, ITEM_TEMPLATES, rollDrops, addToInventory, DROP_TABLES, getShopPrice, SHOP_PRICES, SHOP_STOCK } from "./items.js";

describe("items", () => {
  it("getItem devuelve el template y lanza si falta", () => {
    expect(getItem("gold").type).toBe("currency");
    expect(() => getItem("excalibur")).toThrow();
  });

  it("skull_crown es un accesorio legendario equipable (Corona del Rey Nihil)", () => {
    const skull = getItem("skull_crown");
    expect(skull.id).toBe("skull_crown");
    expect(skull.name).toBe("Corona del Rey Nihil");
    expect(skull.type).toBe("equipment");
    expect(skull.slot).toBe("accessory");
    expect(skull.rarity).toBe("legendary");
    expect(skull.stackable).toBe(false);
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

  it("skeleton_king con rng=0 dropea el botín de jefe (gold, greater_potion, skull_crown, trofeos)", () => {
    const drops = rollDrops("skeleton_king", () => 0);
    const ids = drops.map((d) => d.itemTemplateId);
    expect(ids).toContain("gold");
    expect(ids).toContain("greater_potion");
    expect(ids).toContain("skull_crown");
    expect(ids).toContain("ancient_relic");
    expect(ids).toContain("ember_core");
    expect(drops.find((d) => d.itemTemplateId === "gold")?.qty).toBeGreaterThanOrEqual(120);
    expect(drops.find((d) => d.itemTemplateId === "greater_potion")?.qty).toBeGreaterThanOrEqual(3);
    expect(drops.find((d) => d.itemTemplateId === "skull_crown")?.qty).toBe(1);
  });

  it("el loot escala: el mini-jefe dropea más oro que un guerrero del bosque", () => {
    const sentinel = rollDrops("crypt_sentinel", () => 0).find((d) => d.itemTemplateId === "gold")?.qty ?? 0;
    const warrior = rollDrops("skeleton_warrior", () => 0).find((d) => d.itemTemplateId === "gold")?.qty ?? 0;
    expect(sentinel).toBeGreaterThan(warrior);
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
