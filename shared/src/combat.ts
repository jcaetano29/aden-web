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
  type: "damage" | "heal" | "buff" | "dot";
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
}

export const POWER_STRIKE: SkillConfig = { id: "power_strike", name: "Golpe Poderoso", mpCost: 10, cooldownMs: 4000, type: "damage", factor: 2.5, vfxColor: 0xffe066 };

export const SKILLS: Record<string, SkillConfig> = {
  power_strike: POWER_STRIKE,
  shield_bash: { id: "shield_bash", name: "Golpe de Escudo", mpCost: 8, cooldownMs: 5000, type: "damage", factor: 2.0, vfxColor: 0x9ecbff },
  fireball: { id: "fireball", name: "Bola de Fuego", mpCost: 22, cooldownMs: 4500, type: "damage", factor: 3.6, vfxColor: 0xff6a2a, projectile: true },
  brutal_strike: { id: "brutal_strike", name: "Golpe Brutal", mpCost: 12, cooldownMs: 4000, type: "damage", factor: 3.0, vfxColor: 0xff4040 },
  backstab: { id: "backstab", name: "Puñalada", mpCost: 8, cooldownMs: 2500, type: "damage", factor: 2.8, vfxColor: 0xb96bff },
  guard: { id: "guard", name: "Guardia", mpCost: 10, cooldownMs: 12000, type: "buff", buffStat: "pDef", buffMult: 1.6, buffMs: 6000, vfxColor: 0x4fa3ff },
  second_wind: { id: "second_wind", name: "Segundo Aire", mpCost: 15, cooldownMs: 15000, type: "heal", healPct: 0.4, vfxColor: 0x66e08a },
  ice_lance: { id: "ice_lance", name: "Lanza de Hielo", mpCost: 12, cooldownMs: 2500, type: "damage", factor: 2.2, vfxColor: 0x66d0ff, projectile: true },
  arcane_mend: { id: "arcane_mend", name: "Cura Arcana", mpCost: 18, cooldownMs: 12000, type: "heal", healPct: 0.3, vfxColor: 0x8fe0ff },
  rage: { id: "rage", name: "Furia", mpCost: 12, cooldownMs: 12000, type: "buff", buffStat: "pAtk", buffMult: 1.5, buffMs: 6000, vfxColor: 0xff5252 },
  cleave: { id: "cleave", name: "Tajo", mpCost: 10, cooldownMs: 3000, type: "damage", factor: 2.4, vfxColor: 0xffa640 },
  poison: { id: "poison", name: "Veneno", mpCost: 10, cooldownMs: 6000, type: "dot", dotDps: 12, dotMs: 5000, vfxColor: 0x8fdd4a },
  evasion: { id: "evasion", name: "Evasión", mpCost: 8, cooldownMs: 10000, type: "buff", buffStat: "pDef", buffMult: 1.8, buffMs: 4000, vfxColor: 0xffffff },
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
