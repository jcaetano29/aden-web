import { describe, it, expect } from "vitest";
import { advanceMovable, type Movable } from "./MovementSystem.js";
import { MOVE_SPEED } from "@aden/shared";

function makeMovable(over: Partial<Movable> = {}): Movable {
  return { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, ...over };
}

describe("advanceMovable", () => {
  it("avanza MOVE_SPEED*dt hacia el target en 1 segundo", () => {
    const m = makeMovable({ targetX: 100, moving: true });
    advanceMovable(m, 1);
    expect(m.x).toBeCloseTo(MOVE_SPEED);
    expect(m.moving).toBe(true);
  });

  it("no se pasa del target y apaga moving al llegar", () => {
    const m = makeMovable({ targetX: 1, moving: true });
    advanceMovable(m, 1); // avanzaría 5, pero target está a 1
    expect(m.x).toBeCloseTo(1);
    expect(m.moving).toBe(false);
  });

  it("no hace nada si moving es false", () => {
    const m = makeMovable({ targetX: 100, moving: false });
    advanceMovable(m, 1);
    expect(m.x).toBe(0);
  });
});
