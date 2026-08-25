import { describe, it, expect } from "vitest";
import { createSpawns } from "./SpawnSystem.js";
import { distance2D } from "@aden/shared";

const ZONES = [
  { id: "z1", mapId: "bosque", templateId: "skeleton_minion", centerX: 10, centerZ: 0, radius: 5, count: 3 },
  { id: "z2", mapId: "bosque", templateId: "skeleton_warrior", centerX: -10, centerZ: 0, radius: 4, count: 2 },
];

describe("createSpawns", () => {
  it("crea count mobs por zona con ids únicos", () => {
    const mobs = createSpawns(ZONES, () => 0.5);
    expect(mobs).toHaveLength(5);
    expect(new Set(mobs.map((m) => m.id)).size).toBe(5);
  });
  it("posiciona cada mob dentro del radio de su zona", () => {
    const mobs = createSpawns(ZONES, Math.random);
    for (const m of mobs) {
      const z = ZONES.find((zz) => m.id.startsWith(zz.id))!;
      expect(distance2D(m.x, m.z, z.centerX, z.centerZ)).toBeLessThanOrEqual(z.radius + 1e-9);
    }
  });
  it("asigna el templateId de la zona", () => {
    const mobs = createSpawns(ZONES, () => 0.5);
    expect(mobs.find((m) => m.id.startsWith("z1"))!.templateId).toBe("skeleton_minion");
  });
});
