/**
 * Atributos primarios asignables (Etapa 21). Al subir de nivel ganás puntos que
 * repartís en 4 atributos, cada uno mapeado a un stat derivado del combate actual:
 *   Fuerza    (str) → ataque físico (pAtk)
 *   Agilidad  (agi) → defensa física (pDef)
 *   Vitalidad (vit) → vida máxima (maxHp)
 *   Energía   (ene) → maná máximo (maxMp)
 * Módulo puro (sin estado): el server aplica y persiste; el cliente sólo muestra.
 */

export type Attribute = "str" | "agi" | "vit" | "ene";

export const ATTRIBUTES: Attribute[] = ["str", "agi", "vit", "ene"];

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  str: "Fuerza",
  agi: "Agilidad",
  vit: "Vitalidad",
  ene: "Energía",
};

/** Efecto de cada punto (para mostrar en el panel). */
export const ATTRIBUTE_EFFECTS: Record<Attribute, string> = {
  str: "+2 ataque",
  agi: "+2 defensa",
  vit: "+12 vida",
  ene: "+6 maná",
};

/** Puntos de atributo otorgados por cada nivel ganado. */
export const POINTS_PER_LEVEL = 3;

export const PER_POINT = { str: 2, agi: 2, vit: 12, ene: 6 } as const;

export interface Attributes {
  str: number;
  agi: number;
  vit: number;
  ene: number;
}

export function isValidAttribute(a: string): a is Attribute {
  return (ATTRIBUTES as string[]).includes(a);
}

/** Bonus a los stats derivados por los atributos asignados (suma pura). */
export function attributeBonuses(a: Attributes): { pAtk: number; pDef: number; maxHp: number; maxMp: number } {
  return {
    pAtk: (a.str ?? 0) * PER_POINT.str,
    pDef: (a.agi ?? 0) * PER_POINT.agi,
    maxHp: (a.vit ?? 0) * PER_POINT.vit,
    maxMp: (a.ene ?? 0) * PER_POINT.ene,
  };
}

/** Total de puntos que un personaje habría ganado al llegar a `level` (para validar/grandfather). */
export function pointsForLevel(level: number): number {
  return Math.max(0, level - 1) * POINTS_PER_LEVEL;
}
