import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { TOWN } from "@aden/shared";

/**
 * NPC quest-giver en el pueblo. Usa un mesh geométrico simple (tall box + sphere
 * para la cabeza) para evitar complejidad de carga de modelos. Incluye:
 * - Nameplate CSS2D "Anciano del Pueblo"
 * - Indicador "!" flotante (esfera pequeña emissiva) sobre la cabeza
 * - Expone su objeto root para raycast
 */
export class Npc {
  readonly object: THREE.Object3D;
  private readonly css2dNameplate: CSS2DObject;
  private readonly css2dIndicator: CSS2DObject;

  constructor(scene: THREE.Scene, css2dLayer: any) {
    // Crear root del NPC
    this.object = new THREE.Group();
    this.object.position.set(TOWN.x, 0, TOWN.z);
    scene.add(this.object);

    // Cuerpo simple: cilindro para el torso
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    this.object.add(body);

    // Cabeza: esfera
    const headGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xc9a574 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.8;
    this.object.add(head);

    // Indicador "!" flotante: esfera pequeña emissiva sobre la cabeza
    const indicatorGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
    });
    const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
    indicator.position.y = 2.4;
    this.object.add(indicator);

    // Nameplate CSS2D: "Anciano del Pueblo"
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = "Anciano del Pueblo";
    nameplateDiv.style.cssText =
      "color:#ffff00;font:bold 12px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;";
    this.css2dNameplate = new CSS2DObject(nameplateDiv);
    this.css2dNameplate.position.set(0, 2.2, 0);
    this.object.add(this.css2dNameplate);

    // Indicador CSS2D "!" (alternativa/redundancia visual)
    const indicatorDiv = document.createElement("div");
    indicatorDiv.textContent = "!";
    indicatorDiv.style.cssText =
      "color:#ffff00;font:bold 20px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;";
    this.css2dIndicator = new CSS2DObject(indicatorDiv);
    this.css2dIndicator.position.set(0, 2.5, 0);
    this.object.add(this.css2dIndicator);
  }

  /**
   * Devuelve la posición mundial actual del NPC (útil para checks de proximidad
   * o debugging de raycast).
   */
  getWorldPosition(): THREE.Vector3 {
    const v = new THREE.Vector3();
    this.object.getWorldPosition(v);
    return v;
  }
}
