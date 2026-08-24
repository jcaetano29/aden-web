import { getItem } from "./items.js";

/**
 * Sistema de equipamiento (Etapa 12 — Loot & Equipo). El gear son ItemTemplates
 * de `type:"equipment"` (ver items.ts) con un `slot`, una `rarity` y `bonuses` de
 * stats planos. Equipar mueve el ítem del inventario a un slot; los bonuses se
 * suman a los stats base de clase/nivel. Este módulo define los tipos/colores de
 * rareza y el cálculo puro de bonificaciones (server los aplica al PlayerState).
 */

export type EquipSlot = "weapon" | "armor" | "accessory";
export const EQUIP_SLOTS: readonly EquipSlot[] = ["weapon", "armor", "accessory"] as const;
export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: "Arma",
  armor: "Armadura",
  accessory: "Accesorio",
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export const RARITY_ORDER: readonly Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"] as const;
/** Color de cada rareza (para bordes/nombres en la UI), estilo ARPG clásico. */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#c8c8c8",
  uncommon: "#4fd14f",
  rare: "#4da6ff",
  epic: "#b96bff",
  legendary: "#ff9a2e",
};
export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Común",
  uncommon: "Poco común",
  rare: "Raro",
  epic: "Épico",
  legendary: "Legendario",
};

export interface StatBonuses {
  pAtk?: number;
  pDef?: number;
  maxHp?: number;
  maxMp?: number;
}

/** Totales garantizados (0 en vez de undefined) — útil para sumar y mostrar. */
export interface StatTotals {
  pAtk: number;
  pDef: number;
  maxHp: number;
  maxMp: number;
}

export function isEquipment(itemTemplateId: string): boolean {
  return getItem(itemTemplateId).type === "equipment";
}

export function getEquipSlot(itemTemplateId: string): EquipSlot | undefined {
  return getItem(itemTemplateId).slot;
}

export function getRarity(itemTemplateId: string): Rarity {
  return getItem(itemTemplateId).rarity ?? "common";
}

/**
 * Suma los bonuses de todos los ítems equipados. `equipped` mapea slot →
 * itemTemplateId ("" o ausente = slot vacío). Ignora ids inválidos o no-equipo.
 */
export function equipmentBonuses(equipped: Partial<Record<EquipSlot, string>>): StatTotals {
  const total: StatTotals = { pAtk: 0, pDef: 0, maxHp: 0, maxMp: 0 };
  for (const slot of EQUIP_SLOTS) {
    const id = equipped[slot];
    if (!id) continue;
    let b: StatBonuses | undefined;
    try {
      const item = getItem(id);
      if (item.type !== "equipment") continue;
      b = item.bonuses;
    } catch {
      continue; // id inválido
    }
    if (!b) continue;
    total.pAtk += b.pAtk ?? 0;
    total.pDef += b.pDef ?? 0;
    total.maxHp += b.maxHp ?? 0;
    total.maxMp += b.maxMp ?? 0;
  }
  return total;
}
