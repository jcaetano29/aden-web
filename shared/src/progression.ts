import { PLAYER_COMBAT } from "./combat.js";
import { getClass } from "./classes.js";

export const EXP_BASE = 100;
export const EXP_POW = 1.5;

export function expToNextLevel(level: number): number {
  return Math.round(EXP_BASE * Math.pow(level, EXP_POW));
}

export const LEVEL_GROWTH = { hp: 20, mp: 5, pAtk: 3, pDef: 2 } as const;

export const MOB_EXP: Record<string, number> = {
  skeleton_minion: 15,
  skeleton_warrior: 40,
  skeleton_king: 300,
};
export function getMobExp(templateId: string): number {
  return MOB_EXP[templateId] ?? 0;
}

export interface Leveled {
  exp: number;
  level: number;
  maxHp: number;
  maxMp: number;
  pAtk: number;
  pDef: number;
  hp: number;
  mp: number;
}

export function statsForClass(className: string, level: number): { maxHp: number; maxMp: number; pAtk: number; pDef: number } {
  const cls = getClass(className);
  const n = Math.max(0, level - 1);
  return {
    maxHp: cls.base.maxHp + n * cls.growth.hp,
    maxMp: (cls.base.maxMp ?? 0) + n * cls.growth.mp,
    pAtk: cls.base.pAtk + n * cls.growth.pAtk,
    pDef: cls.base.pDef + n * cls.growth.pDef,
  };
}

export function statsForLevel(level: number): { maxHp: number; maxMp: number; pAtk: number; pDef: number } {
  return statsForClass("knight", level);
}

export function gainExp(p: Leveled, amount: number, className = "knight"): number {
  p.exp += amount;
  let gained = 0;
  while (p.exp >= expToNextLevel(p.level)) {
    p.exp -= expToNextLevel(p.level);
    p.level += 1;
    const newStats = statsForClass(className, p.level);
    p.maxHp = newStats.maxHp;
    p.maxMp = newStats.maxMp;
    p.pAtk = newStats.pAtk;
    p.pDef = newStats.pDef;
    gained += 1;
  }
  if (gained > 0) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  return gained;
}
