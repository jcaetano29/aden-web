import { describe, it, expect } from "vitest";
import { expToNextLevel, gainExp, getMobExp, LEVEL_GROWTH, statsForLevel, statsForClass, type Leveled } from "./progression.js";
import { PLAYER_COMBAT } from "./combat.js";
import { getClass } from "./classes.js";

function p(over: Partial<Leveled> = {}): Leveled {
  const knightL1 = statsForClass("knight", 1);
  return {
    exp: 0,
    level: 1,
    maxHp: knightL1.maxHp,
    maxMp: knightL1.maxMp,
    pAtk: knightL1.pAtk,
    pDef: knightL1.pDef,
    hp: knightL1.maxHp,
    mp: knightL1.maxMp,
    ...over,
  };
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
    const lvls = gainExp(q, 100); // default className="knight"
    expect(lvls).toBe(1); expect(q.level).toBe(2);
    expect(q.exp).toBe(0);
    const expected = statsForClass("knight", 2);
    expect(q.maxHp).toBe(expected.maxHp);
    expect(q.pAtk).toBe(expected.pAtk);
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

  it("skeleton_king (jefe) da 300 EXP", () => {
    expect(getMobExp("skeleton_king")).toBe(300);
  });
});

describe("statsForLevel", () => {
  it("nivel 1 = base de knight (alias de statsForClass)", () => {
    const knight = getClass("knight");
    expect(statsForLevel(1)).toEqual({
      maxHp: knight.base.maxHp,
      maxMp: knight.base.maxMp ?? 0,
      pAtk: knight.base.pAtk,
      pDef: knight.base.pDef,
    });
  });
  it("nivel 3 aplica el crecimiento dos veces con knight", () => {
    const knight = getClass("knight");
    const s = statsForLevel(3);
    expect(s.maxHp).toBe(knight.base.maxHp + 2 * knight.growth.hp);
    expect(s.pAtk).toBe(knight.base.pAtk + 2 * knight.growth.pAtk);
  });
});

describe("statsForClass", () => {
  it("nivel 1 de mage tiene más MP que knight", () => {
    const mage = statsForClass("mage", 1);
    const knight = statsForClass("knight", 1);
    expect(mage.maxMp).toBeGreaterThan(knight.maxMp);
  });

  it("nivel 1 de knight tiene más HP que mage", () => {
    const knight = statsForClass("knight", 1);
    const mage = statsForClass("mage", 1);
    expect(knight.maxHp).toBeGreaterThan(mage.maxHp);
  });

  it("aplica el crecimiento correcto para la clase", () => {
    const barbarian = statsForClass("barbarian", 3);
    const barbarianCls = getClass("barbarian");
    const expectedHp = barbarianCls.base.maxHp + 2 * barbarianCls.growth.hp;
    const expectedPAtk = barbarianCls.base.pAtk + 2 * barbarianCls.growth.pAtk;
    expect(barbarian.maxHp).toBe(expectedHp);
    expect(barbarian.pAtk).toBe(expectedPAtk);
  });

  it("statsForLevel es alias de statsForClass('knight', level)", () => {
    expect(statsForLevel(5)).toEqual(statsForClass("knight", 5));
  });
});

describe("gainExp class-aware", () => {
  it("con className default, es como antes", () => {
    const q = p();
    const lvls = gainExp(q, 100);
    expect(lvls).toBe(1);
    expect(q.level).toBe(2);
    expect(q.maxHp).toBe(statsForClass("knight", 2).maxHp);
  });

  it("con className='mage', recomputa stats por mage", () => {
    const mage = p();
    const lvls = gainExp(mage, 100, "mage");
    expect(lvls).toBe(1);
    expect(mage.level).toBe(2);
    const expected = statsForClass("mage", 2);
    expect(mage.maxHp).toBe(expected.maxHp);
    expect(mage.maxMp).toBe(expected.maxMp);
    expect(mage.pAtk).toBe(expected.pAtk);
    expect(mage.pDef).toBe(expected.pDef);
  });

  it("rellena hp/mp al subir nivel", () => {
    const q = p({ hp: 10, mp: 5 });
    gainExp(q, 100, "mage");
    expect(q.hp).toBe(q.maxHp);
    expect(q.mp).toBe(q.maxMp);
  });

  it("sube varios niveles con className recomputando cada uno", () => {
    const rogue = p();
    const lvls = gainExp(rogue, expToNextLevel(1) + expToNextLevel(2) + 10, "rogue");
    expect(lvls).toBe(2);
    expect(rogue.level).toBe(3);
    const expected = statsForClass("rogue", 3);
    expect(rogue.maxHp).toBe(expected.maxHp);
    expect(rogue.pAtk).toBe(expected.pAtk);
  });
});
