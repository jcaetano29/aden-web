import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { FONT_DISPLAY } from "./theme.js";

const LIFETIME_MS = 800;
const RISE_HEIGHT = 1.2; // unidades de mundo que sube durante toda su vida
const POP_MS = 140; // duración del pop de escala al nacer

interface ActiveNumber {
  obj: CSS2DObject;
  el: HTMLDivElement;
  bornAt: number;
  baseY: number;
  anchor: THREE.Vector3;
}

/**
 * Números de daño flotantes (CSS2D). Se agregan directamente a la escena en la
 * posición de mundo del golpe (no como hijos del mob) porque su vida es corta
 * (~800ms) y no necesitan seguir al mob que se mueve.
 */
export class DamageNumbers {
  private readonly active: ActiveNumber[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  private place(obj: CSS2DObject, el: HTMLDivElement, worldPos: THREE.Vector3): void {
    const nearby = this.active.filter(n => n.anchor.distanceToSquared(worldPos) < 1).length;
    obj.position.copy(worldPos);
    obj.position.x += ((nearby % 3) - 1) * .38;
    obj.position.y += nearby * .3;
    this.scene.add(obj);
    this.active.push({ obj, el, bornAt: performance.now(), baseY: obj.position.y, anchor: worldPos.clone() });
  }

  spawn(worldPos: THREE.Vector3, amount: number) {
    const el = document.createElement("div");
    const n = Math.round(amount);
    // Large hits are emphasized without claiming a server-confirmed critical.
    const crit = n >= 40;
    el.textContent = String(n);
    const size = (crit ? 22 : 15) + Math.min(28, n) * 0.45;
    const color = crit ? "#ff8a2a" : "#ffe08a";
    const glow = crit ? ",0 0 12px rgba(255,120,30,0.9)" : ",0 0 6px rgba(255,200,80,0.5)";
    el.style.cssText =
      `color:${color};font-family:${FONT_DISPLAY};font-weight:700;font-size:${size}px;` +
      `text-shadow:0 2px 3px #000,0 0 3px #000${glow};pointer-events:none;white-space:nowrap;transform-origin:center;`;
    const obj = new CSS2DObject(el);
    this.place(obj, el, worldPos);
  }

  /** Muestra un texto personalizado (ej: "¡Esquivado!") en una posición. */
  spawnText(worldPos: THREE.Vector3, text: string, color: string) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText =
      `color:${color};font-family:${FONT_DISPLAY};font-weight:700;font-size:17px;` +
      "text-shadow:0 2px 3px #000,0 0 4px #000;pointer-events:none;white-space:nowrap;transform-origin:center;";
    const obj = new CSS2DObject(el);
    this.place(obj, el, worldPos);
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
      // Pop de escala: nace grande (1.5x) y se asienta a tamaño normal (1x)
      // en los primeros POP_MS de vida, para que el golpe se sienta con "punch".
      const age = now - n.bornAt;
      const scale = age < POP_MS ? 1.5 - 0.5 * (age / POP_MS) : 1;
      n.el.style.transform = `scale(${scale})`;
    }
  }
}
