import { NpcAppearance } from "./NpcAppearance.js";
import type { CharacterFactory } from "./CharacterFactory.js";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { ELDER_NAME, getNpc } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

/** Animated service character preserving its interaction root and nameplate. */
export class Npc {
  readonly object: THREE.Object3D;
  private readonly css2dNameplate: CSS2DObject;
  private readonly css2dIndicator: CSS2DObject;
  private readonly indicatorDiv: HTMLDivElement;
  private readonly indicatorMat: THREE.MeshStandardMaterial;
  private readonly indicatorMesh: THREE.Mesh;
  private ready = false;
  private pulse = 0;
  private readonly appearance: NpcAppearance;

  constructor(scene: THREE.Scene, _css2dLayer: unknown, factory: CharacterFactory) {
    // Crear root del NPC (posición desde el registro de NPCs).
    const def = getNpc("elder");
    this.object = new THREE.Group();
    this.object.position.set(def.x, 0, def.z);
    scene.add(this.object);

    this.appearance = new NpcAppearance(factory, "elder");
    this.object.add(this.appearance.root);

    // Indicador "!" flotante: esfera pequeña emissiva sobre la cabeza
    const indicatorGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
    });
    const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
    indicator.position.y = this.appearance.height + 0.65;
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
    this.css2dNameplate.center.set(0.5, 0);
    this.css2dNameplate.position.set(0, this.appearance.height + 0.3, 0);
    this.object.add(this.css2dNameplate);

    // Indicador CSS2D "!" (alternativa/redundancia visual)
    const indicatorDiv = document.createElement("div");
    indicatorDiv.textContent = "!";
    indicatorDiv.style.cssText =
      `color:#ffe066;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;` +
      "text-shadow:0 0 6px rgba(255,220,80,0.8),0 0 3px #000;pointer-events:none;";
    this.css2dIndicator = new CSS2DObject(indicatorDiv);
    this.css2dIndicator.center.set(0.5, 1);
    this.css2dIndicator.position.set(0, this.appearance.height + 0.85, 0);
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
    this.appearance.update(dt);
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = this.appearance.height + 0.65 + Math.sin(this.pulse * 2) * 0.1;
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
