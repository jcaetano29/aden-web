import { getSkill } from "@aden/shared";
import { COLORS, FONT_DISPLAY } from "./theme.js";

const SKILL_SLOT_WIDTH = 62;
const SKILL_SLOT_HEIGHT = 72;

/** Tinte del marco del slot según el tipo de skill (daño/cura/buff/dot). */
const TYPE_COLOR: Record<string, string> = {
  damage: "#e0713a",
  heal: "#5fd06a",
  buff: COLORS.exp1,
  dot: COLORS.arcane,
};

/**
 * Barra de 3 skills en la parte inferior-central de la pantalla.
 * Muestra nombre + tecla para cada slot y una veil local de cooldown
 * (sin autoridad del server; es meramente UI optimista).
 */
export class SkillBar {
  private readonly root: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private nameEls: HTMLDivElement[] = [];
  private cooldownVeils: HTMLDivElement[] = [];
  private skillIds: string[] = [];

  constructor() {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);pointer-events:none;" +
      "z-index:999;display:flex;gap:12px;user-select:none;";

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.style.cssText =
        `width:${SKILL_SLOT_WIDTH}px;height:${SKILL_SLOT_HEIGHT}px;` +
        "background:linear-gradient(180deg,#241b12,#120c07);" +
        "border:1px solid #4a380f;border-radius:8px;" +
        "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;" +
        "padding:5px 4px;position:relative;overflow:hidden;" +
        "box-shadow:0 5px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(242,216,150,0.12);";

      // Nombre de la skill (arriba)
      const skillName = document.createElement("div");
      skillName.style.cssText =
        `font-family:${FONT_DISPLAY};font-size:10.5px;line-height:1.1;color:${COLORS.text};` +
        "text-align:center;display:flex;align-items:center;justify-content:center;flex:1;" +
        "text-shadow:0 1px 2px #000;";
      skillName.textContent = "—";
      slot.appendChild(skillName);
      this.nameEls.push(skillName);

      // Tecla (abajo) — badge dorado.
      const keyLabel = document.createElement("div");
      keyLabel.style.cssText =
        `font-family:${FONT_DISPLAY};font-size:11px;font-weight:700;color:#241a0b;margin-top:3px;` +
        "background:linear-gradient(180deg,#f2d896,#c9a24b);border-radius:4px;padding:1px 7px;" +
        "box-shadow:0 1px 2px rgba(0,0,0,0.5);";
      keyLabel.textContent = i === 0 ? "1" : String(i + 1);
      slot.appendChild(keyLabel);

      // Veil de cooldown: overlay que se oscurece con animación de height
      const cooldownVeil = document.createElement("div");
      cooldownVeil.style.cssText =
        "position:absolute;top:0;left:0;right:0;bottom:0;" +
        "background:rgba(4,3,2,0.72);display:none;pointer-events:none;" +
        "transition:height linear;";
      slot.appendChild(cooldownVeil);

      this.root.appendChild(slot);
      this.slots.push(slot);
      this.cooldownVeils.push(cooldownVeil);
    }

    document.body.appendChild(this.root);
  }

  /** Vincula las 3 skills a los slots y renderiza nombres + teclas + tinte por tipo. */
  setSkills(ids: string[]) {
    this.skillIds = ids;
    for (let i = 0; i < 3; i++) {
      const skillId = ids[i];
      const nameEl = this.nameEls[i];
      const slot = this.slots[i];
      if (!nameEl || !slot) continue;
      if (skillId) {
        try {
          const skill = getSkill(skillId);
          nameEl.textContent = skill.name;
          nameEl.style.color = COLORS.text;
          const tint = TYPE_COLOR[skill.type] ?? COLORS.gold;
          slot.style.borderColor = tint;
          slot.style.boxShadow =
            `0 5px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(242,216,150,0.12), 0 0 10px ${tint}44`;
        } catch {
          nameEl.textContent = "?";
          nameEl.style.color = "#666";
        }
      } else {
        nameEl.textContent = "—";
        nameEl.style.color = "#666";
      }
    }
  }

  /**
   * Activa el cooldown visual en un slot: la veil se anima desde 0% a 100%
   * altura sobre `ms` milisegundos, oscureciendo el slot.
   */
  triggerCooldown(slotIndex: number, ms: number) {
    if (slotIndex < 0 || slotIndex >= this.cooldownVeils.length) return;

    const veil = this.cooldownVeils[slotIndex];
    veil.style.display = "";
    veil.style.height = "0%";

    // Forzar reflow para que la transición se animen desde 0%
    void veil.offsetHeight;

    veil.style.transition = `height ${ms}ms linear`;
    veil.style.height = "100%";

    setTimeout(() => {
      veil.style.display = "none";
      veil.style.height = "0%";
      veil.style.transition = "";
    }, ms);
  }

  remove() {
    this.root.remove();
  }
}
