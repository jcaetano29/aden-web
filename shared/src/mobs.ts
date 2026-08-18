export const MOB_MOVE_SPEED = 3.5; // unidades/seg (más lento que el jugador)

export interface MobTemplate {
  id: string;
  name: string;
  model: string; // nombre de modelo en client/public/models
  boss?: boolean;
  scale?: number;
  respawnMs?: number;
}

export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  skeleton_minion: { id: "skeleton_minion", name: "Skeleton Minion", model: "Skeleton_Minion" },
  skeleton_warrior: { id: "skeleton_warrior", name: "Skeleton Warrior", model: "Skeleton_Warrior" },
  skeleton_king: { id: "skeleton_king", name: "Rey Esqueleto", model: "Skeleton_Warrior", boss: true, scale: 1.9, respawnMs: 45000 },
};

export function getTemplate(id: string): MobTemplate {
  const t = MOB_TEMPLATES[id];
  if (!t) throw new Error(`getTemplate: template desconocido: ${id}`);
  return t;
}

export interface SpawnZone {
  id: string;
  templateId: string;
  centerX: number;
  centerZ: number;
  radius: number;
  count: number;
}

export const SPAWN_ZONES: SpawnZone[] = [
  { id: "minions_norte", templateId: "skeleton_minion", centerX: 20, centerZ: -20, radius: 8, count: 4 },
  { id: "warriors_este", templateId: "skeleton_warrior", centerX: -25, centerZ: 20, radius: 8, count: 3 },
  { id: "boss_rey", templateId: "skeleton_king", centerX: 0, centerZ: -42, radius: 2, count: 1 },
];

export const AI_CONFIG = {
  aggroRadius: 8,
  leashRadius: 16,
  wanderRadius: 6,
  wanderPauseMs: 2000,
} as const;

export type AIConfig = typeof AI_CONFIG;

export function isBoss(templateId: string): boolean {
  return getTemplate(templateId).boss === true;
}

export function scaleForTemplate(templateId: string): number {
  return getTemplate(templateId).scale ?? 1;
}

export function respawnForTemplate(templateId: string): number | undefined {
  return getTemplate(templateId).respawnMs;
}
