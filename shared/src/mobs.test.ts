import { describe, it, expect } from "vitest";
import { MOB_TEMPLATES, getTemplate, SPAWN_ZONES, AI_CONFIG, MOB_MOVE_SPEED } from "./mobs.js";
import { MAP_BOUNDS } from "./constants.js";

describe("MOB_TEMPLATES / getTemplate", () => {
  it("incluye skeleton_minion y skeleton_warrior con su modelo", () => {
    expect(getTemplate("skeleton_minion").model).toBe("Skeleton_Minion");
    expect(getTemplate("skeleton_warrior").model).toBe("Skeleton_Warrior");
  });
  it("lanza para un template desconocido", () => {
    expect(() => getTemplate("dragon")).toThrow();
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
