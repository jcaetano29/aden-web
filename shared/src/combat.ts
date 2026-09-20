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
  umbra_orc: { maxHp: 55, pAtk: 12, pDef: 10, attackCooldownMs: 2000 },
  forest_troll: { maxHp: 95, pAtk: 17, pDef: 14, attackCooldownMs: 2600 },
  crypt_wraith: { maxHp: 95, pAtk: 21, pDef: 10, attackCooldownMs: 1850 },
  bone_warden: { maxHp: 180, pAtk: 25, pDef: 24, attackCooldownMs: 2200 },
  infernal_demon: { maxHp: 300, pAtk: 34, pDef: 27, attackCooldownMs: 2000 },
  ancient_drake: { maxHp: 650, pAtk: 36, pDef: 29, attackCooldownMs: 2400 },
  // Bosque de Umbra (Lv 1-3)
  skeleton_minion: { maxHp: 30, pAtk: 8, pDef: 5, attackCooldownMs: 2000 },
  skeleton_warrior: { maxHp: 60, pAtk: 14, pDef: 12, attackCooldownMs: 1800 },
  // Ruinas de Nihil (Lv 3-6)
  crypt_minion: { maxHp: 80, pAtk: 17, pDef: 13, attackCooldownMs: 1900 },
  crypt_warrior: { maxHp: 140, pAtk: 23, pDef: 20, attackCooldownMs: 1800 },
  crypt_sentinel: { maxHp: 340, pAtk: 30, pDef: 26, attackCooldownMs: 2000 }, // mini-jefe
  // Yermo Ceniciento (Lv 6-9) — élites
  ash_minion: { maxHp: 170, pAtk: 27, pDef: 22, attackCooldownMs: 1700 },
  ash_warrior: { maxHp: 280, pAtk: 35, pDef: 30, attackCooldownMs: 1600 },
  // Trono del Rey Nihil — jefe final
  skeleton_king: { maxHp: 1000, pAtk: 38, pDef: 32, attackCooldownMs: 2100 },
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
  power_strike: POWER_STRIKE,

  // ── Caballero (tanque / control) ──
  shield_bash: { id: "shield_bash", name: "Golpe de Escudo", mpCost: 10, cooldownMs: 5000, type: "damage", factor: 2.0, stunMs: 900, vfxColor: 0x9ecbff },
  guard: { id: "guard", name: "Guardia", mpCost: 12, cooldownMs: 12000, type: "buff", buffStat: "pDef", buffMult: 1.6, buffMs: 6000, vfxColor: 0x4fa3ff },
  second_wind: { id: "second_wind", name: "Segundo Aire", mpCost: 16, cooldownMs: 14000, type: "heal", healPct: 0.4, vfxColor: 0x66e08a },
  shield_charge: { id: "shield_charge", name: "Carga con Escudo", mpCost: 16, cooldownMs: 9000, type: "damage", factor: 1.8, dash: "toTarget", rootMs: 1200, vfxColor: 0xbfe0ff },
  iron_will: { id: "iron_will", name: "Voluntad de Hierro", mpCost: 18, cooldownMs: 18000, type: "buff", buffStat: "pDef", buffMult: 1.4, buffMs: 5000, cleanse: true, vfxColor: 0xffe066 },
  last_stand: { id: "last_stand", name: "Última Resistencia", mpCost: 28, cooldownMs: 40000, type: "buff", buffStat: "pDef", buffMult: 2.0, buffMs: 8000, healPct: 0.25, vfxColor: 0xffd54f },

  // ── Mago (kite / ranged) ──
  fireball: { id: "fireball", name: "Bola de Fuego", mpCost: 16, cooldownMs: 3500, type: "damage", factor: 3.4, vfxColor: 0xff6a2a, projectile: true },
  ice_lance: { id: "ice_lance", name: "Lanza de Hielo", mpCost: 14, cooldownMs: 3000, type: "damage", factor: 2.2, rootMs: 800, vfxColor: 0x66d0ff, projectile: true },
  arcane_mend: { id: "arcane_mend", name: "Cura Arcana", mpCost: 20, cooldownMs: 12000, type: "heal", healPct: 0.32, vfxColor: 0x8fe0ff },
  blink: { id: "blink", name: "Parpadeo", mpCost: 14, cooldownMs: 9000, type: "dash", dash: "away", dashRange: 9, vfxColor: 0xc9b0ff },
  frost_nova: { id: "frost_nova", name: "Nova de Escarcha", mpCost: 24, cooldownMs: 12000, type: "damage", factor: 2.6, rootMs: 2000, vfxColor: 0xaef0ff },
  meteor: { id: "meteor", name: "Meteoro", mpCost: 40, cooldownMs: 16000, type: "damage", factor: 5.5, vfxColor: 0xff7a2a, projectile: true },

  // ── Bárbaro (enganche / sustain) ──
  brutal_strike: { id: "brutal_strike", name: "Golpe Brutal", mpCost: 12, cooldownMs: 4000, type: "damage", factor: 3.0, vfxColor: 0xff4040 },
  rage: { id: "rage", name: "Furia", mpCost: 14, cooldownMs: 12000, type: "buff", buffStat: "pAtk", buffMult: 1.5, buffMs: 6000, vfxColor: 0xff5252 },
  cleave: { id: "cleave", name: "Tajo", mpCost: 10, cooldownMs: 3000, type: "damage", factor: 2.4, vfxColor: 0xffa640 },
  charge: { id: "charge", name: "Embestida", mpCost: 16, cooldownMs: 10000, type: "damage", factor: 2.0, dash: "toTarget", stunMs: 1000, vfxColor: 0xffb060 },
  bloodthirst: { id: "bloodthirst", name: "Sed de Sangre", mpCost: 16, cooldownMs: 8000, type: "damage", factor: 2.8, lifestealPct: 0.6, vfxColor: 0xcc2b2b },
  rampage: { id: "rampage", name: "Masacre", mpCost: 30, cooldownMs: 40000, type: "buff", buffStat: "pAtk", buffMult: 1.9, buffMs: 8000, vfxColor: 0xff3030 },

  // ── Pícaro (burst / evasión) ──
  backstab: { id: "backstab", name: "Puñalada", mpCost: 10, cooldownMs: 2500, type: "damage", factor: 2.8, vfxColor: 0xb96bff },
  poison: { id: "poison", name: "Veneno", mpCost: 12, cooldownMs: 6000, type: "dot", dotDps: 14, dotMs: 5000, vfxColor: 0x8fdd4a },
  evasion: { id: "evasion", name: "Evasión", mpCost: 10, cooldownMs: 10000, type: "buff", buffStat: "pDef", buffMult: 1.8, buffMs: 4000, vfxColor: 0xffffff },
  shadowstep: { id: "shadowstep", name: "Paso Sombrío", mpCost: 14, cooldownMs: 8000, type: "damage", factor: 2.4, dash: "toTarget", vfxColor: 0x9b6bff },
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
