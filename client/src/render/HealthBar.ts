import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

const WIDTH_PX = 40;
const HEIGHT_PX = 5;
const OFFSET_Y = 2.6; // sobre la cabeza del mob (nameplates de jugador usan 2.4)

// Interpolación lineal de color verde (hp lleno) -> rojo (hp vacío).
const COLOR_FULL = { r: 76, g: 175, b: 80 };
const COLOR_EMPTY = { r: 220, g: 53, b: 53 };

function colorForRatio(ratio: number): string {
  const r = Math.round(COLOR_FULL.r + (COLOR_EMPTY.r - COLOR_FULL.r) * (1 - ratio));
  const g = Math.round(COLOR_FULL.g + (COLOR_EMPTY.g - COLOR_FULL.g) * (1 - ratio));
  const b = Math.round(COLOR_FULL.b + (COLOR_EMPTY.b - COLOR_FULL.b) * (1 - ratio));
  return `rgb(${r},${g},${b})`;
}

/** Barra de HP (CSS2D) flotando sobre una entidad; relleno verde->rojo según hp/maxHp. */
export class HealthBar {
  private readonly root: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private label: CSS2DObject | null = null;

  constructor() {
    this.root = document.createElement("div");
    this.root.style.cssText =
      `width:${WIDTH_PX}px;height:${HEIGHT_PX}px;background:#2a0d0d;border:1px solid rgba(0,0,0,0.8);` +
      "border-radius:2px;overflow:hidden;pointer-events:none;";
    this.fill = document.createElement("div");
    this.fill.style.cssText = `height:100%;width:100%;background:${colorForRatio(1)};`;
    this.root.appendChild(this.fill);
  }

  /** Adjunta la barra sobre `parent` (root Object3D del mob). Idempotente. */
  attach(parent: THREE.Object3D) {
    if (this.label) return;
    this.label = new CSS2DObject(this.root);
    this.label.position.set(0, OFFSET_Y, 0);
    parent.add(this.label);
  }

  /** Refleja hp/maxHp: ancho proporcional del relleno + color verde->rojo. */
  update(hp: number, maxHp: number) {
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    this.fill.style.width = `${ratio * 100}%`;
    this.fill.style.background = colorForRatio(ratio);
  }

  /** Muestra/oculta la barra (p.ej. ocultar en muerte, mostrar de nuevo en respawn). */
  setVisible(visible: boolean) {
    this.root.style.display = visible ? "" : "none";
  }

  remove() {
    if (this.label) {
      this.label.parent?.remove(this.label);
      this.label = null;
    }
  }
}
