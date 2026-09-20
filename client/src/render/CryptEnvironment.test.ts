import { expect, it } from "vitest";
import * as THREE from "three";
import { addCryptEnvironment } from "./CryptEnvironment.js";

it("authors three distinct chambers and keeps every floor inside dungeon bounds", () => {
  const group = addCryptEnvironment(new THREE.Scene());
  expect(group.children.filter(c => c.name.startsWith("crypt-room-"))).toHaveLength(3);
  const bounds = new THREE.Box3().setFromObject(group);
  expect(bounds.min.x).toBeGreaterThanOrEqual(870); expect(bounds.max.x).toBeLessThanOrEqual(930);
  expect(bounds.min.z).toBeGreaterThanOrEqual(-50); expect(bounds.max.z).toBeLessThanOrEqual(50);
});
