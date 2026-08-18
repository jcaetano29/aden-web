import { describe, it, expect } from "vitest";
import { computeDamage, PLAYER_COMBAT, getMobCombat, ATTACK_RANGE, getSkill, POWER_STRIKE, TOWN, SAFE_RADIUS, PLAYER_RESPAWN_MS } from "./combat.js";

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

describe("skills y config defensiva", () => {
  it("Power Strike: coste MP, cooldown y factor > 1", () => {
    expect(POWER_STRIKE.mpCost).toBe(10);
    expect(POWER_STRIKE.cooldownMs).toBe(4000);
    expect(POWER_STRIKE.factor).toBeGreaterThan(1);
    expect(getSkill("power_strike")).toBe(POWER_STRIKE);
  });
  it("getSkill lanza para skill desconocida", () => {
    expect(() => getSkill("nope")).toThrow();
  });
  it("jugador tiene MP; pueblo y respawn definidos", () => {
    expect(PLAYER_COMBAT.maxMp).toBe(50);
    expect(TOWN).toEqual({ x: 0, z: 0 });
    expect(SAFE_RADIUS).toBeGreaterThan(0);
    expect(PLAYER_RESPAWN_MS).toBeGreaterThan(0);
  });
  it("las 4 skills característica están definidas", () => {
    const skill = getSkill("shield_bash");
    expect(skill.mpCost).toBe(8);
    expect(skill.cooldownMs).toBe(5000);
    expect(skill.factor).toBe(2.0);

    expect(getSkill("fireball").mpCost).toBe(22);
    expect(getSkill("fireball").factor).toBe(3.6);

    expect(getSkill("brutal_strike").mpCost).toBe(12);
    expect(getSkill("brutal_strike").factor).toBe(3.0);

    expect(getSkill("backstab").mpCost).toBe(8);
    expect(getSkill("backstab").factor).toBe(2.8);
  });
});
