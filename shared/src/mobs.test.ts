import { describe, it, expect } from "vitest";
import { MOB_TEMPLATES, getTemplate, SPAWN_ZONES, AI_CONFIG, MOB_MOVE_SPEED, isBoss, scaleForTemplate, respawnForTemplate } from "./mobs.js";
import { MAP_BOUNDS } from "./constants.js";

describe("MOB_TEMPLATES / getTemplate", () => {
  it("incluye skeleton_minion y skeleton_warrior con su modelo", () => {
    expect(getTemplate("skeleton_minion").model).toBe("Skeleton_Minion");
    expect(getTemplate("skeleton_warrior").model).toBe("Skeleton_Warrior");
  });

  it("incluye skeleton_king con boss=true, scale=1.9, respawnMs=45000", () => {
    const t = getTemplate("skeleton_king");
    expect(t.name).toBe("Rey Esqueleto");
    expect(t.model).toBe("Skeleton_Warrior");
    expect(t.boss).toBe(true);
    expect(t.scale).toBe(1.9);
    expect(t.respawnMs).toBe(45000);
  });

  it("lanza para un template desconocido", () => {
    expect(() => getTemplate("dragon")).toThrow();
  });
});

describe("isBoss", () => {
  it("retorna true para skeleton_king", () => {
    expect(isBoss("skeleton_king")).toBe(true);
  });

  it("retorna false para skeleton_minion y skeleton_warrior", () => {
    expect(isBoss("skeleton_minion")).toBe(false);
    expect(isBoss("skeleton_warrior")).toBe(false);
  });
});

describe("scaleForTemplate", () => {
  it("retorna 1.9 para skeleton_king", () => {
    expect(scaleForTemplate("skeleton_king")).toBe(1.9);
  });

  it("retorna 1 (default) para skeleton_minion y skeleton_warrior", () => {
    expect(scaleForTemplate("skeleton_minion")).toBe(1);
    expect(scaleForTemplate("skeleton_warrior")).toBe(1);
  });
});

describe("respawnForTemplate", () => {
  it("retorna 45000 para skeleton_king", () => {
    expect(respawnForTemplate("skeleton_king")).toBe(45000);
  });

  it("retorna undefined para skeleton_minion y skeleton_warrior", () => {
    expect(respawnForTemplate("skeleton_minion")).toBeUndefined();
    expect(respawnForTemplate("skeleton_warrior")).toBeUndefined();
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
