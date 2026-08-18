import { computeDamage, distance2D } from "@aden/shared";

export interface Combatant {
  x: number;
  z: number;
  hp: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
}

export function canAttack(
  attacker: Combatant,
  target: { x: number; z: number; hp: number; dead?: boolean },
  range: number,
): boolean {
  if (attacker.attackCooldownMs > 0) return false;
  if (target.hp <= 0 || target.dead) return false;
  return distance2D(attacker.x, attacker.z, target.x, target.z) <= range;
}

export function resolveAttack(
  attacker: Combatant,
  target: { hp: number; pDef: number },
  factor: number,
  variance: number,
  cooldownMs: number,
): number {
  // Apply buff multipliers via duck-typing: if buff fields exist and are active, use them; otherwise default to 1
  const atkMult = ((attacker as any).atkBuffMs ?? 0) > 0 ? ((attacker as any).atkBuffMult ?? 1) : 1;
  const defMult = ((target as any).defBuffMs ?? 0) > 0 ? ((target as any).defBuffMult ?? 1) : 1;

  const dmg = computeDamage(attacker.pAtk * atkMult, target.pDef * defMult, factor, variance);
  target.hp = Math.max(0, target.hp - dmg);
  attacker.attackCooldownMs = cooldownMs;
  return dmg;
}

export function tickCooldown(c: { attackCooldownMs: number }, dtMs: number): void {
  if (c.attackCooldownMs > 0) c.attackCooldownMs = Math.max(0, c.attackCooldownMs - dtMs);
}
