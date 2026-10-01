/** Atributos por clase. Los guardados conservan los puntos invertidos sobre la base. */
import { statsForClass } from './progression.js';
import { equipmentBonuses } from './equipment.js';
import { loadoutEffects, type Loadout } from './loadout.js';

export const ATTRIBUTE_RULES_VERSION = 2;

export type Attribute = "str" | "agi" | "vit" | "ene";

export const ATTRIBUTES: Attribute[] = ["str", "agi", "vit", "ene"];

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  str: "Fuerza",
  agi: "Agilidad",
  vit: "Vitalidad",
  ene: "Energía",
};

/** El poder inicial de estos 100 ya está incluido en statsForClass, no es un bonus. */
export const BASE_ATTRIBUTE = 100;

/** Puntos de atributo otorgados por cada nivel ganado. */
export const POINTS_PER_LEVEL = 3;

interface AttributeProfile {
  strengthAttack: number;
  agilityAttack: number;
  energyAttack: number;
  defense: number;
  health: number;
  mana: number;
  attackSpeed: number;
}

const CLASS_ATTRIBUTES: Record<string, AttributeProfile> = {
  knight: { strengthAttack: 3, agilityAttack: 0, energyAttack: 0, defense: 2, health: 18, mana: 6, attackSpeed: 0.008 },
  barbarian: { strengthAttack: 3, agilityAttack: 0, energyAttack: 0, defense: 2, health: 16, mana: 6, attackSpeed: 0.008 },
  mage: { strengthAttack: 0.5, agilityAttack: 0, energyAttack: 2, defense: 1, health: 12, mana: 10, attackSpeed: 0.01 },
  rogue: { strengthAttack: 0.5, agilityAttack: 1.5, energyAttack: 0, defense: 1, health: 14, mana: 6, attackSpeed: 0.01 },
  ranger: { strengthAttack: 0.5, agilityAttack: 1.5, energyAttack: 0, defense: 1, health: 14, mana: 6, attackSpeed: 0.01 },
};

export const ATTRIBUTE_ATTACK_SPEED_CAP = 0.5;
export const ATTRIBUTE_MOVE_SPEED_CAP = 0.15;

/** Puntos asignados por encima de BASE_ATTRIBUTE; mismo formato que los guardados antiguos. */
export interface Attributes {
  str: number;
  agi: number;
  vit: number;
  ene: number;
}

export function isValidAttribute(a: string): a is Attribute {
  return (ATTRIBUTES as string[]).includes(a);
}

/** Bonus sobre la base de clase/nivel. Rapidez se suma al equipo y acorta ataque y GCD ofensivo. */
export function attributeBonuses(a: Attributes, className = 'knight') {
  const profile = CLASS_ATTRIBUTES[className];
  if (!profile) throw new Error(`attributeBonuses: clase desconocida ${className}`);
  return {
    pAtk: (a.str ?? 0) * profile.strengthAttack + (a.agi ?? 0) * profile.agilityAttack + (a.ene ?? 0) * profile.energyAttack,
    pDef: (a.agi ?? 0) * profile.defense,
    maxHp: (a.vit ?? 0) * profile.health,
    maxMp: (a.ene ?? 0) * profile.mana,
    attackSpeed: Math.min(ATTRIBUTE_ATTACK_SPEED_CAP, (a.agi ?? 0) * profile.attackSpeed),
    moveSpeed: Math.min(ATTRIBUTE_MOVE_SPEED_CAP, (a.agi ?? 0) * 0.002),
  };
}

/** Composición única para el servidor, la comparación de equipo y la vista del próximo punto. */
export function characterStats(className: string, level: number, a: Attributes, equipped: Loadout = {}) {
  const base = statsForClass(className, level);
  const bonus = equipmentBonuses(equipped);
  const attr = attributeBonuses(a, className);
  const effects = loadoutEffects(equipped);
  effects.attackSpeed += attr.attackSpeed;
  effects.moveSpeed += attr.moveSpeed;
  return {
    maxHp: Math.round((base.maxHp + bonus.maxHp + attr.maxHp) * (1 + effects.hpPct)),
    maxMp: Math.round((base.maxMp + bonus.maxMp + attr.maxMp) * (1 + effects.mpPct)),
    pAtk: Math.round((base.pAtk + bonus.pAtk + attr.pAtk + level * effects.levelAttack) * (1 + effects.attackPct)),
    pDef: base.pDef + bonus.pDef + attr.pDef,
    effects,
  };
}

/** Incremento efectivo del próximo punto, después de equipo y redondeos. */
export function attributeEffects(a: Attributes, className = 'knight', context: { level: number; equipment: Loadout } = { level: 1, equipment: {} }): Record<Attribute, string> {
  const current = characterStats(className, context.level, a, context.equipment);
  const effects = {} as Record<Attribute, string>;
  const percent = (n: number) => Number((n * 100).toFixed(2)).toLocaleString('es');
  for (const attr of ATTRIBUTES) {
    const next = characterStats(className, context.level, { ...a, [attr]: (a[attr] ?? 0) + 1 }, context.equipment);
    const parts: string[] = [];
    if (next.pAtk > current.pAtk) parts.push(`+${(next.pAtk - current.pAtk).toLocaleString('es')} ${className === 'mage' ? 'ataque mágico' : 'ataque'}`);
    if (next.pDef > current.pDef) parts.push(`+${next.pDef - current.pDef} defensa`);
    if (next.maxHp > current.maxHp) parts.push(`+${next.maxHp - current.maxHp} vida`);
    if (next.maxMp > current.maxMp) parts.push(`+${next.maxMp - current.maxMp} maná`);
    if (attr === 'agi') {
      parts.push(next.effects.attackSpeed > current.effects.attackSpeed ? `+${percent(next.effects.attackSpeed - current.effects.attackSpeed)}% rapidez` : 'rapidez al límite');
      parts.push(next.effects.moveSpeed > current.effects.moveSpeed ? `+${percent(next.effects.moveSpeed - current.effects.moveSpeed)}% movimiento` : 'movimiento al límite');
    }
    effects[attr] = parts.join(' · ') || 'sin aumento visible en este punto; el aporte se acumula';
  }
  return effects;
}

/** Total de puntos que un personaje habría ganado al llegar a `level` (para validar/grandfather). */
export function pointsForLevel(level: number): number {
  return Math.max(0, level - 1) * POINTS_PER_LEVEL;
}
