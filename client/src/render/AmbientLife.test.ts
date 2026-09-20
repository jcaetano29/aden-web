import { afterEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { isWalkable, clipMovement } from "@aden/shared";
import { AmbientLife } from "./AmbientLife.js";
import type { Character } from "./CharacterFactory.js";

afterEach(() => { vi.restoreAllMocks(); });

it("keeps ambient walkers on safe segments, including long animation frames", () => {
  let seed = 17;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  // Only replace asset loading; real movement, structures and Three transforms run.
  const factory = { create(): Character {
    const root = new THREE.Group();
    return { root, mixer: new THREE.AnimationMixer(root), clipNames: [], play() {}, playOnce(_clip, done) { done(); } };
  } };
  const scene = new THREE.Scene();
  const ambient = new AmbientLife(scene, factory);
  let moved = false;
  for (let tick = 0; tick < 40; tick++) {
    const before = new Map(scene.children.map(o => [o, { x: o.position.x, z: o.position.z }]));
    ambient.update(tick % 5 === 0 ? 1.5 : .3, "pueblo");
    for (const walker of scene.children.filter(o => o.visible)) {
      const previous = before.get(walker)!;
      const next = walker.position;
      expect(isWalkable("pueblo", next)).toBe(true);
      const swept = clipMovement("pueblo", previous, next);
      expect(swept.x).toBeCloseTo(next.x, 4);
      expect(swept.z).toBeCloseTo(next.z, 4);
      moved ||= Math.hypot(next.x - previous.x, next.z - previous.z) > .01;
    }
  }
  expect(moved).toBe(true);
});
