export function computeDamage(pAtk: number, pDef: number, factor: number, variance: number): number {
  const raw = pAtk * factor * (100 / (100 + pDef)) * variance;
  return Math.max(1, Math.round(raw));
}

export interface CombatStats {
  maxHp: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
}

export const PLAYER_COMBAT: CombatStats = { maxHp: 100, pAtk: 15, pDef: 10, attackCooldownMs: 1500 };

export const MOB_COMBAT: Record<string, CombatStats> = {
  skeleton_minion: { maxHp: 30, pAtk: 8, pDef: 5, attackCooldownMs: 2000 },
  skeleton_warrior: { maxHp: 60, pAtk: 14, pDef: 12, attackCooldownMs: 1800 },
};

export function getMobCombat(templateId: string): CombatStats {
  const c = MOB_COMBAT[templateId];
  if (!c) throw new Error(`getMobCombat: sin stats para ${templateId}`);
  return c;
}

export const ATTACK_RANGE = 2.5;
export const MOB_RESPAWN_MS = 5000;
