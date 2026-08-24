export interface ItemTemplate {
  id: string;
  name: string;
  type: "material" | "currency" | "consumable";
  stackable: boolean;
  heal?: number;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  gold: { id: "gold", name: "Oro", type: "currency", stackable: true },
  bone: { id: "bone", name: "Hueso", type: "material", stackable: true },
  health_potion: { id: "health_potion", name: "Poción de Vida", type: "consumable", stackable: true, heal: 60 },
  // Etapa 11: poción mayor (drop de zonas profundas / venta en tienda).
  greater_potion: { id: "greater_potion", name: "Poción Mayor", type: "consumable", stackable: true, heal: 150 },
  // Trofeos por zona (materiales coleccionables: prueban lo profundo que llegaste).
  ancient_relic: { id: "ancient_relic", name: "Reliquia Antigua", type: "material", stackable: true },
  ember_core: { id: "ember_core", name: "Núcleo de Brasa", type: "material", stackable: true },
  skull_crown: { id: "skull_crown", name: "Corona del Rey Nihil", type: "material", stackable: false },
};

export function getItem(id: string): ItemTemplate {
  const t = ITEM_TEMPLATES[id];
  if (!t) throw new Error(`getItem: ítem desconocido ${id}`);
  return t;
}

export const SHOP_PRICES: Record<string, number> = {
  health_potion: 15,
  greater_potion: 60,
};

export const SHOP_STOCK: string[] = ["health_potion", "greater_potion"];

export function getShopPrice(id: string): number {
  const price = SHOP_PRICES[id];
  if (price === undefined) throw new Error(`getShopPrice: ítem no a la venta ${id}`);
  return price;
}

export interface DropEntry {
  itemTemplateId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
}

// Etapa 11: el loot mejora con la profundidad (más oro, mejores pociones y trofeos
// de zona). El jefe final es el premio grande. Refuerza el loop peligro → recompensa.
export const DROP_TABLES: Record<string, DropEntry[]> = {
  // Bosque de Umbra
  skeleton_minion: [
    { itemTemplateId: "gold", chance: 0.8, qtyMin: 1, qtyMax: 5 },
    { itemTemplateId: "bone", chance: 0.5, qtyMin: 1, qtyMax: 2 },
  ],
  skeleton_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 3, qtyMax: 10 },
    { itemTemplateId: "bone", chance: 0.7, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "health_potion", chance: 0.15, qtyMin: 1, qtyMax: 1 },
  ],
  // Ruinas de Nihil
  crypt_minion: [
    { itemTemplateId: "gold", chance: 0.9, qtyMin: 5, qtyMax: 14 },
    { itemTemplateId: "bone", chance: 0.6, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 0.12, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 10, qtyMax: 24 },
    { itemTemplateId: "health_potion", chance: 0.25, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ancient_relic", chance: 0.25, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_sentinel: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 40, qtyMax: 75 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "health_potion", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 1, qtyMax: 2 },
  ],
  // Yermo Ceniciento
  ash_minion: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 12, qtyMax: 26 },
    { itemTemplateId: "ember_core", chance: 0.18, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "health_potion", chance: 0.2, qtyMin: 1, qtyMax: 2 },
  ],
  ash_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 20, qtyMax: 42 },
    { itemTemplateId: "ember_core", chance: 0.35, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "greater_potion", chance: 0.3, qtyMin: 1, qtyMax: 1 },
  ],
  // Trono del Rey Nihil — botín de jefe
  skeleton_king: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 120, qtyMax: 220 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 3, qtyMax: 4 },
    { itemTemplateId: "skull_crown", chance: 1.0, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ember_core", chance: 1.0, qtyMin: 2, qtyMax: 3 },
  ],
};

export interface DropResult {
  itemTemplateId: string;
  qty: number;
}

export function rollDrops(templateId: string, rng: () => number): DropResult[] {
  const table = DROP_TABLES[templateId];
  if (!table) return [];
  const out: DropResult[] = [];
  for (const e of table) {
    if (rng() < e.chance) {
      const qty = e.qtyMin + Math.floor(rng() * (e.qtyMax - e.qtyMin + 1));
      out.push({ itemTemplateId: e.itemTemplateId, qty });
    }
  }
  return out;
}

export function addToInventory(inv: Map<string, number>, itemTemplateId: string, qty: number): void {
  inv.set(itemTemplateId, (inv.get(itemTemplateId) ?? 0) + qty);
}

export const PICKUP_RANGE = 2.5;
export const DROP_DESPAWN_MS = 60000;
// Delay antes de que un ítem del piso pueda levantarse: como el rango de pickup
// es igual al de ataque, sin esto el loot se recogía en el mismo tick que caía
// (el jugador mata al mob parado encima) y nunca se veía. Con el delay, aterriza
// y queda visible ~1.5s antes de vacuumearse.
export const PICKUP_DELAY_MS = 1500;
