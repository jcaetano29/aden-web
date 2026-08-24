import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

interface Plate {
  label: CSS2DObject;
  titleEl: HTMLDivElement;
  nameEl: HTMLDivElement;
}

/**
 * Etiquetas DOM (CSS2DObject) flotando sobre cada personaje: una línea de título
 * dorada opcional (Etapa 13, logros) sobre el nombre. Los mobs usan sólo el nombre.
 */
export class Nameplates {
  private readonly plates = new Map<string, Plate>();

  add(id: string, name: string, parent: THREE.Object3D, color?: string, title = "") {
    const wrap = document.createElement("div");
    wrap.style.cssText = "text-align:center;pointer-events:none;white-space:nowrap;line-height:1.15;";

    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.cssText =
      "color:#ffd54f;font:italic bold 10px sans-serif;text-shadow:0 0 3px #000;" +
      (title ? "" : "display:none;");

    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    nameEl.style.cssText = `color:${color ?? "#fff"};font:12px sans-serif;text-shadow:0 0 3px #000;`;

    wrap.append(titleEl, nameEl);
    const label = new CSS2DObject(wrap);
    label.position.set(0, 2.4, 0);
    parent.add(label);
    this.plates.set(id, { label, titleEl, nameEl });
  }

  /** Actualiza el texto del NOMBRE (p.ej. cuando cambia el guildTag). */
  setText(id: string, text: string) {
    const p = this.plates.get(id);
    if (p) p.nameEl.textContent = text;
  }

  /** Actualiza el TÍTULO lucido ("" lo oculta). */
  setTitle(id: string, title: string) {
    const p = this.plates.get(id);
    if (!p) return;
    p.titleEl.textContent = title;
    p.titleEl.style.display = title ? "" : "none";
  }

  remove(id: string) {
    const p = this.plates.get(id);
    if (p) {
      p.label.parent?.remove(p.label);
      this.plates.delete(id);
    }
  }
}
