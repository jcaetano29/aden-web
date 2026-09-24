import { describe, it, expect } from "vitest";
import { NPCS, getNpc, getNpcByRole, TOWN_SERVICE_RADIUS } from "./npcs.js";
import { distance2D } from "./math.js";
import { TOWN } from "./combat.js";

describe("npcs", () => {
  it("getNpc devuelve el NPC y lanza para uno desconocido", () => {
    expect(getNpc("elder").role).toBe("elder");
    expect(() => getNpc("nope")).toThrow();
  });

  it("existen los cinco roles esperados", () => {
    for (const role of ["elder", "merchant", "healer", "smith", "captain"] as const) {
      expect(getNpcByRole(role).role).toBe(role);
    }
  });

  it("todos los NPCs están dentro del radio de servicio del pueblo", () => {
    for (const n of NPCS.filter(n => n.mapId === 'pueblo')) {
      expect(distance2D(n.x, n.z, TOWN.x, TOWN.z)).toBeLessThanOrEqual(TOWN_SERVICE_RADIUS);
    }
  });

  it("los ids de NPC son únicos", () => {
    const ids = NPCS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
