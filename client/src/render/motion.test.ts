import { describe, it, expect } from "vitest";
import { smoothTowards, headingFromDelta, smoothAngle } from "./motion.js";

describe("smoothTowards", () => {
  it("con dt=0 no cambia", () => {
    expect(smoothTowards(0, 10, 10, 0)).toBe(0);
  });

  it("se acerca al target sin sobrepasar", () => {
    const next = smoothTowards(0, 10, 10, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it("converge al target tras muchos pasos", () => {
    let x = 0;
    for (let i = 0; i < 600; i++) x = smoothTowards(x, 10, 10, 1 / 60);
    expect(x).toBeCloseTo(10, 3);
  });
});

describe("headingFromDelta", () => {
  it("devuelve null sin movimiento", () => {
    expect(headingFromDelta(0, 0)).toBeNull();
  });

  it("mira a +Z como 0 rad", () => {
    expect(headingFromDelta(0, 1)).toBeCloseTo(0);
  });

  it("mira a +X como PI/2", () => {
    expect(headingFromDelta(1, 0)).toBeCloseTo(Math.PI / 2);
  });
});

describe("smoothAngle", () => {
  it("con dt<=0 no cambia", () => {
    expect(smoothAngle(1, 2, 10, 0)).toBe(1);
  });
  it("gira por el camino corto cruzando la discontinuidad (baja desde 0.1 hacia ~2π)", () => {
    // target 6.2 rad ≈ -0.083 rad; el camino corto es DECRECIENTE desde 0.1
    const next = smoothAngle(0.1, 6.2, 10, 1 / 60);
    expect(next).toBeLessThan(0.1);
  });
  it("no cruza por PI cuando no hace falta (avance normal)", () => {
    const next = smoothAngle(0, 1, 10, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });
  it("converge al target (mod 2π) tras muchos pasos", () => {
    let a = 0.1;
    for (let i = 0; i < 600; i++) a = smoothAngle(a, 6.2, 10, 1 / 60);
    // distancia angular al target ~0
    const d = Math.atan2(Math.sin(6.2 - a), Math.cos(6.2 - a));
    expect(Math.abs(d)).toBeLessThan(0.01);
  });
});
