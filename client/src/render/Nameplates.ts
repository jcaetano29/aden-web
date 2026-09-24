import { enemyThreat } from "@aden/shared";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "./theme.js";
import type { ChatMessage } from '@aden/shared';
import './Nameplates.css';

const CHAT_BUBBLE_MS = 5000;
const CHAT_FADE_MS = 600;

interface Plate {
  label: CSS2DObject;
  titleEl: HTMLDivElement;
  nameEl: HTMLDivElement;
  bubble?: { el: HTMLDivElement; expiresAt: number; mapId: string };
}

/**
 * Etiquetas DOM (CSS2DObject) flotando sobre cada personaje: una línea de título
 * dorada opcional (Etapa 13, logros) sobre el nombre. Los mobs usan sólo el nombre.
 */
export class Nameplates {
  private readonly plates = new Map<string, Plate>();

  constructor(private readonly now: () => number = () => performance.now()) {}

  add(id: string, name: string, parent: THREE.Object3D, color?: string, title = "") {
    const wrap = document.createElement("div");
    wrap.style.cssText = "text-align:center;pointer-events:none;white-space:nowrap;line-height:1.15;";

    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.cssText =
      `color:${COLORS.goldBright};font-family:${FONT_DISPLAY};font-style:italic;font-weight:600;font-size:10px;` +
      "letter-spacing:0.5px;text-shadow:0 0 4px #000,0 1px 2px #000;" +
      (title ? "" : "display:none;");

    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    nameEl.style.cssText =
      `color:${color ?? "#f3ecdd"};font-family:${FONT_BODY};font-weight:600;font-size:13px;` +
      "letter-spacing:0.3px;text-shadow:0 0 4px #000,0 1px 2px #000,0 0 2px #000;";

    wrap.append(titleEl, nameEl);
    const label = new CSS2DObject(wrap);
    label.position.set(0, (parent.userData.visualHeight ?? 2) + 0.5, 0);
    parent.add(label);
    this.plates.set(id, { label, titleEl, nameEl });
  }

  setEnemy(id: string, name: string, level: number, rank: string, playerLevel: number) {
    const p = this.plates.get(id); if (!p) return;
    const threat = enemyThreat(playerLevel, level);
    const category = rank === 'boss' ? 'Jefe' : rank === 'elite' ? 'Élite' : '';
    p.nameEl.textContent = [threat.symbol, name, '· Nv. ' + level, category].filter(Boolean).join(' ');
    p.nameEl.style.color = threat.color;
    this.setTitle(id, level - playerLevel >= 3 ? threat.label : '');
    p.titleEl.style.color = threat.color;
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

  /** One bubble per character, attached above the existing name/title label. */
  showChat(message: ChatMessage): void {
    if (message.channel !== 'local') return;
    const plate = this.plates.get(message.senderId);
    if (!plate || plate.label.parent?.visible === false) return;
    plate.bubble?.el.remove();
    const el = document.createElement('div');
    el.className = 'aden-chat-bubble'; el.dataset.chatBubble = message.senderId;
    // The chat log already announces messages to assistive technology.
    el.setAttribute('aria-hidden', 'true');
    el.textContent = message.text; el.style.opacity = '1';
    plate.label.element.append(el);
    plate.bubble = { el, expiresAt: this.now() + CHAT_BUBBLE_MS, mapId: message.mapId };
  }

  /** Called after map visibility is updated, so bubbles never follow a warp. */
  updateChat(currentMapId: string): void {
    const now = this.now();
    for (const plate of this.plates.values()) {
      const bubble = plate.bubble;
      if (!bubble) continue;
      const remaining = bubble.expiresAt - now;
      if (remaining <= 0 || bubble.mapId !== currentMapId || plate.label.parent?.visible === false) {
        bubble.el.remove(); plate.bubble = undefined;
      } else {
        bubble.el.style.opacity = String(Math.min(1, remaining / CHAT_FADE_MS));
      }
    }
  }

  clearChat(): void {
    for (const plate of this.plates.values()) {
      plate.bubble?.el.remove(); plate.bubble = undefined;
    }
  }

  remove(id: string) {
    const p = this.plates.get(id);
    if (p) {
      p.label.parent?.remove(p.label);
      this.plates.delete(id);
    }
  }
}
