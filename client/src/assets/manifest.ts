import { getTemplate, CLASSES } from "@aden/shared";

export const HERO_MODELS = ["Knight", "Mage", "Barbarian", "Rogue", "Ranger"] as const;
export const MODEL_NAMES: readonly string[] = [...HERO_MODELS, ...HERO_MODELS.map(name => `${name}_Female`)];

export const MOB_MODEL_NAMES = ["DreadStalker", "DreadKnight", "OrcBrute", "ForestTroll", "BoneWarden", "InfernalDemon", "DeathWraith", "AncientDrake"] as const;

/** Base heights before a template's elite/boss scale; feet remain at y=0. */
export const MODEL_HEIGHTS: Record<string, number> = {
  Knight: 2.5, Mage: 2.5, Barbarian: 2.7, Rogue: 2.4, Ranger: 2.4,
  DreadStalker: 2.5, DreadKnight: 2.8,
  OrcBrute: 2.9, ForestTroll: 3.8, BoneWarden: 3.2,
  InfernalDemon: 3.4, DeathWraith: 2.8, AncientDrake: 4.2,
};

export function modelUrl(name: string): string {
  const base = name.replace(/_Female$/, '');
  return `/models/${base === "Ranger" ? "Rogue" : base}.glb`;
}

export function modelForTemplate(templateId: string): string {
  return getTemplate(templateId).model;
}

/**
 * Devuelve el modelo de Three.js correspondiente a una clase (knight, mage, etc.).
 * Si la clase es desconocida, fallback al primer modelo (Knight).
 */
export function modelForClass(className: string, gender: string = 'male'): string {
  const classDef = CLASSES[className];
  return (classDef?.model ?? MODEL_NAMES[0]) + (gender === 'female' ? '_Female' : '');
}

export function pickModelForSession(sessionId: string, models: readonly string[]): string {
  if (models.length === 0) throw new Error("pickModelForSession: lista de modelos vacía");
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return models[h % models.length];
}
