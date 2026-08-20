import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/** Etiquetas DOM (CSS2DObject) flotando sobre cada personaje. */
export class Nameplates {
  private readonly labels = new Map<string, CSS2DObject>();

  add(id: string, name: string, parent: THREE.Object3D, color?: string) {
    const div = document.createElement("div");
    div.textContent = name;
    const textColor = color ?? "#fff";
    div.style.cssText =
      `color:${textColor};font:12px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;`;
    const label = new CSS2DObject(div);
    label.position.set(0, 2.4, 0); // sobre la cabeza
    parent.add(label);
    this.labels.set(id, label);
  }

  /** Actualiza el texto de una etiqueta ya agregada (p.ej. cuando cambia el guildTag). */
  setText(id: string, text: string) {
    const label = this.labels.get(id);
    if (label) {
      (label.element as HTMLElement).textContent = text;
    }
  }

  remove(id: string) {
    const label = this.labels.get(id);
    if (label) {
      label.parent?.remove(label);
      this.labels.delete(id);
    }
  }
}
