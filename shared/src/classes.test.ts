import { describe, it, expect } from "vitest";
import { getClass, isValidClass, CLASSES, CLASS_ORDER, getClassSkills } from "./classes.js";
import { getSkill } from "./combat.js";

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

describe("getClassSkills", () => {
  it("mage tiene las 3 skills correctas", () => {
    expect(getClassSkills("mage")).toEqual(["fireball", "ice_lance", "arcane_mend"]);
  });

  it("knight tiene las 3 skills correctas", () => {
    expect(getClassSkills("knight")).toEqual(["shield_bash", "guard", "second_wind"]);
  });

  it("barbarian tiene las 3 skills correctas", () => {
    expect(getClassSkills("barbarian")).toEqual(["brutal_strike", "rage", "cleave"]);
  });

  it("rogue tiene las 3 skills correctas", () => {
    expect(getClassSkills("rogue")).toEqual(["backstab", "poison", "evasion"]);
  });
});

describe("skill kits", () => {
  it("cada clase tiene exactamente 3 skills", () => {
    Object.values(CLASSES).forEach((cls) => {
      expect(cls.skills).toHaveLength(3);
    });
  });

  it("todas las skills de cada clase existen en SKILLS", () => {
    Object.values(CLASSES).forEach((cls) => {
      cls.skills.forEach((skillId) => {
        expect(() => getSkill(skillId)).not.toThrow();
      });
    });
  });

  it("skillId es igual a skills[0] para backward-compatibility", () => {
    Object.values(CLASSES).forEach((cls) => {
      expect(cls.skillId).toBe(cls.skills[0]);
    });
  });
});

describe("skill types", () => {
  it("guard es buff con pDef", () => {
    const guard = getSkill("guard");
    expect(guard.type).toBe("buff");
    expect(guard.buffStat).toBe("pDef");
    expect(guard.buffMult).toBe(1.6);
    expect(guard.buffMs).toBe(6000);
  });

  it("poison es DoT con values correctos", () => {
    const poison = getSkill("poison");
    expect(poison.type).toBe("dot");
    expect(poison.dotDps).toBe(12);
    expect(poison.dotMs).toBe(5000);
  });

  it("second_wind es heal con 40%", () => {
    const heal = getSkill("second_wind");
    expect(heal.type).toBe("heal");
    expect(heal.healPct).toBe(0.4);
  });

  it("fireball es damage con factor 3.6", () => {
    const fb = getSkill("fireball");
    expect(fb.type).toBe("damage");
    expect(fb.factor).toBe(3.6);
  });

  it("los skills damage existentes tienen type damage", () => {
    expect(getSkill("power_strike").type).toBe("damage");
    expect(getSkill("shield_bash").type).toBe("damage");
    expect(getSkill("brutal_strike").type).toBe("damage");
    expect(getSkill("backstab").type).toBe("damage");
  });

  it("ice_lance es damage con factor 2.2", () => {
    const ice = getSkill("ice_lance");
    expect(ice.type).toBe("damage");
    expect(ice.factor).toBe(2.2);
  });

  it("arcane_mend es heal con 30%", () => {
    const mend = getSkill("arcane_mend");
    expect(mend.type).toBe("heal");
    expect(mend.healPct).toBe(0.3);
  });

  it("rage es buff con pAtk", () => {
    const rage = getSkill("rage");
    expect(rage.type).toBe("buff");
    expect(rage.buffStat).toBe("pAtk");
    expect(rage.buffMult).toBe(1.5);
    expect(rage.buffMs).toBe(6000);
  });

  it("cleave es damage con factor 2.4", () => {
    const cleave = getSkill("cleave");
    expect(cleave.type).toBe("damage");
    expect(cleave.factor).toBe(2.4);
  });

  it("evasion es buff con pDef", () => {
    const evasion = getSkill("evasion");
    expect(evasion.type).toBe("buff");
    expect(evasion.buffStat).toBe("pDef");
    expect(evasion.buffMult).toBe(1.8);
    expect(evasion.buffMs).toBe(4000);
  });
});
