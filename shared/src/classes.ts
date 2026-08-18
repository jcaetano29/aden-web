import type { CombatStats } from "./combat.js";

export interface ClassDef {
  id: string;
  name: string;
  model: string;
  base: CombatStats;
  growth: {
    hp: number;
    mp: number;
    pAtk: number;
    pDef: number;
  };
  skillId: string;
}

export const CLASSES: Record<string, ClassDef> = {
  knight: {
    id: "knight",
    name: "Caballero",
    model: "Knight",
    base: { maxHp: 140, maxMp: 30, pAtk: 13, pDef: 16, attackCooldownMs: 1600 },
    growth: { hp: 26, mp: 3, pAtk: 3, pDef: 3 },
    skillId: "shield_bash",
  },
  mage: {
    id: "mage",
    name: "Mago",
    model: "Mage",
    base: { maxHp: 80, maxMp: 90, pAtk: 18, pDef: 7, attackCooldownMs: 1500 },
    growth: { hp: 14, mp: 10, pAtk: 4, pDef: 1 },
    skillId: "fireball",
  },
  barbarian: {
    id: "barbarian",
    name: "Bárbaro",
    model: "Barbarian",
    base: { maxHp: 120, maxMp: 30, pAtk: 18, pDef: 10, attackCooldownMs: 1500 },
    growth: { hp: 22, mp: 3, pAtk: 4, pDef: 2 },
    skillId: "brutal_strike",
  },
  rogue: {
    id: "rogue",
    name: "Pícaro",
    model: "Rogue",
    base: { maxHp: 95, maxMp: 45, pAtk: 16, pDef: 9, attackCooldownMs: 1100 },
    growth: { hp: 18, mp: 5, pAtk: 4, pDef: 2 },
    skillId: "backstab",
  },
};

export const CLASS_ORDER: string[] = ["knight", "mage", "barbarian", "rogue"];

export function getClass(id: string): ClassDef {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`getClass: clase desconocida ${id}`);
  return cls;
}

export function isValidClass(id: string | undefined): boolean {
  if (id === undefined) return false;
  return id in CLASSES;
}
