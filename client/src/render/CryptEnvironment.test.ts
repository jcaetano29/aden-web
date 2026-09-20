import { expect, it } from "vitest";
import * as THREE from "three";
import { addCryptEnvironment } from "./CryptEnvironment.js";
import { CRYPT_ROOMS, CRYPT_ROUTE, CRYPT_BOUNDS, STRUCTURE_BOXES } from "@aden/shared";

it("authors four chambers and the connecting route within the shared bounds", () => {
  const group = addCryptEnvironment(new THREE.Scene());
  expect(group.children.filter(c => c.name.startsWith("crypt-room-"))).toHaveLength(4);
  expect(group.children.filter(c => c.name.startsWith("crypt-passage-"))).toHaveLength(CRYPT_ROUTE.length - 1);
  for (const room of CRYPT_ROOMS) {
    const mesh = group.getObjectByName(`crypt-room-${room.id}`)!;
    expect(mesh.position.x).toBe(room.x); expect(mesh.position.z).toBe(room.z);
  }
  const bounds = new THREE.Box3().setFromObject(group);
  expect(bounds.min.x).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minX); expect(bounds.max.x).toBeLessThanOrEqual(CRYPT_BOUNDS.maxX);
  expect(bounds.min.z).toBeGreaterThanOrEqual(CRYPT_BOUNDS.minZ); expect(bounds.max.z).toBeLessThanOrEqual(CRYPT_BOUNDS.maxZ);
});

it("renders each solid collision structure exactly and keeps floor details below attack warnings", () => {
  const group = addCryptEnvironment(new THREE.Scene());
  for (const structure of STRUCTURE_BOXES.filter(s => s.mapId === "cripta" && s.solid)) {
    const mesh = group.children.find(c => c.userData.structureId === structure.id) as THREE.Mesh;
    expect(mesh).toBeDefined();
    expect(mesh.position.toArray()).toEqual([structure.x, structure.y, structure.z]);
    expect(mesh.rotation.y).toBe(structure.rotation);
    const geometry = mesh.geometry as THREE.BoxGeometry;
    expect([geometry.parameters.width, geometry.parameters.height, geometry.parameters.depth]).toEqual([structure.width, structure.height, structure.depth]);
  }
  for (const mesh of group.children.filter(c => c.userData.ground)) {
    expect(new THREE.Box3().setFromObject(mesh).max.y).toBeLessThan(.12);
  }
});
