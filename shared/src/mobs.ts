import { CRYPT_BOSS } from './dungeon.js';
export const MOB_MOVE_SPEED = 3.5; // unidades/seg (más lento que el jugador)

export interface MobTemplate {
  id: string;
  level: number;
  rank: "normal" | "elite" | "boss";
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

// Las variantes originales usan ahora acechadores y caballeros malditos,
// con sus IDs de gameplay conservados. El tinte da la identidad
// visual: Bosque = musgoso (verde), Ruinas = cripta (violeta), Yermo = ardiente (rojo).
export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  memory_guard: { id:'memory_guard', level:13, rank:'normal', name:'Guardia de la Vigilia', model:'BoneWarden', tint:0xb6c9bd },
  memory_jailer: { id:'memory_jailer', level:14, rank:'elite', name:'Carcelero de la Vigilia', model:'DreadKnight', miniBoss:true, tint:0xa5b3c0, scale:1.4, respawnMs:45000 },
  memory_prior: { id:'memory_prior', level:15, rank:'boss', name:'Prior sin Nombre', model:'DeathWraith', boss:true, tint:0xe3d09c, scale:1.8, respawnMs:60000 },
  veil_raider: { id: 'veil_raider', level: 10, rank: 'normal', name: 'Saqueador del Velo', model: 'OrcBrute', tint: 0x90c2ba },
  veil_guardian: { id: 'veil_guardian', level: 12, rank: 'elite', name: 'Guardián del Velo', model: 'ForestTroll', miniBoss: true, scale: 1.45, tint: 0x73b7ad, respawnMs: 60000 },
  umbra_alpha: { id: "umbra_alpha", level: 4, rank: "elite", name: "Alfa de Umbra", model: "ForestTroll", miniBoss: true, scale: 1.35, respawnMs: 45000, tint: 0x91b969 },
  crypt_acolyte: { id: "crypt_acolyte", level: 5, rank: "normal", name: "Acólito de la Primera Llama", model: "DeathWraith", tint: 0xb89ae0 },
  crypt_flameguard: { id: "crypt_flameguard", level: 6, rank: "normal", name: "Guardia de la Segunda Llama", model: "BoneWarden", tint: 0xecb47b },
  crypt_stalker: { id: "crypt_stalker", level: 5, rank: "normal", name: "Acechador del Despertar", model: "DreadStalker", tint: 0x87a9bd, scale: 1.1 },
  crypt_emberbeast: { id: "crypt_emberbeast", level: 6, rank: "normal", name: "Bestia de la Brasa", model: "InfernalDemon", tint: 0xe89962, scale: .85 },
  crypt_behemoth: { id: "crypt_behemoth", level: 6, rank: "elite", name: "Behemoth de la Fragua", model: "ForestTroll", miniBoss: true, tint: 0xb0a18d, scale: 1.4 },
  crypt_warden: { id: "crypt_warden", level: 7, rank: "elite", name: "Custodio de las Dos Llamas", model: "AncientDrake", miniBoss: true, scale: 1.35, tint: 0xf1bc65 },
  umbra_orc: { id: "umbra_orc", level: 3, rank: "normal", name: "Orco de Umbra", model: "OrcBrute" },
  forest_troll: { id: "forest_troll", level: 7, rank: "elite", name: "Bestia del Bosque", model: "ForestTroll", tint: 0xa7b6a0 },
  crypt_wraith: { id: "crypt_wraith", level: 5, rank: "normal", name: "Espectro de la Cripta", model: "DeathWraith", tint: 0xb9c8eb },
  bone_warden: { id: "bone_warden", level: 6, rank: "elite", name: "Custodio de Hueso", model: "BoneWarden", tint: 0xb3a5c6 },
  infernal_demon: { id: "infernal_demon", level: 8, rank: "normal", name: "Demonio de Ceniza", model: "InfernalDemon", tint: 0xffaf91 },
  ancient_drake: { id: "ancient_drake", level: 10, rank: "elite", name: "Draco del Umbral", model: "AncientDrake", miniBoss: true, scale: 1.15, respawnMs: 60000, tint: 0xc7a6a0 },
  // Bosque de Umbra (Lv 1-3) — huesos musgosos
  skeleton_minion: { id: "skeleton_minion", level: 1, rank: "normal", name: "Explorador Óseo", model: "DreadStalker", tint: 0x9fc48f },
  skeleton_warrior: { id: "skeleton_warrior", level: 3, rank: "normal", name: "Guerrero Musgoso", model: "DreadKnight", tint: 0x9fc48f },
  // Ruinas de Nihil (Lv 3-6) — guardianes de la cripta (violeta)
  crypt_minion: { id: "crypt_minion", level: 4, rank: "normal", name: "Siervo de la Cripta", model: "DreadStalker", tint: 0xb9a7e8 },
  crypt_warrior: { id: "crypt_warrior", level: 5, rank: "normal", name: "Guardián de la Cripta", model: "DreadKnight", tint: 0xb9a7e8 },
  crypt_sentinel: { id: "crypt_sentinel", level: 6, rank: "elite", name: "Centinela de Nihil", model: "DreadKnight", miniBoss: true, tint: 0x8a6fd4, scale: 1.5, respawnMs: 60000 },
  // Yermo Ceniciento (Lv 6-9) — verdugos ardientes (rojo/ceniza), élites
  ash_minion: { id: "ash_minion", level: 7, rank: "normal", name: "Ceniciento", model: "DreadStalker", tint: 0xff9a6a, scale: 1.05 },
  ash_warrior: { id: "ash_warrior", level: 8, rank: "normal", name: "Verdugo Ardiente", model: "DreadKnight", tint: 0xff6a3c, scale: 1.15 },
  // Trono del Rey Nihil — jefe final
  skeleton_king: { id: "skeleton_king", level: 10, rank: "boss", name: "Rey Nihil", model: "DreadKnight", boss: true, scale: 2.0, respawnMs: 60000, tint: 0xffe6a8 },
};

export function getTemplate(id: string): MobTemplate {
  const t = MOB_TEMPLATES[id];
  if (!t) throw new Error(`getTemplate: template desconocido: ${id}`);
  return t;
}

export interface SpawnZone {
  id: string;
  /** Mapa (ver world.ts ZONES) al que pertenece este cluster de spawn. */
  mapId: string;
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
// Etapa 15: cada cluster vive DENTRO de un mapa (mapId) y se reparte por su región
// grande (center ±65). Más clusters/mobs para llenar los mapas amplios. Los mapas se
// viajan con M (no se camina entre ellos); la dificultad sigue escalando por mapa.
export const SPAWN_ZONES: SpawnZone[] = [
  { id:'monastery_guards_west', mapId:'monasterio', templateId:'memory_guard', centerX:1175, centerZ:444, radius:4, count:2 },
  { id:'monastery_guards_east', mapId:'monasterio', templateId:'memory_guard', centerX:1230, centerZ:447, radius:3, count:2 },
  { id:'monastery_jailer', mapId:'monasterio', templateId:'memory_jailer', centerX:1178, centerZ:417, radius:0, count:1 },
  { id:'monastery_prior', mapId:'monasterio', templateId:'memory_prior', centerX:1200, centerZ:401, radius:0, count:1 },
  { id: 'veil_raiders_west', mapId: 'marismas', templateId: 'veil_raider', centerX: 1182, centerZ: 132, radius: 4, count: 2 },
  { id: 'veil_raiders_east', mapId: 'marismas', templateId: 'veil_raider', centerX: 1240, centerZ: 128, radius: 5, count: 2 },
  { id: 'veil_guardian', mapId: 'marismas', templateId: 'veil_guardian', centerX: 1200, centerZ: 102, radius: 0, count: 1 },
  { id: "bosque_alpha", mapId: "bosque", templateId: "umbra_alpha", centerX: 260, centerZ: -42, radius: 2, count: 1 },
  { id: "crypt_acolytes", mapId: "cripta", templateId: "crypt_acolyte", centerX: 850, centerZ: 32, radius: 8, count: 3 },
  { id: "crypt_stalkers", mapId: "cripta", templateId: "crypt_stalker", centerX: 874, centerZ: 17, radius: 7, count: 3 },
  { id: "crypt_flameguards", mapId: "cripta", templateId: "crypt_flameguard", centerX: 925, centerZ: -44, radius: 8, count: 3 },
  { id: "crypt_emberbeasts", mapId: "cripta", templateId: "crypt_emberbeast", centerX: 951, centerZ: -48, radius: 6, count: 2 },
  { id: "crypt_behemoth", mapId: "cripta", templateId: "crypt_behemoth", centerX: 939, centerZ: -71, radius: 0, count: 1 },
  { id: "crypt_boss", mapId: "cripta", templateId: "crypt_warden", centerX: CRYPT_BOSS.x, centerZ: CRYPT_BOSS.z, radius: 0, count: 1 },
  { id: "bosque_orcs", mapId: "bosque", templateId: "umbra_orc", centerX: 335, centerZ: -5, radius: 8, count: 4 },
  { id: "bosque_beasts", mapId: "bosque", templateId: "forest_troll", centerX: 350, centerZ: -48, radius: 4, count: 1 },
  { id: "ruinas_wraiths", mapId: "ruinas", templateId: "crypt_wraith", centerX: -38, centerZ: 302, radius: 7, count: 3 },
  { id: "ruinas_wardens", mapId: "ruinas", templateId: "bone_warden", centerX: 32, centerZ: 265, radius: 7, count: 2 },
  { id: "yermo_demons", mapId: "yermo", templateId: "infernal_demon", centerX: 340, centerZ: 300, radius: 7, count: 3 },
  { id: "trono_drake", mapId: "trono", templateId: "ancient_drake", centerX: 625, centerZ: 145, radius: 4, count: 1 },
  // ── Bosque de Umbra (mapa center 300,0) — Lv 1-3 ──
  { id: "bosque_scouts_1", mapId: "bosque", templateId: "skeleton_minion", centerX: 280, centerZ: 20, radius: 12, count: 5 },
  { id: "bosque_scouts_2", mapId: "bosque", templateId: "skeleton_minion", centerX: 320, centerZ: -30, radius: 12, count: 5 },
  { id: "bosque_warriors_1", mapId: "bosque", templateId: "skeleton_warrior", centerX: 265, centerZ: -20, radius: 12, count: 4 },
  { id: "bosque_warriors_2", mapId: "bosque", templateId: "skeleton_warrior", centerX: 335, centerZ: 25, radius: 12, count: 4 },
  { id: "bosque_deep", mapId: "bosque", templateId: "skeleton_warrior", centerX: 300, centerZ: -45, radius: 10, count: 3 },
  // ── Ruinas de Nihil (mapa center 0,300) — Lv 3-6 + mini-jefe ──
  { id: "ruinas_siervos_1", mapId: "ruinas", templateId: "crypt_minion", centerX: -25, centerZ: 320, radius: 12, count: 5 },
  { id: "ruinas_siervos_2", mapId: "ruinas", templateId: "crypt_minion", centerX: 25, centerZ: 285, radius: 12, count: 4 },
  { id: "ruinas_guardianes_1", mapId: "ruinas", templateId: "crypt_warrior", centerX: -30, centerZ: 275, radius: 12, count: 4 },
  { id: "ruinas_guardianes_2", mapId: "ruinas", templateId: "crypt_warrior", centerX: 30, centerZ: 325, radius: 12, count: 4 },
  { id: "ruinas_centinela", mapId: "ruinas", templateId: "crypt_sentinel", centerX: 0, centerZ: 265, radius: 3, count: 1 },
  // ── Yermo Ceniciento (mapa center 300,300) — Lv 6-9 élites ──
  { id: "yermo_cenicientos_1", mapId: "yermo", templateId: "ash_minion", centerX: 275, centerZ: 320, radius: 12, count: 5 },
  { id: "yermo_cenicientos_2", mapId: "yermo", templateId: "ash_minion", centerX: 325, centerZ: 285, radius: 12, count: 4 },
  { id: "yermo_verdugos_1", mapId: "yermo", templateId: "ash_warrior", centerX: 285, centerZ: 275, radius: 12, count: 4 },
  { id: "yermo_verdugos_2", mapId: "yermo", templateId: "ash_warrior", centerX: 320, centerZ: 325, radius: 12, count: 4 },
  // ── Trono del Rey Nihil (mapa center 600,150) — jefe ──
  { id: "trono_rey", mapId: "trono", templateId: "skeleton_king", centerX: 600, centerZ: 130, radius: 3, count: 1 },
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
