import { describe, it, expect } from "vitest";
import { ZONES, getZone, zoneAt, canEnterZone, firstZone, TOWN_ZONE_ID } from "./world.js";
import { MAP_BOUNDS } from "./constants.js";
import { TOWN } from "./combat.js";

describe("ZONES (mapas)", () => {
  it("todos los mapas caen dentro del plano global MAP_BOUNDS", () => {
    for (const z of ZONES) {
      expect(z.bounds.minX).toBeGreaterThanOrEqual(MAP_BOUNDS.minX);
      expect(z.bounds.maxX).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
      expect(z.bounds.minZ).toBeGreaterThanOrEqual(MAP_BOUNDS.minZ);
      expect(z.bounds.maxZ).toBeLessThanOrEqual(MAP_BOUNDS.maxZ);
    }
  });

  it("los mapas NO se solapan (regiones discretas)", () => {
    for (let i = 0; i < ZONES.length; i++) {
      for (let j = i + 1; j < ZONES.length; j++) {
        const a = ZONES[i].bounds, b = ZONES[j].bounds;
        const overlap = a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
        expect(overlap).toBe(false);
      }
    }
  });

  it("el spawn de cada mapa cae dentro de sus bounds", () => {
    for (const z of ZONES) {
      expect(z.spawn.x).toBeGreaterThanOrEqual(z.bounds.minX);
      expect(z.spawn.x).toBeLessThanOrEqual(z.bounds.maxX);
      expect(z.spawn.z).toBeGreaterThanOrEqual(z.bounds.minZ);
      expect(z.spawn.z).toBeLessThanOrEqual(z.bounds.maxZ);
    }
  });

  it("exactamente un mapa seguro (el pueblo), y contiene a TOWN", () => {
    const safe = ZONES.filter((z) => z.safe);
    expect(safe).toHaveLength(1);
    expect(safe[0].id).toBe(TOWN_ZONE_ID);
    expect(zoneAt(TOWN.x, TOWN.z).id).toBe(TOWN_ZONE_ID);
    expect(firstZone().id).toBe(TOWN_ZONE_ID);
  });

  it("los level gates crecen con la profundidad (bosque < ruinas < yermo < trono)", () => {
    expect(getZone("bosque").levelReq).toBeLessThan(getZone("ruinas").levelReq);
    expect(getZone("ruinas").levelReq).toBeLessThan(getZone("yermo").levelReq);
    expect(getZone("yermo").levelReq).toBeLessThan(getZone("trono").levelReq);
    expect(getZone(TOWN_ZONE_ID).levelReq).toBe(0);
  });
});

describe("canEnterZone", () => {
  it("respeta el gate por nivel", () => {
    expect(canEnterZone(getZone("pueblo"), 1)).toBe(true); // pueblo siempre
    expect(canEnterZone(getZone("yermo"), 5)).toBe(false); // req 6
    expect(canEnterZone(getZone("yermo"), 6)).toBe(true);
    expect(canEnterZone(getZone("trono"), 9)).toBe(true);
  });
});

describe("getZone / zoneAt", () => {
  it("getZone lanza para un mapa desconocido", () => {
    expect(() => getZone("atlantis")).toThrow();
  });

  it("zoneAt clasifica el centro de cada mapa en su propio mapa", () => {
    for (const z of ZONES) {
      expect(zoneAt(z.center.x, z.center.z).id).toBe(z.id);
    }
  });
});
