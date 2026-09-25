import { describe, it, expect } from "vitest";
import { advanceMovable, type Movable } from "./movement.js";
import { MOVE_SPEED } from "./constants.js";

function makeMovable(over: Partial<Movable> = {}): Movable {
  return { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, ...over };
}

describe("advanceMovable", () => {
  it("rodea la fuente del pueblo sin atravesarla y alcanza el otro lado", () => {
    const m = { ...makeMovable({ x: 0, z: 10, targetX: 0, targetZ: -10, moving: true }), mapId: "pueblo" };
    for (let i = 0; i < 200 && m.moving; i++) {
      advanceMovable(m, 0.1);
      expect(Math.hypot(m.x, m.z)).toBeGreaterThan(3.6);
    }
    expect(m.x).toBeCloseTo(0);
    expect(m.z).toBeCloseTo(-10);
    expect(m.moving).toBe(false);
  });

  it("no acepta destinos no finitos", () => {
    const m = { ...makeMovable({ x: 0, z: 14, targetX: NaN, moving: true }), mapId: "pueblo" };
    advanceMovable(m, 1);
    expect(m.x).toBe(0);
    expect(m.z).toBe(14);
    expect(m.moving).toBe(false);
  });

  it("no pierde un segundo destino cuando termina una ruta corta", () => {
    const m = { ...makeMovable({ x: 0, z: 14, targetX: 0.4, targetZ: 14, moving: true }), mapId: "pueblo" };
    advanceMovable(m, 0.05);
    m.targetX = 5;
    advanceMovable(m, 0.05);
    expect(m.moving).toBe(true);
    for (let i = 0; i < 30 && m.moving; i++) advanceMovable(m, 0.1);
    expect(m.x).toBeCloseTo(5);
  });

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
