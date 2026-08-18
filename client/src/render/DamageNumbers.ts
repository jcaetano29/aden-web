import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

const LIFETIME_MS = 800;
const RISE_HEIGHT = 1.2; // unidades de mundo que sube durante toda su vida

interface ActiveNumber {
  obj: CSS2DObject;
  el: HTMLDivElement;
  bornAt: number;
  baseY: number;
}

/**
 * Números de daño flotantes (CSS2D). Se agregan directamente a la escena en la
 * posición de mundo del golpe (no como hijos del mob) porque su vida es corta
 * (~800ms) y no necesitan seguir al mob que se mueve.
 */
export class DamageNumbers {
  private readonly active: ActiveNumber[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(worldPos: THREE.Vector3, amount: number) {
    const el = document.createElement("div");
    el.textContent = String(Math.round(amount));
    el.style.cssText =
      "color:#ffd23f;font:bold 16px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;";
    const obj = new CSS2DObject(el);
    obj.position.copy(worldPos);
    this.scene.add(obj);
    this.active.push({ obj, el, bornAt: performance.now(), baseY: worldPos.y });
  }

  /** Muestra un texto personalizado (ej: "¡Esquivado!") en una posición. */
  spawnText(worldPos: THREE.Vector3, text: string, color: string) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = `color:${color};font:bold 16px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;`;
    const obj = new CSS2DObject(el);
    obj.position.copy(worldPos);
    this.scene.add(obj);
    this.active.push({ obj, el, bornAt: performance.now(), baseY: worldPos.y });
  }

  /** Anima la subida/desvanecido y auto-remueve los números vencidos. Llamar en el render loop. */
  update(_dt: number) {
    if (this.active.length === 0) return;
    const now = performance.now();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const n = this.active[i];
      const t = (now - n.bornAt) / LIFETIME_MS;
      if (t >= 1) {
        this.scene.remove(n.obj);
        this.active.splice(i, 1);
        continue;
      }
      n.obj.position.y = n.baseY + RISE_HEIGHT * t;
      n.el.style.opacity = String(1 - t);
    }
  }
}
