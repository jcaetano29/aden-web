import { describe, it, expect } from "vitest";
import { MOB_TEMPLATES, getTemplate, SPAWN_ZONES, AI_CONFIG, MOB_MOVE_SPEED, isBoss, isMiniBoss, scaleForTemplate, respawnForTemplate, tintForTemplate } from "./mobs.js";
import { MAP_BOUNDS } from "./constants.js";

describe("MOB_TEMPLATES / getTemplate", () => {
  it("incluye skeleton_minion y skeleton_warrior con su modelo", () => {
    expect(getTemplate("skeleton_minion").model).toBe("Skeleton_Minion");
    expect(getTemplate("skeleton_warrior").model).toBe("Skeleton_Warrior");
  });

  it("incluye skeleton_king (Rey Nihil) con boss=true, scale=2.0, respawnMs=60000", () => {
    const t = getTemplate("skeleton_king");
    expect(t.name).toBe("Rey Nihil");
    expect(t.model).toBe("Skeleton_Warrior");
    expect(t.boss).toBe(true);
    expect(t.scale).toBe(2.0);
    expect(t.respawnMs).toBe(60000);
  });

  it("incluye las variantes de zona (cripta violeta, ceniza roja) con tinte", () => {
    expect(getTemplate("crypt_warrior").model).toBe("Skeleton_Warrior");
    expect(getTemplate("crypt_warrior").tint).toBe(0xb9a7e8);
    expect(getTemplate("ash_warrior").tint).toBe(0xff6a3c);
    expect(getTemplate("skeleton_minion").tint).toBe(0x9fc48f); // bosque musgoso
  });

  it("crypt_sentinel es mini-jefe (miniBoss) pero NO jefe final (boss)", () => {
    expect(getTemplate("crypt_sentinel").miniBoss).toBe(true);
    expect(getTemplate("crypt_sentinel").boss).toBeUndefined();
  });

  it("lanza para un template desconocido", () => {
    expect(() => getTemplate("dragon")).toThrow();
  });
});

describe("isBoss / isMiniBoss", () => {
  it("isBoss retorna true sólo para skeleton_king", () => {
    expect(isBoss("skeleton_king")).toBe(true);
    expect(isBoss("crypt_sentinel")).toBe(false);
    expect(isBoss("skeleton_minion")).toBe(false);
    expect(isBoss("skeleton_warrior")).toBe(false);
  });

  it("isMiniBoss retorna true sólo para crypt_sentinel", () => {
    expect(isMiniBoss("crypt_sentinel")).toBe(true);
    expect(isMiniBoss("skeleton_king")).toBe(false);
    expect(isMiniBoss("skeleton_minion")).toBe(false);
  });
});

describe("scaleForTemplate", () => {
  it("retorna 2.0 para skeleton_king y 1.5 para el mini-jefe", () => {
    expect(scaleForTemplate("skeleton_king")).toBe(2.0);
    expect(scaleForTemplate("crypt_sentinel")).toBe(1.5);
  });

  it("retorna 1 (default) para skeleton_minion y skeleton_warrior", () => {
    expect(scaleForTemplate("skeleton_minion")).toBe(1);
    expect(scaleForTemplate("skeleton_warrior")).toBe(1);
  });
});

describe("respawnForTemplate", () => {
  it("retorna 60000 para skeleton_king", () => {
    expect(respawnForTemplate("skeleton_king")).toBe(60000);
  });

  it("retorna undefined para skeleton_minion y skeleton_warrior", () => {
    expect(respawnForTemplate("skeleton_minion")).toBeUndefined();
    expect(respawnForTemplate("skeleton_warrior")).toBeUndefined();
  });
});

describe("tintForTemplate", () => {
  it("retorna el tinte del template", () => {
    expect(tintForTemplate("ash_warrior")).toBe(0xff6a3c);
    expect(tintForTemplate("crypt_minion")).toBe(0xb9a7e8);
  });
});

describe("SPAWN_ZONES", () => {
  it("referencian templates válidos y caen dentro del mapa", () => {
    for (const z of SPAWN_ZONES) {
      expect(MOB_TEMPLATES[z.templateId]).toBeDefined();
      expect(z.count).toBeGreaterThan(0);
      expect(z.centerX - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minX);
      expect(z.centerX + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
      expect(z.centerZ - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minZ);
      expect(z.centerZ + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxZ);
    }
  });
});

describe("config", () => {
  it("aggroRadius < leashRadius y velocidades positivas", () => {
    expect(AI_CONFIG.aggroRadius).toBeLessThan(AI_CONFIG.leashRadius);
    expect(MOB_MOVE_SPEED).toBeGreaterThan(0);
  });
});
