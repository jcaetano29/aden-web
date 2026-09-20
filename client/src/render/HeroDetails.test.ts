import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { addRangerEquipment } from "./HeroDetails.js";

describe("addRangerEquipment", () => {
  it("añade arco y carcaj procedurales a la silueta", () => {
    const root = new THREE.Group();
    root.userData.visualHeight = 2.4;
    const hand = new THREE.Group(); hand.name = "HandR"; root.add(hand);
    const spine = new THREE.Group(); spine.name = "Spine2"; root.add(spine);

    addRangerEquipment(root);

    expect(root.getObjectByName("ranger_bow")).toBeTruthy();
    expect(root.getObjectByName("ranger_quiver")).toBeTruthy();
    expect(root.getObjectByName("ranger_arrow_0")).toBeTruthy();
  });
});
