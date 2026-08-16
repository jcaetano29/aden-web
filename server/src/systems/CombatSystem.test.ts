import { describe, it, expect } from "vitest";
import { canAttack, resolveAttack, tickCooldown, type Combatant } from "./CombatSystem.js";
import { ATTACK_RANGE } from "@aden/shared";

function atk(over: Partial<Combatant> = {}): Combatant {
  return { x: 0, z: 0, hp: 100, pAtk: 15, pDef: 10, attackCooldownMs: 0, ...over };
}

describe("canAttack", () => {
  it("true en rango, objetivo vivo y cooldown listo", () => {
    expect(canAttack(atk(), { x: 1, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(true);
  });
  it("false fuera de rango", () => {
    expect(canAttack(atk(), { x: 100, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(false);
  });
  it("false si el cooldown no llegó a 0", () => {
    expect(canAttack(atk({ attackCooldownMs: 500 }), { x: 1, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(false);
  });
  it("false si el objetivo está muerto", () => {
    expect(canAttack(atk(), { x: 1, z: 0, hp: 0 }, ATTACK_RANGE)).toBe(false);
    expect(canAttack(atk(), { x: 1, z: 0, hp: 30, dead: true }, ATTACK_RANGE)).toBe(false);
  });
});

describe("resolveAttack", () => {
  it("aplica daño, resetea cooldown y devuelve el daño", () => {
    const a = atk();
    const t = { hp: 30, pDef: 5 };
    const dmg = resolveAttack(a, t, 1, 1, 1500);
    expect(dmg).toBeGreaterThan(0);
    expect(t.hp).toBe(30 - dmg);
    expect(a.attackCooldownMs).toBe(1500);
  });
  it("no baja el hp por debajo de 0", () => {
    const t = { hp: 5, pDef: 0 };
    resolveAttack(atk({ pAtk: 999 }), t, 1, 1, 1500);
    expect(t.hp).toBe(0);
  });
});

describe("tickCooldown", () => {
  it("descuenta hasta 0 sin pasarse", () => {
    const c = { attackCooldownMs: 100 };
    tickCooldown(c, 66);
    expect(c.attackCooldownMs).toBeCloseTo(34);
    tickCooldown(c, 100);
    expect(c.attackCooldownMs).toBe(0);
  });
});
