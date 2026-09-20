import { clothMat } from "./textures.js";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNpc } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

/**
 * NPC Mercader en el pueblo. Usa un mesh geométrico simple (cilindro + esfera
 * para la cabeza, con colores distintivos) para evitar complejidad de carga de
 * modelos. Incluye:
 * - Nameplate CSS2D "Mercader"
 * - Indicador "$" flotante (esfera pequeña emissive dorada) sobre la cabeza
 * - Expone su objeto root para raycast
 */
export class Merchant {
  readonly object: THREE.Object3D;
  private readonly css2dNameplate: CSS2DObject;
  private readonly indicatorMesh: THREE.Mesh;
  private readonly indicatorMat: THREE.MeshStandardMaterial;
  private pulse = 0;

  constructor(scene: THREE.Scene, css2dLayer: any) {
    // Crear root del Mercader (posición desde el registro de NPCs).
    const def = getNpc("merchant");
    this.object = new THREE.Group();
    this.object.position.set(def.x, 0, def.z);
    scene.add(this.object);

    // Túnica del Mercader: robe teal encapuchado, para distinguirlo del Anciano.
    const robeMat = clothMat(0x1b6f82);
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.58, 1.5, 8), robeMat);
    robe.position.y = 0.75;
    this.object.add(robe);
    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshStandardMaterial({ color: 0xc9a574, flatShading: true }));
    head.position.y = 1.7;
    this.object.add(head);
    // Turbante/capucha teal claro.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), clothMat(0x2a94ab));
    cap.position.y = 1.82;
    this.object.add(cap);
    // Fajín dorado.
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xc9a24b, flatShading: true, emissive: 0x6a4f18, emissiveIntensity: 0.4 }));
    sash.position.y = 0.62;
    this.object.add(sash);

    // Indicador "$" flotante: esfera pequeña emissiva dorada sobre la cabeza
    const indicatorGeom = new THREE.SphereGeometry(0.15, 8, 8);
    this.indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
    });
    const indicator = new THREE.Mesh(indicatorGeom, this.indicatorMat);
    indicator.position.y = 2.4;
    this.object.add(indicator);
    this.indicatorMesh = indicator;

    // Nameplate CSS2D: nombre del Mercader (registro de NPCs).
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = def.name;
    nameplateDiv.style.cssText =
      `color:#ffd54f;font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;letter-spacing:0.5px;` +
      "text-shadow:0 0 4px #000,0 1px 2px #000;pointer-events:none;white-space:nowrap;";
    this.css2dNameplate = new CSS2DObject(nameplateDiv);
    this.css2dNameplate.position.set(0, 2.2, 0);
    this.object.add(this.css2dNameplate);

    // Se crea después de Environment.enableShadows(), así que activamos las sombras aquí.
    this.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  }

  /**
   * Animación de flotación/pulso del indicador (llamar cada frame con dt en s).
   * Un leve bob + escala para que el "$" llame la atención.
   */
  update(dt: number): void {
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = 2.4 + Math.sin(this.pulse * 2) * 0.1;
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
