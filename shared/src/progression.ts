import { PLAYER_COMBAT } from "./combat.js";
import { getClass } from "./classes.js";

export const EXP_BASE = 100;
export const EXP_POW = 1.5;
/** Nivel máximo (Etapa 22, estilo L2). Al llegar, la exp deja de acumular. */
export const MAX_LEVEL = 40;

export function expToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity; // tope: no hay siguiente nivel
  return Math.round(EXP_BASE * Math.pow(level, EXP_POW));
}

export const LEVEL_GROWTH = { hp: 20, mp: 5, pAtk: 3, pDef: 2 } as const;

// Etapa 11: la EXP escala con la profundidad de la zona, de modo que el jugador
// llega al Trono rondando el nivel recomendado (~9-10) cazando su camino al norte.
export const MOB_EXP: Record<string, number> = {
  umbra_orc: 35,
  forest_troll: 65,
  crypt_wraith: 100,
  bone_warden: 190,
  infernal_demon: 330,
  ancient_drake: 650,
  // Bosque de Umbra
  skeleton_minion: 15,
  skeleton_warrior: 40,
  // Ruinas de Nihil
  crypt_minion: 75,
  crypt_warrior: 140,
  crypt_sentinel: 500, // mini-jefe
  // Yermo Ceniciento
  ash_minion: 190,
  ash_warrior: 310,
  // Trono del Rey Nihil
  skeleton_king: 900,
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
  if (p.level >= MAX_LEVEL) { p.exp = 0; return 0; } // ya en el tope
  p.exp += amount;
  let gained = 0;
  while (p.level < MAX_LEVEL && p.exp >= expToNextLevel(p.level)) {
    p.exp -= expToNextLevel(p.level);
    p.level += 1;
    const newStats = statsForClass(className, p.level);
    p.maxHp = newStats.maxHp;
    p.maxMp = newStats.maxMp;
    p.pAtk = newStats.pAtk;
    p.pDef = newStats.pDef;
    gained += 1;
  }
  if (p.level >= MAX_LEVEL) p.exp = 0; // en el tope, la exp sobrante se descarta
  if (gained > 0) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  return gained;
}
