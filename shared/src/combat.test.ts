import { describe, it, expect } from "vitest";
import { computeDamage, PLAYER_COMBAT, getMobCombat, ATTACK_RANGE } from "./combat.js";

describe("computeDamage", () => {
  it("baja con más pDef y sube con más pAtk/factor", () => {
    const low = computeDamage(15, 50, 1, 1);
    const high = computeDamage(15, 5, 1, 1);
    expect(high).toBeGreaterThan(low);
  });
  it("nunca es menor a 1", () => {
    expect(computeDamage(1, 1000, 1, 0.9)).toBeGreaterThanOrEqual(1);
  });
  it("es determinístico con variance fija y devuelve entero", () => {
    const d = computeDamage(15, 10, 1, 1);
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBe(Math.round(15 * 1 * (100 / 110) * 1));
  });
  it("Power Strike (factor mayor) pega más que auto-attack", () => {
    expect(computeDamage(15, 10, 2.5, 1)).toBeGreaterThan(computeDamage(15, 10, 1, 1));
  });
});

describe("config", () => {
  it("PLAYER_COMBAT y mobs tienen valores esperados", () => {
    expect(PLAYER_COMBAT.maxHp).toBe(100);
    expect(getMobCombat("skeleton_minion").maxHp).toBe(30);
    expect(getMobCombat("skeleton_warrior").pDef).toBe(12);
    expect(ATTACK_RANGE).toBe(2.5);
  });
  it("getMobCombat lanza para template desconocido", () => {
    expect(() => getMobCombat("dragon")).toThrow();
  });
});
