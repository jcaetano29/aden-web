import type { EquipSlot, Rarity, StatBonuses } from "./equipment.js";

export interface ItemTemplate {
  id: string;
  name: string;
  type: "material" | "currency" | "consumable" | "equipment";
  stackable: boolean;
  heal?: number;
  // Etapa 12 — sólo para type "equipment":
  slot?: EquipSlot;
  rarity?: Rarity;
  bonuses?: StatBonuses;
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

  // ── Etapa 12: EQUIPO con rareza (drops por zona; equipar sube stats) ────────
  // Común (Bosque)
  worn_sword: { id: "worn_sword", name: "Espada Gastada", type: "equipment", stackable: false, slot: "weapon", rarity: "common", bonuses: { pAtk: 4 } },
  leather_vest: { id: "leather_vest", name: "Chaleco de Cuero", type: "equipment", stackable: false, slot: "armor", rarity: "common", bonuses: { pDef: 4, maxHp: 20 } },
  // Poco común (Bosque tardío / Ruinas)
  iron_sword: { id: "iron_sword", name: "Espada de Hierro", type: "equipment", stackable: false, slot: "weapon", rarity: "uncommon", bonuses: { pAtk: 9 } },
  iron_mail: { id: "iron_mail", name: "Cota de Malla", type: "equipment", stackable: false, slot: "armor", rarity: "uncommon", bonuses: { pDef: 8, maxHp: 45 } },
  hunter_charm: { id: "hunter_charm", name: "Amuleto del Cazador", type: "equipment", stackable: false, slot: "accessory", rarity: "uncommon", bonuses: { pAtk: 3, maxMp: 15 } },
  // Raro (Ruinas / mini-jefe)
  bone_blade: { id: "bone_blade", name: "Filo de Hueso", type: "equipment", stackable: false, slot: "weapon", rarity: "rare", bonuses: { pAtk: 15 } },
  crypt_plate: { id: "crypt_plate", name: "Coraza de la Cripta", type: "equipment", stackable: false, slot: "armor", rarity: "rare", bonuses: { pDef: 14, maxHp: 75 } },
  crypt_ring: { id: "crypt_ring", name: "Anillo de la Cripta", type: "equipment", stackable: false, slot: "accessory", rarity: "rare", bonuses: { pDef: 5, maxHp: 35, maxMp: 20 } },
  // Épico (Yermo)
  ember_axe: { id: "ember_axe", name: "Hacha de Brasa", type: "equipment", stackable: false, slot: "weapon", rarity: "epic", bonuses: { pAtk: 23 } },
  ash_guard: { id: "ash_guard", name: "Guarda de Ceniza", type: "equipment", stackable: false, slot: "armor", rarity: "epic", bonuses: { pDef: 21, maxHp: 120 } },
  ember_band: { id: "ember_band", name: "Brazal Ardiente", type: "equipment", stackable: false, slot: "accessory", rarity: "epic", bonuses: { pAtk: 11, maxMp: 30 } },
  // Legendario (Rey Nihil)
  crown_blade: { id: "crown_blade", name: "Espada Coronada", type: "equipment", stackable: false, slot: "weapon", rarity: "legendary", bonuses: { pAtk: 35 } },
  nihil_aegis: { id: "nihil_aegis", name: "Égida de Nihil", type: "equipment", stackable: false, slot: "armor", rarity: "legendary", bonuses: { pDef: 31, maxHp: 190 } },
  // La corona del jefe ahora es un accesorio legendario equipable (el gran trofeo).
  skull_crown: { id: "skull_crown", name: "Corona del Rey Nihil", type: "equipment", stackable: false, slot: "accessory", rarity: "legendary", bonuses: { pAtk: 12, pDef: 12, maxHp: 65 } },
};

export function getItem(id: string): ItemTemplate {
  const t = ITEM_TEMPLATES[id];
  if (!t) throw new Error(`getItem: ítem desconocido ${id}`);
  return t;
}

export const SHOP_PRICES: Record<string, number> = {
  health_potion: 15,
  greater_potion: 60,
  // Etapa 12: equipo común a la venta → primera mejora garantizada con oro.
  worn_sword: 45,
  leather_vest: 45,
};

export const SHOP_STOCK: string[] = ["health_potion", "greater_potion", "worn_sword", "leather_vest"];

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
  // Bosque de Umbra — equipo común (raro)
  skeleton_minion: [
    { itemTemplateId: "gold", chance: 0.8, qtyMin: 1, qtyMax: 5 },
    { itemTemplateId: "bone", chance: 0.5, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "worn_sword", chance: 0.04, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "leather_vest", chance: 0.04, qtyMin: 1, qtyMax: 1 },
  ],
  skeleton_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 3, qtyMax: 10 },
    { itemTemplateId: "bone", chance: 0.7, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "health_potion", chance: 0.15, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "leather_vest", chance: 0.06, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_sword", chance: 0.03, qtyMin: 1, qtyMax: 1 },
  ],
  // Ruinas de Nihil — poco común / raro
  crypt_minion: [
    { itemTemplateId: "gold", chance: 0.9, qtyMin: 5, qtyMax: 14 },
    { itemTemplateId: "bone", chance: 0.6, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 0.12, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_sword", chance: 0.05, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "iron_mail", chance: 0.05, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "hunter_charm", chance: 0.04, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 10, qtyMax: 24 },
    { itemTemplateId: "health_potion", chance: 0.25, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "ancient_relic", chance: 0.25, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "bone_blade", chance: 0.05, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_plate", chance: 0.05, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_ring", chance: 0.04, qtyMin: 1, qtyMax: 1 },
  ],
  crypt_sentinel: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 40, qtyMax: 75 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "health_potion", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 1, qtyMax: 2 },
    // Mini-jefe: botín raro casi garantizado (motiva farmearlo).
    { itemTemplateId: "bone_blade", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_plate", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "crypt_ring", chance: 0.35, qtyMin: 1, qtyMax: 1 },
  ],
  // Yermo Ceniciento — raro / épico
  ash_minion: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 12, qtyMax: 26 },
    { itemTemplateId: "ember_core", chance: 0.18, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "health_potion", chance: 0.2, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "bone_blade", chance: 0.05, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_band", chance: 0.04, qtyMin: 1, qtyMax: 1 },
  ],
  ash_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 20, qtyMax: 42 },
    { itemTemplateId: "ember_core", chance: 0.35, qtyMin: 1, qtyMax: 2 },
    { itemTemplateId: "greater_potion", chance: 0.3, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_axe", chance: 0.06, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ash_guard", chance: 0.06, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_band", chance: 0.05, qtyMin: 1, qtyMax: 1 },
  ],
  // Trono del Rey Nihil — botín de jefe (legendarios como cima del chase)
  skeleton_king: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 120, qtyMax: 220 },
    { itemTemplateId: "greater_potion", chance: 1.0, qtyMin: 3, qtyMax: 4 },
    { itemTemplateId: "skull_crown", chance: 1.0, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ancient_relic", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "ember_core", chance: 1.0, qtyMin: 2, qtyMax: 3 },
    { itemTemplateId: "crown_blade", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "nihil_aegis", chance: 0.5, qtyMin: 1, qtyMax: 1 },
    { itemTemplateId: "ember_axe", chance: 0.4, qtyMin: 1, qtyMax: 1 },
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
