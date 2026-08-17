export interface ItemTemplate {
  id: string;
  name: string;
  type: "material" | "currency" | "consumable";
  stackable: boolean;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  gold: { id: "gold", name: "Oro", type: "currency", stackable: true },
  bone: { id: "bone", name: "Hueso", type: "material", stackable: true },
  health_potion: { id: "health_potion", name: "Poción de Vida", type: "consumable", stackable: true },
};

export function getItem(id: string): ItemTemplate {
  const t = ITEM_TEMPLATES[id];
  if (!t) throw new Error(`getItem: ítem desconocido ${id}`);
  return t;
}

export interface DropEntry {
  itemTemplateId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
}

export const DROP_TABLES: Record<string, DropEntry[]> = {
  skeleton_minion: [
    { itemTemplateId: "gold", chance: 0.8, qtyMin: 1, qtyMax: 5 },
    { itemTemplateId: "bone", chance: 0.5, qtyMin: 1, qtyMax: 2 },
  ],
  skeleton_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 3, qtyMax: 10 },
    { itemTemplateId: "bone", chance: 0.7, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "health_potion", chance: 0.15, qtyMin: 1, qtyMax: 1 },
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
