import { describe, it, expect } from "vitest";
import { ZONES, getZone, zoneAt } from "./world.js";
import { MAP_BOUNDS } from "./constants.js";
import { TOWN } from "./combat.js";

describe("ZONES", () => {
  it("todas las zonas caen dentro de MAP_BOUNDS", () => {
    for (const z of ZONES) {
      expect(z.center.x - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minX);
      expect(z.center.x + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
      expect(z.center.z - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minZ);
      expect(z.center.z + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxZ);
    }
  });

  it("exactamente una zona segura (el pueblo), y contiene a TOWN", () => {
    const safe = ZONES.filter((z) => z.safe);
    expect(safe).toHaveLength(1);
    expect(safe[0].id).toBe("pueblo");
    expect(zoneAt(TOWN.x, TOWN.z).id).toBe("pueblo");
  });

  it("los rangos de nivel crecen hacia el norte (bosque < ruinas < yermo < trono)", () => {
    const bosque = getZone("bosque");
    const ruinas = getZone("ruinas");
    const yermo = getZone("yermo");
    const trono = getZone("trono");
    expect(ruinas.levelMin).toBeGreaterThanOrEqual(bosque.levelMax);
    expect(yermo.levelMin).toBeGreaterThanOrEqual(ruinas.levelMax);
    expect(trono.levelMin).toBeGreaterThanOrEqual(yermo.levelMax);
  });
});

describe("getZone", () => {
  it("lanza para una zona desconocida", () => {
    expect(() => getZone("atlantis")).toThrow();
  });
});

describe("zoneAt", () => {
  it("clasifica cada centro de zona en su propia zona", () => {
    for (const z of ZONES) {
      expect(zoneAt(z.center.x, z.center.z).id).toBe(z.id);
    }
  });

  it("el trono (norte lejano) resuelve a la zona del trono", () => {
    expect(zoneAt(0, -122).id).toBe("trono");
  });
});
