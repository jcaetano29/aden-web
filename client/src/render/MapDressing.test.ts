import { describe, it, expect } from "vitest";
import { ZONES, WORLD_OBJECTS } from "@aden/shared";
import { dressingLayout } from "./MapDressing.js";

describe("map dressing placement", () => {
  for (const zone of ZONES) it(`${zone.id}: repeatable scenery leaves arrivals and interactables accessible`, () => {
    const layout = dressingLayout(zone);
    expect(layout).toEqual(dressingLayout(zone));
    if (zone.id === "cripta" || zone.id === 'monasterio' || zone.id === 'minas' || zone.id === 'fragua') { expect(layout).toEqual([]); return; }
    expect(layout.length).toBeGreaterThan(100);
    for (const p of layout) {
      expect(Math.hypot(p.x-zone.spawn.x,p.z-zone.spawn.z)).toBeGreaterThan(9);
      expect(p.x).toBeGreaterThan(zone.bounds.minX+2);
      expect(p.x).toBeLessThan(zone.bounds.maxX-2);
      expect(p.z).toBeGreaterThan(zone.bounds.minZ+2);
      expect(p.z).toBeLessThan(zone.bounds.maxZ-2);
      for (const obj of WORLD_OBJECTS.filter(o=>o.mapId===zone.id))
        expect(Math.hypot(p.x-obj.x,p.z-obj.z)).toBeGreaterThan(6);
      expect(Math.abs(p.x-zone.center.x)).toBeGreaterThan(7);
    }
  });
});
