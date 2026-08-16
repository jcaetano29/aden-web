import { getTemplate } from "@aden/shared";

export const MODEL_NAMES = ["Knight", "Mage", "Barbarian", "Rogue"] as const;

export const MOB_MODEL_NAMES = ["Skeleton_Minion", "Skeleton_Warrior"] as const;

export function modelUrl(name: string): string {
  return `/models/${name}.glb`;
}

export function modelForTemplate(templateId: string): string {
  return getTemplate(templateId).model;
}

export function pickModelForSession(sessionId: string, models: readonly string[]): string {
  if (models.length === 0) throw new Error("pickModelForSession: lista de modelos vacía");
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return models[h % models.length];
}
