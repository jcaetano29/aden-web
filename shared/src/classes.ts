import type { CombatStats } from "./combat.js";

/** Etapa 22: un skill de la clase + el nivel al que se aprende. */
export interface SkillUnlock {
  id: string;
  level: number;
}

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
  /** 6 skills por clase con su nivel de desbloqueo (orden de aprendizaje). */
  skills: SkillUnlock[];
  skillId: string;
}

// Etapa 22: niveles hito de desbloqueo (mismos para las 4 clases).
export const SKILL_UNLOCK_LEVELS = [1, 3, 8, 15, 25, 40] as const;

function kit(ids: [string, string, string, string, string, string]): SkillUnlock[] {
  return ids.map((id, i) => ({ id, level: SKILL_UNLOCK_LEVELS[i] }));
}

export const CLASSES: Record<string, ClassDef> = {
  ranger: {
    id: "ranger", name: "Explorador", model: "Ranger",
    base: { maxHp: 90, maxMp: 55, pAtk: 15, pDef: 8, attackCooldownMs: 1450 },
    growth: { hp: 17, mp: 5, pAtk: 4, pDef: 2 },
    skills: kit(["aimed_shot", "trail_mend", "snaring_shot", "retreat", "eagle_focus", "piercing_shot"]),
    skillId: "aimed_shot",
  },
  knight: {
    id: "knight",
    name: "Caballero",
    model: "Knight",
    base: { maxHp: 140, maxMp: 30, pAtk: 13, pDef: 16, attackCooldownMs: 1600 },
    growth: { hp: 26, mp: 3, pAtk: 3, pDef: 3 },
    skills: kit(["shield_bash", "guard", "second_wind", "shield_charge", "iron_will", "last_stand"]),
    skillId: "shield_bash",
  },
  mage: {
    id: "mage",
    name: "Mago",
    model: "Mage",
    base: { maxHp: 80, maxMp: 90, pAtk: 18, pDef: 7, attackCooldownMs: 1500 },
    growth: { hp: 14, mp: 10, pAtk: 4, pDef: 1 },
    skills: kit(["fireball", "ice_lance", "arcane_mend", "blink", "frost_nova", "meteor"]),
    skillId: "fireball",
  },
  barbarian: {
    id: "barbarian",
    name: "Bárbaro",
    model: "Barbarian",
    base: { maxHp: 120, maxMp: 30, pAtk: 18, pDef: 10, attackCooldownMs: 1500 },
    growth: { hp: 22, mp: 3, pAtk: 4, pDef: 2 },
    skills: kit(["brutal_strike", "rage", "cleave", "charge", "bloodthirst", "rampage"]),
    skillId: "brutal_strike",
  },
  rogue: {
    id: "rogue",
    name: "Pícaro",
    model: "Rogue",
    base: { maxHp: 95, maxMp: 45, pAtk: 16, pDef: 9, attackCooldownMs: 1100 },
    growth: { hp: 18, mp: 5, pAtk: 4, pDef: 2 },
    skills: kit(["backstab", "poison", "evasion", "shadowstep", "vanish", "assassinate"]),
    skillId: "backstab",
  },
};

export const CLASS_ORDER: string[] = ["knight", "mage", "barbarian", "rogue", "ranger"];

export function getClass(id: string): ClassDef {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`getClass: clase desconocida ${id}`);
  return cls;
}

export function isValidClass(id: string | undefined): boolean {
  if (id === undefined) return false;
  return id in CLASSES;
}

/** Todos los ids de skills de la clase (aprendidos o no) — para UI/catálogo. */
export function getClassSkills(className: string): string[] {
  return getClass(className).skills.map((s) => s.id);
}

/** Desbloqueos (id + nivel) de la clase, en orden. */
export function getClassSkillUnlocks(className: string): SkillUnlock[] {
  return getClass(className).skills;
}

/** Ids de skills YA aprendidos a `level` (los que se pueden castear/mostrar). */
export function learnedSkillIds(className: string, level: number): string[] {
  return getClass(className).skills.filter((s) => s.level <= level).map((s) => s.id);
}

/** Skills que se aprenden EXACTAMENTE al llegar a `level` (para el aviso de level-up). */
export function newSkillsAtLevel(className: string, level: number): string[] {
  return getClass(className).skills.filter((s) => s.level === level).map((s) => s.id);
}

/** ¿La clase tiene aprendido `skillId` a `level`? (validación server). */
export function isSkillLearned(className: string, level: number, skillId: string): boolean {
  return getClass(className).skills.some((s) => s.id === skillId && s.level <= level);
}
