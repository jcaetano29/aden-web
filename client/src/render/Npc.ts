import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { TOWN, ELDER_NAME } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

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

    // Túnica del Anciano: cono ancho abajo (robe) + capucha, low-poly encapuchado.
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x6b5230, flatShading: true, roughness: 0.9 });
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.6, 1.5, 8), robeMat);
    robe.position.y = 0.75;
    this.object.add(robe);
    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshStandardMaterial({ color: 0xc9a574, flatShading: true }));
    head.position.y = 1.7;
    this.object.add(head);
    // Capucha (cono sobre la cabeza).
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 8), robeMat);
    hood.position.y = 1.85;
    this.object.add(hood);
    // Barba (cono claro bajo la cara).
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xd9d2c4, flatShading: true }));
    beard.position.set(0, 1.5, 0.14); beard.rotation.x = Math.PI;
    this.object.add(beard);
    // Bastón con orbe brillante (acento cálido + luz tenue).
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6), new THREE.MeshStandardMaterial({ color: 0x4a3418 }));
    staff.position.set(0.42, 1.0, 0.1);
    this.object.add(staff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb347, emissiveIntensity: 1.2 }));
    orb.position.set(0.42, 2.05, 0.1);
    this.object.add(orb);
    this.object.add(new THREE.PointLight(0xffb347, 0.6, 6, 2).translateY(2.05).translateX(0.42));

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

    // Nameplate CSS2D: Anciano Rowan
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = ELDER_NAME;
    nameplateDiv.style.cssText =
      `color:#ffe066;font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;letter-spacing:0.5px;` +
      "text-shadow:0 0 4px #000,0 1px 2px #000;pointer-events:none;white-space:nowrap;";
    this.css2dNameplate = new CSS2DObject(nameplateDiv);
    this.css2dNameplate.position.set(0, 2.2, 0);
    this.object.add(this.css2dNameplate);

    // Indicador CSS2D "!" (alternativa/redundancia visual)
    const indicatorDiv = document.createElement("div");
    indicatorDiv.textContent = "!";
    indicatorDiv.style.cssText =
      `color:#ffe066;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;` +
      "text-shadow:0 0 6px rgba(255,220,80,0.8),0 0 3px #000;pointer-events:none;";
    this.css2dIndicator = new CSS2DObject(indicatorDiv);
    this.css2dIndicator.position.set(0, 2.5, 0);
    this.object.add(this.css2dIndicator);
    this.indicatorDiv = indicatorDiv;

    // Se crea después de Environment.enableShadows(), así que activamos las sombras aquí.
    this.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
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
