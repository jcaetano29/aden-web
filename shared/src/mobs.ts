export const MOB_MOVE_SPEED = 3.5; // unidades/seg (más lento que el jugador)

export interface MobTemplate {
  id: string;
  name: string;
  model: string; // nombre de modelo en client/public/models
  boss?: boolean;
  /** Mini-jefe de zona (Etapa 11): trato visual especial (nameplate/HP bar) pero
   *  NO cuenta como el jefe final (no da crédito de guild ni anuncio server-wide). */
  miniBoss?: boolean;
  scale?: number;
  respawnMs?: number;
  /**
   * Tinte de material (multiply, hex 0xRRGGBB) que el cliente aplica sobre el modelo
   * base para diferenciar variantes por zona sin necesitar modelos nuevos. Ausente =
   * sin tinte (colores originales del GLB). Etapa 11.
   */
  tint?: number;
}

// Etapa 11: mismos 2 modelos base (Skeleton_Minion / Skeleton_Warrior) reusados
// como variantes por zona vía `tint` + `scale` + stats. El tinte da la identidad
// visual: Bosque = musgoso (verde), Ruinas = cripta (violeta), Yermo = ardiente (rojo).
export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  // Bosque de Umbra (Lv 1-3) — huesos musgosos
  skeleton_minion: { id: "skeleton_minion", name: "Explorador Óseo", model: "Skeleton_Minion", tint: 0x9fc48f },
  skeleton_warrior: { id: "skeleton_warrior", name: "Guerrero Musgoso", model: "Skeleton_Warrior", tint: 0x9fc48f },
  // Ruinas de Nihil (Lv 3-6) — guardianes de la cripta (violeta)
  crypt_minion: { id: "crypt_minion", name: "Siervo de la Cripta", model: "Skeleton_Minion", tint: 0xb9a7e8 },
  crypt_warrior: { id: "crypt_warrior", name: "Guardián de la Cripta", model: "Skeleton_Warrior", tint: 0xb9a7e8 },
  crypt_sentinel: { id: "crypt_sentinel", name: "Centinela de Nihil", model: "Skeleton_Warrior", miniBoss: true, tint: 0x8a6fd4, scale: 1.5, respawnMs: 60000 },
  // Yermo Ceniciento (Lv 6-9) — verdugos ardientes (rojo/ceniza), élites
  ash_minion: { id: "ash_minion", name: "Ceniciento", model: "Skeleton_Minion", tint: 0xff9a6a, scale: 1.05 },
  ash_warrior: { id: "ash_warrior", name: "Verdugo Ardiente", model: "Skeleton_Warrior", tint: 0xff6a3c, scale: 1.15 },
  // Trono del Rey Nihil — jefe final
  skeleton_king: { id: "skeleton_king", name: "Rey Nihil", model: "Skeleton_Warrior", boss: true, scale: 2.0, respawnMs: 60000, tint: 0xffe6a8 },
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

// Etapa 11: los clusters de spawn se distribuyen DENTRO del footprint de cada zona
// (ver world.ts), dejando los caminos entre zonas vacíos a propósito (viaje). La
// dificultad escala con la profundidad (norte), lo que gatea la progresión de forma
// natural sin muros: un jugador de bajo nivel que se adentra al Yermo o al Trono es
// aplastado.
export const SPAWN_ZONES: SpawnZone[] = [
  // Bosque de Umbra (Lv 1-3)
  { id: "bosque_scouts_1", templateId: "skeleton_minion", centerX: 0, centerZ: -6, radius: 7, count: 4 },
  { id: "bosque_scouts_2", templateId: "skeleton_minion", centerX: -16, centerZ: -20, radius: 7, count: 3 },
  { id: "bosque_warriors", templateId: "skeleton_warrior", centerX: 15, centerZ: -26, radius: 7, count: 4 },
  // Ruinas de Nihil (Lv 3-6) + mini-jefe
  { id: "ruinas_siervos", templateId: "crypt_minion", centerX: -24, centerZ: -52, radius: 7, count: 4 },
  { id: "ruinas_guardianes", templateId: "crypt_warrior", centerX: -42, centerZ: -66, radius: 8, count: 4 },
  { id: "ruinas_centinela", templateId: "crypt_sentinel", centerX: -40, centerZ: -80, radius: 2, count: 1 },
  // Yermo Ceniciento (Lv 6-9) — élites
  { id: "yermo_cenicientos", templateId: "ash_minion", centerX: 22, centerZ: -70, radius: 7, count: 4 },
  { id: "yermo_verdugos", templateId: "ash_warrior", centerX: 36, centerZ: -88, radius: 8, count: 4 },
  // Trono del Rey Nihil — jefe final
  { id: "trono_rey", templateId: "skeleton_king", centerX: 0, centerZ: -122, radius: 2, count: 1 },
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

/** true si el template es un mini-jefe de zona (Etapa 11). No es el jefe final. */
export function isMiniBoss(templateId: string): boolean {
  return getTemplate(templateId).miniBoss === true;
}

/** Tinte de material del template (hex 0xRRGGBB), o undefined si usa los colores del GLB. */
export function tintForTemplate(templateId: string): number | undefined {
  return getTemplate(templateId).tint;
}

export function scaleForTemplate(templateId: string): number {
  return getTemplate(templateId).scale ?? 1;
}

export function respawnForTemplate(templateId: string): number | undefined {
  return getTemplate(templateId).respawnMs;
}
