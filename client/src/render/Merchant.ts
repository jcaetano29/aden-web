import { NpcAppearance } from "./NpcAppearance.js";
import type { CharacterFactory } from "./CharacterFactory.js";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNpc } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

/** Animated service character preserving its interaction root and nameplate. */
export class Merchant {
  readonly object: THREE.Object3D;
  private readonly css2dNameplate: CSS2DObject;
  private readonly indicatorMesh: THREE.Mesh;
  private readonly indicatorMat: THREE.MeshStandardMaterial;
  private pulse = 0;
  private readonly appearance: NpcAppearance;

  constructor(scene: THREE.Scene, _css2dLayer: unknown, factory: CharacterFactory) {
    // Crear root del Mercader (posición desde el registro de NPCs).
    const def = getNpc("merchant");
    this.object = new THREE.Group();
    this.object.position.set(def.x, 0, def.z);
    scene.add(this.object);

    this.appearance = new NpcAppearance(factory, "merchant");
    this.object.add(this.appearance.root);

    // Indicador "$" flotante: esfera pequeña emissiva dorada sobre la cabeza
    const indicatorGeom = new THREE.SphereGeometry(0.15, 8, 8);
    this.indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
    });
    const indicator = new THREE.Mesh(indicatorGeom, this.indicatorMat);
    indicator.position.y = this.appearance.height + 0.65;
    this.object.add(indicator);
    this.indicatorMesh = indicator;

    // Nameplate CSS2D: nombre del Mercader (registro de NPCs).
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = def.name;
    nameplateDiv.style.cssText =
      `color:#ffd54f;font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;letter-spacing:0.5px;` +
      "text-shadow:0 0 4px #000,0 1px 2px #000;pointer-events:none;white-space:nowrap;";
    this.css2dNameplate = new CSS2DObject(nameplateDiv);
    this.css2dNameplate.center.set(0.5, 0);
    this.css2dNameplate.position.set(0, this.appearance.height + 0.3, 0);
    this.object.add(this.css2dNameplate);

    // Se crea después de Environment.enableShadows(), así que activamos las sombras aquí.
    this.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  }

  /**
   * Animación de flotación/pulso del indicador (llamar cada frame con dt en s).
   * Un leve bob + escala para que el "$" llame la atención.
   */
  update(dt: number): void {
    this.appearance.update(dt);
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = this.appearance.height + 0.65 + Math.sin(this.pulse * 2) * 0.1;
  }

  /**
   * Devuelve la posición mundial actual del Mercader (útil para checks de
   * proximidad o debugging de raycast).
   */
  getWorldPosition(): THREE.Vector3 {
    const v = new THREE.Vector3();
    this.object.getWorldPosition(v);
    return v;
  }
}
