import { computeDamage, distance2D, type EquipmentEffects, type DamageElement } from "@aden/shared";

export interface Combatant {
  x: number;
  z: number;
  hp: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
  itemEffects?: EquipmentEffects;
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
  target: { hp: number; pDef: number; itemEffects?: EquipmentEffects },
  factor: number,
  variance: number,
  cooldownMs: number,
  rng: () => number = Math.random,
  element?: DamageElement,
): number {
  // Apply buff multipliers via duck-typing: if buff fields exist and are active, use them; otherwise default to 1
  const atkMult = ((attacker as any).atkBuffMs ?? 0) > 0 ? ((attacker as any).atkBuffMult ?? 1) : 1;
  const defMult = ((target as any).defBuffMs ?? 0) > 0 ? ((target as any).defBuffMult ?? 1) : 1;

  attacker.attackCooldownMs = cooldownMs;
  if(target.itemEffects?.dodge && rng()<target.itemEffects.dodge)return 0;
  const excellent=attacker.itemEffects?.excellentChance && rng()<attacker.itemEffects.excellentChance;
  const critical=attacker.itemEffects?.critChance && rng()<attacker.itemEffects.critChance;
  const multiplier=excellent?1.75:critical?1.5:1;
  const resist=element?(target.itemEffects?.[`${element}Resist`]??0):0;
  const dmg = Math.max(1,Math.round(computeDamage(attacker.pAtk * atkMult, target.pDef * defMult, factor, variance)*multiplier*(1-(target.itemEffects?.reduction??0))*(1-resist)));
  const actual=Math.min(target.hp,dmg);
  target.hp = Math.max(0, target.hp - dmg);
  if(target.itemEffects?.reflect)attacker.hp=Math.max(0,attacker.hp-Math.floor(actual*target.itemEffects.reflect));
  return dmg;
}

export function tickCooldown(c: { attackCooldownMs: number }, dtMs: number): void {
  if (c.attackCooldownMs > 0) c.attackCooldownMs = Math.max(0, c.attackCooldownMs - dtMs);
}
