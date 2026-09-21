import { getSkill, skillRange } from "@aden/shared";
import { COLORS, FONT_DISPLAY } from "./theme.js";
import "./GameLayout.css";

const SKILL_SLOT_WIDTH = 60;
const SKILL_SLOT_HEIGHT = 70;

/** Tinte del marco del slot según el tipo de skill. */
const TYPE_COLOR: Record<string, string> = {
  damage: "#e0713a",
  heal: "#5fd06a",
  buff: COLORS.exp1,
  dot: COLORS.arcane,
  dash: "#9ab0ff",
};

/**
 * Barra de skills (abajo-centro). Etapa 22: crece con las skills aprendidas
 * (hasta 6, teclas 1..6). Muestra nombre + tecla + veil local de cooldown
 * (UI optimista; el server es la autoridad real).
 */
export class SkillBar {
  private readonly root: HTMLDivElement;
  private slots: HTMLButtonElement[] = [];
  private nameEls: HTMLDivElement[] = [];
  private cooldownVeils: HTMLDivElement[] = [];
  private skillIds: string[] = [];
  private onUseSkill?: (skillId: string) => void;

  constructor(onUseSkill?: (skillId: string) => void) {
    this.onUseSkill = onUseSkill;
    this.root = document.createElement("div");
    this.root.dataset.skillBar = "";
    this.root.className = "aden-skill-bar";
    this.root.style.cssText =
      "pointer-events:auto;user-select:none;max-width:calc(100vw - 24px);" +
      "overflow-x:auto;overflow-y:hidden;";
    document.body.appendChild(this.root);
  }

  setOnUseSkill(onUseSkill: (skillId: string) => void): void {
    this.onUseSkill = onUseSkill;
  }

  private buildSlot(index: number, skillId: string): HTMLButtonElement {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.dataset.skillId = skillId;
    slot.title = `Usar ${skillId}`;
    slot.style.cssText =
      `width:${SKILL_SLOT_WIDTH}px;min-width:${SKILL_SLOT_WIDTH}px;height:${SKILL_SLOT_HEIGHT}px;` +
      "background:linear-gradient(180deg,#241b12,#120c07);" +
      "border:1px solid #4a380f;border-radius:8px;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;" +
      "padding:5px 4px;position:relative;overflow:hidden;" +
      "box-shadow:0 5px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(242,216,150,0.12);cursor:pointer;";
    slot.addEventListener("click", () => this.onUseSkill?.(skillId));

    const skillName = document.createElement("div");
    skillName.style.cssText =
      `font-family:${FONT_DISPLAY};font-size:10px;line-height:1.1;color:${COLORS.text};` +
      "text-align:center;display:flex;align-items:center;justify-content:center;flex:1;text-shadow:0 1px 2px #000;";
    skillName.textContent = "—";
    slot.appendChild(skillName);
    this.nameEls[index] = skillName;

    const keyLabel = document.createElement("div");
    keyLabel.style.cssText =
      `font-family:${FONT_DISPLAY};font-size:11px;font-weight:700;color:#241a0b;margin-top:3px;` +
      "background:linear-gradient(180deg,#f2d896,#c9a24b);border-radius:4px;padding:1px 7px;box-shadow:0 1px 2px rgba(0,0,0,0.5);";
    keyLabel.textContent = index < 6 ? String(index + 1) : "click";
    slot.appendChild(keyLabel);

    const cooldownVeil = document.createElement("div");
    cooldownVeil.style.cssText =
      "position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(4,3,2,0.72);display:none;pointer-events:none;transition:height linear;";
    slot.appendChild(cooldownVeil);
    this.cooldownVeils[index] = cooldownVeil;

    return slot;
  }

  /** Reconstruye la barra con las skills dadas (crece al aprender nuevas). */
  setSkills(ids: string[]) {
    // Reconstruir sólo si cambió la cantidad o el contenido.
    if (ids.length === this.skillIds.length && ids.every((id, i) => id === this.skillIds[i])) return;
    this.skillIds = [...ids];
    this.root.innerHTML = "";
    this.slots = [];
    this.nameEls = [];
    this.cooldownVeils = [];
    for (let i = 0; i < ids.length; i++) {
      const slot = this.buildSlot(i, ids[i]);
      const nameEl = this.nameEls[i];
      try {
        const skill = getSkill(ids[i]);
        nameEl.textContent = skill.name;
        const targeted = skill.type === "damage" || skill.type === "dot";
        slot.title = `${skill.name} · ${skill.mpCost} MP · ${skill.cooldownMs / 1000}s` +
          (targeted ? ` · Alcance ${skillRange(skill)} m` : " · Sobre vos") +
          (skill.stunMs ? ` · Stun ${skill.stunMs / 1000}s` : "") +
          (skill.rootMs ? ` · Inmoviliza ${skill.rootMs / 1000}s` : "");
        const tint = TYPE_COLOR[skill.type] ?? COLORS.gold;
        slot.style.borderColor = tint;
        slot.style.boxShadow = `0 5px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(242,216,150,0.12), 0 0 10px ${tint}44`;
      } catch {
        nameEl.textContent = "?";
        nameEl.style.color = "#666";
      }
      this.root.appendChild(slot);
      this.slots.push(slot);
    }
  }

  /** Cooldown visual en un slot (veil que crece de 0% a 100% en `ms`). */
  triggerCooldown(slotIndex: number, ms: number) {
    if (slotIndex < 0 || slotIndex >= this.cooldownVeils.length) return;
    const veil = this.cooldownVeils[slotIndex];
    veil.style.display = "";
    veil.style.height = "0%";
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
