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
  private readonly indicatorDiv: HTMLDivElement;
  private readonly indicatorMat: THREE.MeshStandardMaterial;
  private readonly indicatorMesh: THREE.Mesh;
  private ready = false;
  private pulse = 0;

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
    this.indicatorMat = indicatorMat;
    this.indicatorMesh = indicator;

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
    this.indicatorDiv = indicatorDiv;
  }

  /**
   * Cambia el indicador según el estado de la misión del jugador local:
   * - `ready=false` (misión activa, aún incompleta): "!" amarillo.
   * - `ready=true` (misión completa, lista para entregar): "✓" verde.
   * Da feedback claro de que el server registró el progreso: al llegar a n/n,
   * el cartel del NPC cambia de amarillo a verde.
   */
  setReady(ready: boolean): void {
    if (ready === this.ready) return;
    this.ready = ready;
    const color = ready ? 0x2ecc40 : 0xffff00;
    const hex = ready ? "#2ecc40" : "#ffff00";
    this.indicatorMat.color.setHex(color);
    this.indicatorMat.emissive.setHex(color);
    this.indicatorDiv.textContent = ready ? "✓" : "!";
    this.indicatorDiv.style.color = hex;
    this.css2dNameplate.element instanceof HTMLElement &&
      ((this.css2dNameplate.element as HTMLElement).style.color = hex);
  }

  /**
   * Animación de flotación/pulso del indicador (llamar cada frame con dt en s).
   * Un leve bob + escala para que el "!"/"✓" llame la atención.
   */
  update(dt: number): void {
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = 2.4 + Math.sin(this.pulse * 2) * 0.1;
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
