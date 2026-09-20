import { expect, it } from "vitest";
import * as THREE from "three";
import { getNpc } from "@aden/shared";
import { Environment } from "./Environment.js";

it("keeps the plaza and road at distinct depths beneath the captain", () => {
  const scene = new THREE.Scene();
  new Environment(scene);
  scene.updateMatrixWorld(true);
  const captain = getNpc("captain");
  const ray = new THREE.Raycaster(
    new THREE.Vector3(captain.x, 10, captain.z),
    new THREE.Vector3(0, -1, 0),
  );
  const ground = scene.children.filter(object => object.userData.ground);
  const hits = ray.intersectObjects(ground, false);
  // A ray can hit two triangles of the same mesh along a shared edge.
  const surfaces = hits.filter((hit, index) =>
    hits.findIndex(other => other.object === hit.object) === index,
  );
  expect(surfaces.length).toBeGreaterThanOrEqual(2);
  expect(surfaces[0].point.y - surfaces[1].point.y).toBeGreaterThan(0.02);
});
