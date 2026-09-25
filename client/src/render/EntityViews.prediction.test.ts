// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { EntityViews } from "./EntityViews.js";

function snapshot(x: number, z: number) {
  return { name: "Aela", x, z, targetX: x, targetZ: z, moving: false, dead: false, className: "knight", mapId: "pueblo" };
}

function makeViews(): EntityViews {
  const factory = {
    create() {
      return {
        root: new THREE.Group(), mixer: { update() {}, stopAllAction() {} }, clipNames: [],
        play() {}, playOnce(_name: string, done: () => void) { done(); },
      };
    },
  };
  const nameplates = { add: vi.fn(), remove: vi.fn(), setText: vi.fn(), setTitle: vi.fn() };
  return new EntityViews(new THREE.Scene(), factory as any, nameplates as any);
}

describe("EntityViews movimiento predicho", () => {
  it("dibuja al jugador propio en la posición predicha aunque el server todavía no lo movió", () => {
    const views = makeViews();
    views.add("self", true, "Knight", snapshot(2, 3));
    views.setSelfMotion({ x: 6, z: 3, targetX: 9, targetZ: 3, moving: true });
    views.updateAll(1);
    expect(views.selfPosition()!.x).toBeCloseTo(6, 3);
    expect(views.selfPosition()!.z).toBeCloseTo(3, 3);
  });
});
