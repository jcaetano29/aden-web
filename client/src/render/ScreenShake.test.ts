import { describe, it, expect } from "vitest";
import { ScreenShake, MAX_OFFSET } from "./ScreenShake.js";

describe("ScreenShake", () => {
  it("sin trauma el offset es cero", () => {
    const s = new ScreenShake();
    expect(s.update(0.016)).toEqual({ x: 0, y: 0 });
  });

  it("addTrauma se clampea a 1", () => {
    const s = new ScreenShake();
    s.addTrauma(5);
    expect(s.trauma).toBe(1);
  });

  it("el offset queda dentro de ±MAX_OFFSET", () => {
    const s = new ScreenShake();
    s.addTrauma(1);
    for (let i = 0; i < 20; i++) {
      const o = s.update(0.016);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(MAX_OFFSET);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(MAX_OFFSET);
    }
  });

  it("el trauma decae a 0 con el tiempo", () => {
    const s = new ScreenShake();
    s.addTrauma(1);
    for (let i = 0; i < 120; i++) s.update(0.016); // ~2s
    expect(s.trauma).toBe(0);
    expect(s.update(0.016)).toEqual({ x: 0, y: 0 });
  });
});
