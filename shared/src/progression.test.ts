import { describe, it, expect } from "vitest";
import { expToNextLevel, gainExp, getMobExp, LEVEL_GROWTH, type Leveled } from "./progression.js";

function p(over: Partial<Leveled> = {}): Leveled {
  return { exp: 0, level: 1, maxHp: 100, maxMp: 50, pAtk: 15, pDef: 10, hp: 100, mp: 50, ...over };
}

describe("expToNextLevel", () => {
  it("crece con el nivel", () => {
    expect(expToNextLevel(1)).toBe(100);
    expect(expToNextLevel(2)).toBeGreaterThan(expToNextLevel(1));
  });
});

describe("gainExp", () => {
  it("acumula EXP sin subir si no alcanza", () => {
    const q = p(); const lvls = gainExp(q, 50);
    expect(lvls).toBe(0); expect(q.level).toBe(1); expect(q.exp).toBe(50);
  });
  it("sube un nivel y aplica crecimiento + rellena hp/mp", () => {
    const q = p({ hp: 10, mp: 5 });
    const lvls = gainExp(q, 100);
    expect(lvls).toBe(1); expect(q.level).toBe(2);
    expect(q.exp).toBe(0);
    expect(q.maxHp).toBe(100 + LEVEL_GROWTH.hp);
    expect(q.pAtk).toBe(15 + LEVEL_GROWTH.pAtk);
    expect(q.hp).toBe(q.maxHp); expect(q.mp).toBe(q.maxMp); // refill
  });
  it("sube varios niveles de un golpe con el remanente correcto", () => {
    const q = p();
    const lvls = gainExp(q, expToNextLevel(1) + expToNextLevel(2) + 10);
    expect(lvls).toBe(2); expect(q.level).toBe(3); expect(q.exp).toBe(10);
  });
});

describe("getMobExp", () => {
  it("devuelve EXP por template y 0 si falta", () => {
    expect(getMobExp("skeleton_minion")).toBe(15);
    expect(getMobExp("skeleton_warrior")).toBe(40);
    expect(getMobExp("dragon")).toBe(0);
  });
});
