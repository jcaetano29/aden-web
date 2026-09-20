import { describe, it, expect } from "vitest";
import { ATTRIBUTES, attributeBonuses, isValidAttribute, pointsForLevel, POINTS_PER_LEVEL } from "./stats.js";

describe("stats", () => {
  it("attributeBonuses mapea cada atributo a su stat derivado", () => {
    expect(attributeBonuses({ str: 3, agi: 0, vit: 0, ene: 0 }).pAtk).toBe(6);
    expect(attributeBonuses({ str: 0, agi: 4, vit: 0, ene: 0 }).pDef).toBe(8);
    expect(attributeBonuses({ str: 0, agi: 0, vit: 2, ene: 0 }).maxHp).toBe(24);
    expect(attributeBonuses({ str: 0, agi: 0, vit: 0, ene: 5 }).maxMp).toBe(30);
  });

  it("attributeBonuses suma independiente por stat", () => {
    const b = attributeBonuses({ str: 1, agi: 1, vit: 1, ene: 1 });
    expect(b).toEqual({ pAtk: 2, pDef: 2, maxHp: 12, maxMp: 6 });
  });

  it("isValidAttribute acepta los 4 y rechaza otros", () => {
    for (const a of ATTRIBUTES) expect(isValidAttribute(a)).toBe(true);
    expect(isValidAttribute("luck")).toBe(false);
    expect(isValidAttribute("")).toBe(false);
  });

  it("pointsForLevel crece POINTS_PER_LEVEL por nivel desde el 1", () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(POINTS_PER_LEVEL);
    expect(pointsForLevel(5)).toBe(4 * POINTS_PER_LEVEL);
  });
});
