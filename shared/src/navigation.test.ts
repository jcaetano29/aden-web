import { describe, expect, it } from "vitest";
import { NavigationMap, isWalkable, findPath, clipMovement, type Point2 } from "./navigation.js";
import { ZONES } from "./world.js";
import type { StructureObstacle } from "./structures.js";

const bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };
const box = (x: number, z: number, width: number, depth: number, rotation = 0): StructureObstacle =>
  ({ id: "fixture", mapId: "fixture", x, z, width, depth, rotation });
function safePath(map: NavigationMap, start: Point2, path: Point2[]) {
  for (const end of path) {
    expect(map.isWalkable(end)).toBe(true);
    expect(map.clipMovement(start, end)).toEqual(end);
    start = end;
  }
}

describe("structure navigation", () => {
  it("sweeps long moves against walls thinner than a grid cell", () => {
    const map = new NavigationMap(bounds, [box(0, 0, 0.08, 15)]);
    const end = map.clipMovement({ x: -10, z: 0 }, { x: 10, z: 0 });
    expect(end.x).toBeLessThan(-0.44);
    expect(end.x).toBeGreaterThan(-0.45);
    expect(map.isWalkable(end)).toBe(true);
  });
  it("uses THREE's Y rotation convention", () => {
    const map = new NavigationMap(bounds, [box(0, 0, 8, 0.1, Math.PI / 4)]);
    expect(map.isWalkable({ x: 2, z: -2 })).toBe(false);
    expect(map.isWalkable({ x: 2, z: 2 })).toBe(true);
    const start = { x: -7, z: -2 }, end = { x: 7, z: 2 };
    const path = map.findPath(start, end);
    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)).toEqual(end);
    safePath(map, start, path);
  });
  it("routes around a closed house without cutting corners", () => {
    const map = new NavigationMap(bounds, [box(0, 0, 6, 6)]);
    const start = { x: -8, z: 0 }, end = { x: 8, z: 0 };
    const path = map.findPath(start, end);
    expect(path.at(-1)).toEqual(end);
    expect(path.length).toBeGreaterThan(1);
    safePath(map, start, path);
  });
  it("preserves an open gate between wall sections", () => {
    const map = new NavigationMap(bounds, [box(-7, 0, 10, 1), box(7, 0, 10, 1)]);
    expect(map.findPath({ x: 0, z: -8 }, { x: 0, z: 8 })).toEqual([{ x: 0, z: 8 }]);
  });
  it("ends on the reachable side of an impassable dividing wall", () => {
    const map = new NavigationMap(bounds, [box(0, 0, 0.1, 30)]);
    const start = { x: -8, z: 0 };
    const path = map.findPath(start, { x: 8, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)!.x).toBeLessThan(0);
    safePath(map, start, path);
  });
  it("resolves blocked destinations and bounds, and rejects nonfinite paths", () => {
    const map = new NavigationMap(bounds, [box(0, 0, 4, 4)]);
    expect(map.isWalkable(map.nearestWalkable({ x: 0, z: 0 }))).toBe(true);
    expect(map.isWalkable(map.nearestWalkable({ x: Infinity, z: NaN }))).toBe(true);
    expect(map.clipMovement({ x: 5, z: 5 }, { x: 100, z: 5 }).x).toBeLessThanOrEqual(11.6);
    expect(map.findPath({ x: 5, z: 5 }, { x: NaN, z: 5 })).toEqual([]);
    expect(map.isWalkable({ x: NaN, z: 0 })).toBe(false);
    safePath(map, { x: -8, z: 0 }, map.findPath({ x: -8, z: 0 }, { x: 0, z: 0 }));
  });
  it("keeps authored town spawn walkable and paths safe", () => {
    expect(isWalkable("pueblo", { x: 0, z: 14 })).toBe(true);
    const path = findPath("pueblo", { x: 0, z: 14 }, { x: 0, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(isWalkable("pueblo", path.at(-1)!)).toBe(true);
  });
  it("blocks authored fountain and houses while keeping every arrival clear", () => {
    expect(isWalkable("pueblo", { x: 0, z: 0 })).toBe(false);
    expect(isWalkable("pueblo", { x: -16, z: -26 })).toBe(false);
    for (const zone of ZONES) expect(isWalkable(zone.id, zone.spawn), zone.id).toBe(true);
    expect(isWalkable("bosque", { x: 300, z: 55 })).toBe(true);
    expect(isWalkable("bosque", { x: 296.4, z: 55 })).toBe(false);
  });
  it("routes from town through the gate to the outside and through dense map structures", () => {
    for (const [mapId, start, target] of [
      ["pueblo", { x: 0, z: 14 }, { x: 0, z: -55 }],
      ["ruinas", { x: 0, z: 350 }, { x: 18, z: 285 }],
      ["cripta", { x: 900, z: 43 }, { x: 900, z: -44 }],
    ] as const) {
      const path = findPath(mapId, start, target);
      expect(path.at(-1), mapId).toEqual(target);
      let previous: Point2 = start;
      for (const point of path) {
        expect(clipMovement(mapId, previous, point), mapId).toEqual(point);
        previous = point;
      }
    }
  });
});
