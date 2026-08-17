import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { TOWN } from "@aden/shared";

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
    // Crear root del Mercader, offset del Anciano (p.ej. +3 en x)
    this.object = new THREE.Group();
    this.object.position.set(TOWN.x + 3, 0, TOWN.z);
    scene.add(this.object);

    // Cuerpo: cilindro de color teal/azul para distinguirlo del Anciano
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0088aa });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    this.object.add(body);

    // Cabeza: esfera
    const headGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x00aacc });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.8;
    this.object.add(head);

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

    // Nameplate CSS2D: "Mercader"
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = "Mercader";
    nameplateDiv.style.cssText =
      "color:#ffd700;font:bold 12px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;";
    this.css2dNameplate = new CSS2DObject(nameplateDiv);
    this.css2dNameplate.position.set(0, 2.2, 0);
    this.object.add(this.css2dNameplate);
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
