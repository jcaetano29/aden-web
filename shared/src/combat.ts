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

export const MOB_COMBAT: Record<string, CombatStats> = {
  skeleton_minion: { maxHp: 30, pAtk: 8, pDef: 5, attackCooldownMs: 2000 },
  skeleton_warrior: { maxHp: 60, pAtk: 14, pDef: 12, attackCooldownMs: 1800 },
};

export function getMobCombat(templateId: string): CombatStats {
  const c = MOB_COMBAT[templateId];
  if (!c) throw new Error(`getMobCombat: sin stats para ${templateId}`);
  return c;
}

export interface SkillConfig {
  id: string;
  mpCost: number;
  cooldownMs: number;
  factor: number;
}

export const POWER_STRIKE: SkillConfig = { id: "power_strike", mpCost: 10, cooldownMs: 4000, factor: 2.5 };

export const SKILLS: Record<string, SkillConfig> = {
  power_strike: POWER_STRIKE,
};

export function getSkill(id: string): SkillConfig {
  const s = SKILLS[id];
  if (!s) throw new Error(`getSkill: skill desconocida ${id}`);
  return s;
}

export const TOWN = { x: 0, z: 0 } as const;
export const SAFE_RADIUS = 8;
export const PLAYER_RESPAWN_MS = 4000;

export const ATTACK_RANGE = 2.5;
export const MOB_RESPAWN_MS = 5000;
