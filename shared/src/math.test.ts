import { describe, it, expect } from "vitest";
import { distance2D, stepTowards, clampToBounds } from "./math.js";
import { MAP_BOUNDS } from "./constants.js";

describe("distance2D", () => {
  it("calcula distancia euclídea en el plano XZ", () => {
    expect(distance2D(0, 0, 3, 4)).toBe(5);
  });
});

describe("stepTowards", () => {
  it("avanza maxDist hacia el objetivo cuando está lejos", () => {
    const r = stepTowards(0, 0, 10, 0, 2);
    expect(r.x).toBeCloseTo(2);
    expect(r.z).toBeCloseTo(0);
    expect(r.arrived).toBe(false);
  });

  it("llega exacto y marca arrived si maxDist supera la distancia restante", () => {
    const r = stepTowards(0, 0, 1, 0, 5);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
    expect(r.arrived).toBe(true);
  });
});

describe("clampToBounds", () => {
  it("recorta la posición dentro de los límites del mapa", () => {
    const r = clampToBounds(9999, -9999, MAP_BOUNDS);
    expect(r.x).toBe(MAP_BOUNDS.maxX);
    expect(r.z).toBe(MAP_BOUNDS.minZ);
  });
});
