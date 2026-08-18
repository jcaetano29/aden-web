import { getSkill } from "@aden/shared";

const SKILL_SLOT_WIDTH = 60;
const SKILL_SLOT_HEIGHT = 70;

/**
 * Barra de 3 skills en la parte inferior-central de la pantalla.
 * Muestra nombre + tecla para cada slot y una veil local de cooldown
 * (sin autoridad del server; es meramente UI optimista).
 */
export class SkillBar {
  private readonly root: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private cooldownVeils: HTMLDivElement[] = [];
  private skillIds: string[] = [];

  constructor() {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);pointer-events:none;" +
      "z-index:999;display:flex;gap:10px;user-select:none;";

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.style.cssText =
        `width:${SKILL_SLOT_WIDTH}px;height:${SKILL_SLOT_HEIGHT}px;` +
        "background:#1a1a1a;border:2px solid #444;border-radius:4px;" +
        "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;" +
        "padding:4px;position:relative;overflow:hidden;";

      // Nombre de la skill (arriba)
      const skillName = document.createElement("div");
      skillName.style.cssText =
        "font-size:11px;color:#aaa;text-align:center;min-height:20px;" +
        "display:flex;align-items:center;justify-content:center;flex:1;";
      skillName.textContent = "—";
      slot.appendChild(skillName);

      // Tecla (abajo)
      const keyLabel = document.createElement("div");
      keyLabel.style.cssText =
        "font-size:12px;font-weight:bold;color:#ffd54f;margin-top:2px;";
      keyLabel.textContent = `${i === 0 ? "Space" : i}`;
      slot.appendChild(keyLabel);

      // Veil de cooldown: overlay que se oscurece con animación de height
      const cooldownVeil = document.createElement("div");
      cooldownVeil.style.cssText =
        "position:absolute;top:0;left:0;right:0;bottom:0;" +
        "background:rgba(0,0,0,0.7);display:none;pointer-events:none;" +
        "transition:height linear;";
      slot.appendChild(cooldownVeil);

      this.root.appendChild(slot);
      this.slots.push(slot);
      this.cooldownVeils.push(cooldownVeil);
    }

    document.body.appendChild(this.root);
  }

  /** Vincula las 3 skills a los slots y renderiza nombres + teclas. */
  setSkills(ids: string[]) {
    this.skillIds = ids;
    for (let i = 0; i < 3; i++) {
      const skillId = ids[i];
      const slot = this.slots[i];
      if (!slot) continue;

      // Extraer el nombre de la skill
      const skillName = slot.querySelector("div") as HTMLDivElement;
      if (skillName && skillId) {
        try {
          const skill = getSkill(skillId);
          skillName.textContent = skill.name;
          skillName.style.color = "#ddd";
        } catch {
          skillName.textContent = "?";
          skillName.style.color = "#666";
        }
      } else {
        skillName!.textContent = "—";
        skillName!.style.color = "#666";
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
