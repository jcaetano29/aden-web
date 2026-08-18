import { describe, it, expect } from "vitest";
import { getClass, isValidClass, CLASSES, CLASS_ORDER } from "./classes.js";

describe("getClass", () => {
  it("devuelve la clase correcta", () => {
    expect(getClass("mage").model).toBe("Mage");
    expect(getClass("knight").name).toBe("Caballero");
    expect(getClass("barbarian").name).toBe("Bárbaro");
    expect(getClass("rogue").name).toBe("Pícaro");
  });

  it("lanza error para clase desconocida", () => {
    expect(() => getClass("nope")).toThrow();
  });
});

describe("isValidClass", () => {
  it("retorna true para clases válidas", () => {
    expect(isValidClass("knight")).toBe(true);
    expect(isValidClass("mage")).toBe(true);
    expect(isValidClass("barbarian")).toBe(true);
    expect(isValidClass("rogue")).toBe(true);
  });

  it("retorna false para clases inválidas", () => {
    expect(isValidClass("nope")).toBe(false);
    expect(isValidClass("")).toBe(false);
  });

  it("retorna false para undefined", () => {
    expect(isValidClass(undefined)).toBe(false);
  });
});

describe("CLASSES", () => {
  it("tiene 4 clases", () => {
    expect(Object.keys(CLASSES)).toHaveLength(4);
  });

  it("cada clase tiene los campos requeridos", () => {
    Object.values(CLASSES).forEach((cls) => {
      expect(cls).toHaveProperty("id");
      expect(cls).toHaveProperty("name");
      expect(cls).toHaveProperty("model");
      expect(cls).toHaveProperty("base");
      expect(cls).toHaveProperty("growth");
      expect(cls).toHaveProperty("skillId");
      expect(cls.base).toHaveProperty("maxHp");
      expect(cls.base).toHaveProperty("maxMp");
      expect(cls.base).toHaveProperty("pAtk");
      expect(cls.base).toHaveProperty("pDef");
      expect(cls.base).toHaveProperty("attackCooldownMs");
    });
  });
});

describe("CLASS_ORDER", () => {
  it("contiene todas las clases", () => {
    expect(CLASS_ORDER).toContain("knight");
    expect(CLASS_ORDER).toContain("mage");
    expect(CLASS_ORDER).toContain("barbarian");
    expect(CLASS_ORDER).toContain("rogue");
  });
});
