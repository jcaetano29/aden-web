import { describe, it, expect } from "vitest";
import { smoothTowards, headingFromDelta } from "./motion.js";

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
