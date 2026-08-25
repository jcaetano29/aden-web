import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { WorldObjectViews } from "./WorldObjectViews.js";

const snap = (over: Partial<Parameters<WorldObjectViews["add"]>[1]> = {}) => ({
  id: "c1", kind: "chest", mapId: "bosque", x: 300, z: 0, active: true, ...over,
});

describe("WorldObjectViews", () => {
  it("un objeto activo del mapa actual es clickeable; usado o de otro mapa, no", () => {
    const views = new WorldObjectViews(new THREE.Scene());
    views.setCurrentMap("bosque");
    views.add("c1", snap());

    let t = views.raycastTargets();
    expect(t.objects).toHaveLength(1);
    expect(t.idOf(t.objects[0])).toBe("c1");

    // Usado (abierto) → ya no clickeable.
    views.update("c1", snap({ active: false }));
    expect(views.raycastTargets().objects).toHaveLength(0);

    // Reactivado pero en otro mapa → tampoco.
    views.update("c1", snap({ active: true }));
    views.setCurrentMap("ruinas");
    expect(views.raycastTargets().objects).toHaveLength(0);
  });
});
