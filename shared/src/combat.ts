import { ITEM_SKILLS } from './itemSkills.js';

export function computeDamage(pAtk: number, pDef: number, factor: number, variance: number): number {
  const raw = pAtk * factor * (100 / (100 + pDef)) * variance;
  return Math.max(1, Math.round(raw));
}

export interface CombatStats {
  maxHp: number;
  maxMp?: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
}

export const PLAYER_COMBAT: CombatStats = { maxHp: 100, maxMp: 50, pAtk: 15, pDef: 10, attackCooldownMs: 1500 };

// Etapa 11: las stats escalan con la profundidad de la zona (ver world.ts). El salto
// de dificultad entre zonas es lo que gatea la progresión sin muros.
export const MOB_COMBAT: Record<string, CombatStats> = {
  ember_imp: { maxHp: 1600, pAtk: 118, pDef: 60, attackCooldownMs: 2200 },
  young_drake: { maxHp: 1750, pAtk: 124, pDef: 64, attackCooldownMs: 2400 },
  forge_construct: { maxHp: 1900, pAtk: 130, pDef: 68, attackCooldownMs: 2600 },
  primal_smelter: { maxHp: 4800, pAtk: 138, pDef: 70, attackCooldownMs: 2600 },
  forged_guardian: { maxHp: 1500, pAtk: 120, pDef: 62, attackCooldownMs: 2600 },
  vharzul: { maxHp: 12000, pAtk: 150, pDef: 76, attackCooldownMs: 2400 },
  magma_wyrm: { maxHp: 14000, pAtk: 200, pDef: 95, attackCooldownMs: 2800 },
  mine_digger: { maxHp: 1400, pAtk: 90, pDef: 46, attackCooldownMs: 2200 },
  mine_armor: { maxHp: 1400, pAtk: 95, pDef: 54, attackCooldownMs: 2400 },
  cave_troll: { maxHp: 1500, pAtk: 108, pDef: 58, attackCooldownMs: 2600 },
  mine_foreman: { maxHp: 3950, pAtk: 122, pDef: 64, attackCooldownMs: 2600 },
  halden: { maxHp: 8750, pAtk: 133, pDef: 70, attackCooldownMs: 2400 },
  iron_colossus: { maxHp: 9800, pAtk: 175, pDef: 84, attackCooldownMs: 2800 },
  memory_guard: { maxHp:650, pAtk:80, pDef:42, attackCooldownMs:2200 },
  memory_jailer: { maxHp:2300, pAtk:105, pDef:54, attackCooldownMs:2600 },
  memory_prior: { maxHp:4200, pAtk:125, pDef:62, attackCooldownMs:2400 },
  veil_raider: { maxHp: 440, pAtk: 58, pDef: 34, attackCooldownMs: 2300 },
  veil_guardian: { maxHp: 1700, pAtk: 95, pDef: 48, attackCooldownMs: 2600 },
  umbra_alpha: { maxHp: 200, pAtk: 18, pDef: 14, attackCooldownMs: 2500 },
  crypt_acolyte: { maxHp: 65, pAtk: 18, pDef: 10, attackCooldownMs: 2400 },
  crypt_stalker: { maxHp: 70, pAtk: 19, pDef: 11, attackCooldownMs: 1800 },
  crypt_flameguard: { maxHp: 100, pAtk: 22, pDef: 17, attackCooldownMs: 2200 },
  crypt_emberbeast: { maxHp: 85, pAtk: 16, pDef: 12, attackCooldownMs: 1400 },
  crypt_behemoth: { maxHp: 340, pAtk: 38, pDef: 25, attackCooldownMs: 3000 },
  crypt_warden: { maxHp: 1300, pAtk: 60, pDef: 35, attackCooldownMs: 2400 },
  umbra_orc: { maxHp: 55, pAtk: 12, pDef: 10, attackCooldownMs: 2000 },
  forest_troll: { maxHp: 360, pAtk: 40, pDef: 25, attackCooldownMs: 2600 },
  crypt_wraith: { maxHp: 95, pAtk: 21, pDef: 10, attackCooldownMs: 1850 },
  bone_warden: { maxHp: 180, pAtk: 25, pDef: 24, attackCooldownMs: 2200 },
  infernal_demon: { maxHp: 300, pAtk: 34, pDef: 27, attackCooldownMs: 2000 },
  ancient_drake: { maxHp: 1100, pAtk: 55, pDef: 35, attackCooldownMs: 2400 },
  // Bosque de Umbra (Lv 1-3)
  skeleton_minion: { maxHp: 30, pAtk: 8, pDef: 5, attackCooldownMs: 2000 },
  skeleton_warrior: { maxHp: 60, pAtk: 14, pDef: 12, attackCooldownMs: 1800 },
  // Ruinas de Nihil (Lv 3-6)
  crypt_minion: { maxHp: 80, pAtk: 17, pDef: 13, attackCooldownMs: 1900 },
  crypt_warrior: { maxHp: 140, pAtk: 23, pDef: 20, attackCooldownMs: 1800 },
  crypt_sentinel: { maxHp: 700, pAtk: 52, pDef: 30, attackCooldownMs: 2000 }, // mini-jefe
  // Yermo Ceniciento (Lv 6-9) — élites
  ash_minion: { maxHp: 170, pAtk: 27, pDef: 22, attackCooldownMs: 1700 },
  ash_warrior: { maxHp: 280, pAtk: 35, pDef: 30, attackCooldownMs: 1600 },
  // Trono del Rey Nihil — jefe final
  skeleton_king: { maxHp: 2800, pAtk: 85, pDef: 40, attackCooldownMs: 2100 },
};

export function getMobCombat(templateId: string): CombatStats {
  const c = MOB_COMBAT[templateId];
  if (!c) throw new Error(`getMobCombat: sin stats para ${templateId}`);
  return c;
}

export interface SkillConfig {
  id: string;
  name: string;
  mpCost: number;
  cooldownMs: number;
  type: "damage" | "heal" | "buff" | "dot" | "dash";
  factor?: number;
  healPct?: number;
  buffStat?: "pAtk" | "pDef";
  buffMult?: number;
  buffMs?: number;
  dotDps?: number;
  dotMs?: number;
  range?: number;
  // Etapa 17: pistas visuales para el VFX del cliente.
  /** Color del efecto (hex 0xRRGGBB). */
  vfxColor?: number;
  /** true = skill de proyectil (viaja del caster al objetivo antes de impactar). */
  projectile?: boolean;
  // ── Etapa 22: mecánicas de counterplay ──
  /** Aturde al objetivo (ms): no se mueve ni castea. */
  stunMs?: number;
  /** Enraíza al objetivo (ms): no se mueve (puede castear). */
  rootMs?: number;
  /** Desplazamiento del caster: hacia el objetivo (enganche) o lejos (escape). */
  dash?: "toTarget" | "away";
  /** Distancia del dash "away" (unidades de mundo). */
  dashRange?: number;
  /** Limpia stun/root/veneno del caster. */
  cleanse?: boolean;
  /** Cura al caster por esta fracción del daño infligido (0..1). */
  lifestealPct?: number;
}

export const POWER_STRIKE: SkillConfig = { id: "power_strike", name: "Golpe Poderoso", mpCost: 10, cooldownMs: 4000, type: "damage", factor: 2.5, vfxColor: 0xffe066 };

// Etapa 22: 6 skills por clase con roles + counterplay. Números afinables.
export const SKILLS: Record<string, SkillConfig> = {
  ...ITEM_SKILLS,
  aimed_shot: { id:"aimed_shot", name:"Tiro del Vigía", type:"damage", factor:2.2, mpCost:10, cooldownMs:3500, range:10, projectile:true, vfxColor:0x8cce74 },
  trail_mend: { id:"trail_mend", name:"Aliento del Bosque", type:"heal", healPct:.25, mpCost:15, cooldownMs:12000, vfxColor:0x71ca97 },
  snaring_shot: { id:"snaring_shot", name:"Flecha de Zarzas", type:"damage", factor:1.6, rootMs:1200, mpCost:16, cooldownMs:7000, range:10, projectile:true, vfxColor:0x81a65f },
  retreat: { id:"retreat", name:"Paso del Sendero", type:"dash", dash:"away", dashRange:7, mpCost:14, cooldownMs:9000, vfxColor:0x9de5b1 },
  eagle_focus: { id:"eagle_focus", name:"Ojo del Horizonte", type:"buff", buffStat:"pAtk", buffMult:1.4, buffMs:5000, mpCost:20, cooldownMs:16000, vfxColor:0xffd77f },
  piercing_shot: { id:"piercing_shot", name:"Saeta del Alba", type:"damage", factor:4.2, mpCost:30, cooldownMs:14000, range:12, projectile:true, vfxColor:0xffeaaa },
  power_strike: POWER_STRIKE,

  // ── Caballero (tanque / control) ──
  shield_bash: { id: "shield_bash", name: "Golpe de Escudo", mpCost: 10, cooldownMs: 5000, type: "damage", factor: 2.0, stunMs: 900, vfxColor: 0x9ecbff },
  guard: { id: "guard", name: "Guardia", mpCost: 12, cooldownMs: 12000, type: "buff", buffStat: "pDef", buffMult: 1.6, buffMs: 6000, vfxColor: 0x4fa3ff },
  second_wind: { id: "second_wind", name: "Segundo Aire", mpCost: 16, cooldownMs: 14000, type: "heal", healPct: 0.4, vfxColor: 0x66e08a },
  shield_charge: { id: "shield_charge", range: 12, name: "Carga con Escudo", mpCost: 16, cooldownMs: 9000, type: "damage", factor: 1.8, dash: "toTarget", rootMs: 1200, vfxColor: 0xbfe0ff },
  iron_will: { id: "iron_will", name: "Voluntad de Hierro", mpCost: 18, cooldownMs: 18000, type: "buff", buffStat: "pDef", buffMult: 1.4, buffMs: 5000, cleanse: true, vfxColor: 0xffe066 },
  last_stand: { id: "last_stand", name: "Última Resistencia", mpCost: 28, cooldownMs: 40000, type: "buff", buffStat: "pDef", buffMult: 2.0, buffMs: 8000, healPct: 0.25, vfxColor: 0xffd54f },

  // ── Mago (kite / ranged) ──
  fireball: { id: "fireball", range: 10, name: "Bola de Fuego", mpCost: 16, cooldownMs: 3500, type: "damage", factor: 3.4, vfxColor: 0xff6a2a, projectile: true },
  ice_lance: { id: "ice_lance", range: 10, name: "Lanza de Hielo", mpCost: 14, cooldownMs: 3000, type: "damage", factor: 2.2, rootMs: 800, vfxColor: 0x66d0ff, projectile: true },
  arcane_mend: { id: "arcane_mend", name: "Cura Arcana", mpCost: 20, cooldownMs: 12000, type: "heal", healPct: 0.32, vfxColor: 0x8fe0ff },
  blink: { id: "blink", name: "Parpadeo", mpCost: 14, cooldownMs: 9000, type: "dash", dash: "away", dashRange: 9, vfxColor: 0xc9b0ff },
  frost_nova: { id: "frost_nova", range: 3, name: "Nova de Escarcha", mpCost: 24, cooldownMs: 12000, type: "damage", factor: 2.6, rootMs: 2000, vfxColor: 0xaef0ff },
  meteor: { id: "meteor", range: 10, name: "Meteoro", mpCost: 40, cooldownMs: 16000, type: "damage", factor: 5.5, vfxColor: 0xff7a2a, projectile: true },

  // ── Bárbaro (enganche / sustain) ──
  brutal_strike: { id: "brutal_strike", name: "Golpe Brutal", mpCost: 12, cooldownMs: 4000, type: "damage", factor: 3.0, vfxColor: 0xff4040 },
  rage: { id: "rage", name: "Furia", mpCost: 14, cooldownMs: 12000, type: "buff", buffStat: "pAtk", buffMult: 1.5, buffMs: 6000, vfxColor: 0xff5252 },
  cleave: { id: "cleave", name: "Tajo", mpCost: 10, cooldownMs: 3000, type: "damage", factor: 2.4, vfxColor: 0xffa640 },
  charge: { id: "charge", range: 12, name: "Embestida", mpCost: 16, cooldownMs: 10000, type: "damage", factor: 2.0, dash: "toTarget", stunMs: 1000, vfxColor: 0xffb060 },
  bloodthirst: { id: "bloodthirst", name: "Sed de Sangre", mpCost: 16, cooldownMs: 8000, type: "damage", factor: 2.8, lifestealPct: 0.6, vfxColor: 0xcc2b2b },
  rampage: { id: "rampage", name: "Masacre", mpCost: 30, cooldownMs: 40000, type: "buff", buffStat: "pAtk", buffMult: 1.9, buffMs: 8000, vfxColor: 0xff3030 },

  // ── Pícaro (burst / evasión) ──
  backstab: { id: "backstab", name: "Puñalada", mpCost: 10, cooldownMs: 2500, type: "damage", factor: 2.8, vfxColor: 0xb96bff },
  poison: { id: "poison", name: "Veneno", mpCost: 12, cooldownMs: 6000, type: "dot", dotDps: 14, dotMs: 5000, vfxColor: 0x8fdd4a },
  evasion: { id: "evasion", name: "Evasión", mpCost: 10, cooldownMs: 10000, type: "buff", buffStat: "pDef", buffMult: 1.8, buffMs: 4000, vfxColor: 0xffffff },
  shadowstep: { id: "shadowstep", range: 12, name: "Paso Sombrío", mpCost: 14, cooldownMs: 8000, type: "damage", factor: 2.4, dash: "toTarget", vfxColor: 0x9b6bff },
  vanish: { id: "vanish", name: "Vanish", mpCost: 16, cooldownMs: 16000, type: "buff", buffStat: "pDef", buffMult: 1.6, buffMs: 3000, cleanse: true, dash: "away", dashRange: 7, vfxColor: 0x6a5a8a },
  assassinate: { id: "assassinate", name: "Asesinato", mpCost: 28, cooldownMs: 14000, type: "damage", factor: 4.8, vfxColor: 0xd040ff },
};

export function getSkill(id: string): SkillConfig {
  const s = SKILLS[id];
  if (!s) throw new Error(`getSkill: skill desconocida ${id}`);
  return s;
}

// Etapa 15: el pueblo es un MAPA seguro entero (ver world.ts). TOWN queda como el
// centro del mapa pueblo, ancla de los NPCs. La seguridad (PvP/aggro off) ahora la
// determina `zone.safe` del mapa actual, no un radio. SAFE_RADIUS se conserva por
// compatibilidad de algunos chequeos legacy, pero el pueblo entero es seguro.
export const TOWN = { x: 0, z: 0 } as const;
export const SAFE_RADIUS = 12;
export const PLAYER_RESPAWN_MS = 4000;

export const ATTACK_RANGE = 2.5;
export const MOB_RESPAWN_MS = 5000;
// Ventana de aviso (wind-up) del ataque de los mobs: durante este tiempo el mob
// queda plantado y muestra el telegraph; al terminar, el golpe solo conecta si
// el objetivo sigue en rango (si no, lo esquivó).
export const ATTACK_WINDUP_MS = 700;

/** Shared server validation and client range feedback. */
export function skillRange(skill: SkillConfig): number {
  return skill.range ?? ATTACK_RANGE;
}
