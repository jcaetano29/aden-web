import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { HazardViews } from "./HazardViews.js";
import type { MobSnapshot } from "../net/NetworkClient.js";

const snap = (patch: Partial<MobSnapshot> = {}): MobSnapshot => ({
  name: "Custodio", x: 900, z: -37, targetX: 900, targetZ: -37, moving: false,
  dead: false, hp: 500, maxHp: 500, windupMs: 0, mapId: "cripta",
  hazardMs: 1600, hazardX: 892, hazardZ: -30, hazardRadius: 6, ...patch,
});

describe("boss ground warnings", () => {
  it("uses the fixed server center and exact radius while the boss moves", () => {
    const scene = new THREE.Scene(); const views = new HazardViews(scene); views.setCurrentMap("cripta");
    views.update("boss", snap()); const warning = scene.getObjectByName("hazard-boss")!;
    expect(warning.visible).toBe(true); expect(warning.position.x).toBe(892); expect(warning.scale.x).toBe(6);
    views.update("boss", snap({ x: 910, z: -40, hazardMs: 700 }));
    expect(warning.position.x).toBe(892); expect(warning.position.z).toBe(-30);
    views.update("boss", snap({ hazardMs: 0 })); expect(warning.visible).toBe(false);
  });
  it("draws a frontal cone with the server aperture and facing", () => {
    const scene = new THREE.Scene(); const views = new HazardViews(scene); views.setCurrentMap("cripta");
    views.update("boss", snap({ hazardArc: Math.PI / 2, hazardAngle: Math.PI / 2, hazardRadius: 9 }));
    const warning = scene.getObjectByName("hazard-boss")!;
    const fill = warning.children[0] as THREE.Mesh<THREE.CircleGeometry>;
    expect(fill.geometry.parameters.thetaLength).toBeCloseTo(Math.PI / 2);
    expect(warning.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(warning.scale.x).toBe(9);
    views.update("boss", snap({ hazardArc: Math.PI * 2 }));
    expect((warning.children[0] as THREE.Mesh<THREE.CircleGeometry>).geometry.parameters.thetaLength).toBeCloseTo(Math.PI * 2);
  });
  it("hides immediately for death, cancelled casts and another map and disposes on removal", () => {
    const scene = new THREE.Scene(); const views = new HazardViews(scene); views.setCurrentMap("cripta");
    views.update("boss", snap()); const warning = scene.getObjectByName("hazard-boss")!;
    views.setCurrentMap("pueblo"); expect(warning.visible).toBe(false);
    views.setCurrentMap("cripta"); expect(warning.visible).toBe(true);
    views.update("boss", snap({ dead: true })); expect(warning.visible).toBe(false);
    views.setCurrentMap("cripta"); expect(warning.visible).toBe(false);
    const mesh = warning.children[0] as THREE.Mesh;
    const geometryDispose = vi.spyOn(mesh.geometry, "dispose");
    const materialDispose = vi.spyOn(mesh.material as THREE.Material, "dispose");
    views.remove("boss"); expect(scene.children).toHaveLength(0);
    expect(geometryDispose).toHaveBeenCalledOnce(); expect(materialDispose).toHaveBeenCalledOnce();
  });
});
