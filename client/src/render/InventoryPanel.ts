import {
  getItem,
  EQUIP_SLOTS,
  SLOT_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  QUALITY_LABELS,
  EXCELLENT_LABELS,
  offensiveOptions,
  canEquipItem,
  CLASSES,
  type EquipSlot,
} from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "./theme.js";

export interface InventoryPanelCallbacks {
  onUseItem?: (itemTemplateId: string, targetItemId?: string) => void;
  onEquip?: (itemTemplateId: string) => void;
  onUnequip?: (slot: string) => void;
}

export interface InventoryView {
  entries: { itemTemplateId: string; qty: number; name: string }[];
  /** slot → itemTemplateId equipado. */
  equipment: Record<string, string>;
  /** Stats de combate efectivos (base + equipo) para el encabezado. */
  stats: { pAtk: number; pDef: number };
  /** Optional for compatibility with callers that do not validate equipment locally. */
  className?: string;
  level?: number;
}

/**
 * Panel de inventario + EQUIPO (tecla "i"). Muestra los stats de combate efectivos,
 * un paperdoll de 3 slots (arma/armadura/accesorio) con lo equipado + "Quitar", y la
 * lista del inventario con los nombres de equipo coloreados por rareza y un botón
 * "Equipar"/"Usar" según el tipo. Sólo refleja el estado sincronizado — nunca lo muta
 * (el server es autoritativo). Un signature-guard evita redibujar cada frame (si no,
 * los botones parpadean y se pierde el hover).
 */
export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private visible = false;
  private readonly cb: InventoryPanelCallbacks;
  private lastSig = "";

  constructor(parent: HTMLElement = document.body, cb: InventoryPanelCallbacks = {}) {
    this.cb = cb;
    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-scroll aden-fadein";
    this.root.style.cssText =
      // top:200 → debajo del minimapa para no superponerse.
      "position:fixed;right:14px;top:200px;display:none;pointer-events:none;z-index:1000;" +
      `width:min(390px,calc(100vw - 28px));max-height:60vh;overflow-y:auto;font-family:${FONT_BODY};` +
      `font-size:13px;color:${COLORS.text};padding:12px 14px;user-select:none;`;

    const title = document.createElement("div");
    title.textContent = "⚔ Inventario y Equipo";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${COLORS.goldBright};margin-bottom:8px;letter-spacing:0.5px;`;
    this.root.appendChild(title);

    this.body = document.createElement("div");
    this.body.style.cssText = "display:flex;flex-direction:column;gap:3px;";
    this.root.appendChild(this.body);

    parent.appendChild(this.root);
  }

  /** Alterna la visibilidad del panel. */
  toggle() {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? "" : "none";
    if (this.visible) this.lastSig = ""; // forzar redibujo al abrir
  }

  private sig(view: InventoryView): string {
    return JSON.stringify(view);
  }

  private makeBtn(label: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText =
      `padding:3px 9px;background:linear-gradient(180deg,${color},${color}bb);color:#0d0a05;` +
      "border:1px solid rgba(0,0,0,0.5);border-radius:4px;font-weight:700;font-size:11px;" +
      "cursor:pointer;pointer-events:auto;box-shadow:0 2px 5px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.35);" +
      "transition:filter 0.12s;";
    btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.12)"; });
    btn.addEventListener("mouseleave", () => { btn.style.filter = "none"; });
    btn.addEventListener("click", onClick);
    return btn;
  }

  private row(): HTMLDivElement {
    const r = document.createElement("div");
    r.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:6px;";
    return r;
  }

  private equipmentTargets(view: InventoryView): { id: string; name: string }[] {
    const ids = [
      ...view.entries.map((entry) => entry.itemTemplateId),
      ...EQUIP_SLOTS.map((slot) => view.equipment[slot]).filter(Boolean),
    ];
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      try {
        const item = getItem(id);
        if (item.type !== "equipment") continue;
        seen.add(id);
        out.push({ id, name: item.name });
      } catch { /* invalid synchronized entry */ }
    }
    return out;
  }

  private equipReason(itemId: string, view: InventoryView): string {
    const className = view.className;
    const level = view.level;
    if (!className || level === undefined || canEquipItem(itemId, className, level, view.equipment)) return "";
    const item = getItem(itemId);
    const classLabel = CLASSES[className]?.name ?? className;
    if (item.classes && !item.classes.includes(className)) return `No apto para ${classLabel}`;
    if (level < (item.requiredLevel ?? 1)) return `Requiere nivel ${item.requiredLevel ?? 1}`;
    if (item.hands === "2H" && view.equipment.shield) return "Quitá el escudo";
    if (item.slot === "shield" && view.equipment.weapon && getItem(view.equipment.weapon).hands === "2H") return "Quitá el arma a dos manos";
    return "No se puede equipar";
  }

  private details(itemId: string, setCounts: Map<string, number>): HTMLDivElement {
    const item = getItem(itemId);
    const details = document.createElement("div");
    details.style.cssText = `font-size:11px;line-height:1.3;color:${COLORS.textDim};margin-top:2px;max-width:230px;`;
    const facts: string[] = [];
    if (item.type === "equipment") {
      const quality = item.options?.quality ?? "normal";
      facts.push(`Calidad: ${item.allowedQualities ? QUALITY_LABELS[quality] : RARITY_LABELS[item.rarity??'common']}`);
      const bonuses=item.bonuses;
      if(bonuses?.pAtk)facts.push(`Ataque +${bonuses.pAtk}`);
      if(bonuses?.pDef)facts.push(`Defensa +${bonuses.pDef}`);
      if(bonuses?.maxHp)facts.push(`Vida +${bonuses.maxHp}`);
      if(bonuses?.maxMp)facts.push(`Maná +${bonuses.maxMp}`);
      if (item.requiredLevel !== undefined) facts.push(`Nivel ${item.requiredLevel}`);
      if (item.hands) facts.push(item.hands === "1H" ? "1 mano" : "2 manos");
      if (item.classes?.length) facts.push(item.classes.map((id) => CLASSES[id]?.name ?? id).join(", "));
      if (item.options?.luck) facts.push("Suerte");
      if (item.options?.skill) facts.push("Habilidad");
      if (item.options?.additional) facts.push(`Adicional +${item.options.additional}`);
      const labels = EXCELLENT_LABELS[offensiveOptions(item) ? "offensive" : "defensive"];
      for (const option of item.options?.excellent ?? []) if (labels[option]) facts.push(labels[option]);
      if (item.setId) facts.push(`Conjunto ${item.setId.replaceAll("_", " ")}: ${setCounts.get(item.setId) ?? 0} piezas`);
    }
    const meta = document.createElement("div");
    meta.textContent = facts.join(" · ");
    details.appendChild(meta);
    if (item.description) {
      const description = document.createElement("div");
      description.textContent = item.description;
      description.style.marginTop = "2px";
      details.appendChild(description);
    }
    return details;
  }

  update(view: InventoryView) {
    if (!this.visible) return;
    const sig = this.sig(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.body.innerHTML = "";
    const setCounts = new Map<string, number>();
    for (const id of Object.values(view.equipment)) {
      if (!id) continue;
      try {
        const setId = getItem(id).setId;
        if (setId) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
      } catch { /* invalid synchronized entry */ }
    }

    // ── Stats efectivos ────────────────────────────────────────────────
    const stat = document.createElement("div");
    stat.textContent = `⚔ Ataque ${view.stats.pAtk}   🛡 Defensa ${view.stats.pDef}`;
    stat.style.cssText = "opacity:0.95;margin-bottom:2px;";
    this.body.appendChild(stat);

    // ── Paperdoll: 3 slots de equipo ───────────────────────────────────
    const equipHeader = document.createElement("div");
    equipHeader.textContent = "Equipo";
    equipHeader.style.cssText = `font-family:${FONT_DISPLAY};font-weight:600;color:${COLORS.gold};margin-top:4px;letter-spacing:1px;font-size:12px;`;
    this.body.appendChild(equipHeader);

    for (const slot of EQUIP_SLOTS) {
      const r = this.row();
      const equippedId = view.equipment[slot];
      const info = document.createElement("div");
      info.style.cssText = "min-width:0;flex:1;";
      const label = document.createElement("div");
      if (equippedId) {
        try {
          const item = getItem(equippedId);
          label.textContent = `${SLOT_LABELS[slot]}: ${item.name}`;
          label.style.color = RARITY_COLORS[item.rarity ?? "common"];
        } catch {
          label.textContent = `${SLOT_LABELS[slot]}: —`;
        }
      } else {
        label.textContent = `${SLOT_LABELS[slot]}: —`;
        label.style.opacity = "0.5";
      }
      info.appendChild(label);
      if (equippedId) info.appendChild(this.details(equippedId, setCounts));
      r.appendChild(info);
      if (equippedId) {
        r.appendChild(this.makeBtn("Quitar", "#d9a441", () => this.cb.onUnequip?.(slot)));
      }
      this.body.appendChild(r);
    }
    for (const [setId, count] of setCounts) {
      const setLine = document.createElement("div");
      setLine.textContent = `Conjunto ${setId.replaceAll("_", " ")}: ${count} piezas`;
      setLine.style.cssText = `font-size:11px;color:${COLORS.gold};margin-top:2px;`;
      this.body.appendChild(setLine);
    }

    // ── Divisor ────────────────────────────────────────────────────────
    const hr = document.createElement("div");
    hr.style.cssText = `height:1px;background:linear-gradient(90deg,transparent,${COLORS.goldDeep},transparent);margin:6px 0;`;
    this.body.appendChild(hr);

    // ── Inventario ─────────────────────────────────────────────────────
    if (view.entries.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "(inventario vacío)";
      empty.style.cssText = "opacity:0.6;";
      this.body.appendChild(empty);
      return;
    }
    for (const e of view.entries) {
      try {
        const item = getItem(e.itemTemplateId);
        const r = this.row();
        r.style.alignItems = "flex-start";
        const info = document.createElement("div");
        info.style.cssText = "min-width:0;flex:1;";
        const label = document.createElement("div");
        label.textContent = `${e.name}${e.qty > 1 ? ` x${e.qty}` : ""}`;
        if (item.type === "equipment") label.style.color = RARITY_COLORS[item.rarity ?? "common"];
        info.append(label, this.details(e.itemTemplateId, setCounts));
        r.appendChild(info);

        if (item.type === "consumable" && item.category === "joya") {
          const targetWrap = document.createElement("div");
          targetWrap.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:stretch;max-width:126px;";
          const select = document.createElement("select");
          select.dataset.jewelTarget = "";
          select.title = "Objeto que recibirá la mejora";
          select.style.cssText = "max-width:126px;font-size:11px;background:#171009;color:#ddceb0;border:1px solid #4a380f;pointer-events:auto;";
          for (const target of this.equipmentTargets(view)) {
            const option = document.createElement("option");
            option.value = target.id;
            option.textContent = target.name;
            select.appendChild(option);
          }
          const use = this.makeBtn("Usar", "#2ecc40", () => this.cb.onUseItem?.(e.itemTemplateId, select.value));
          use.disabled = select.options.length === 0;
          if (use.disabled) { use.textContent = "Sin objetivo"; use.style.opacity = "0.5"; use.style.cursor = "not-allowed"; }
          targetWrap.append(select, use);
          r.appendChild(targetWrap);
        } else if (item.type === "consumable" && (item.heal || item.mana || item.useEffect || item.learnSkill)) {
          r.appendChild(this.makeBtn("Usar", "#2ecc40", () => this.cb.onUseItem?.(e.itemTemplateId)));
        } else if (item.type === "equipment") {
          const reason = this.equipReason(e.itemTemplateId, view);
          const button = this.makeBtn(reason ? `Equipar · ${reason}` : "Equipar", "#4da6ff", () => this.cb.onEquip?.(e.itemTemplateId));
          if (reason) { button.disabled = true; button.title = reason; button.style.opacity = "0.5"; button.style.cursor = "not-allowed"; }
          r.appendChild(button);
        }
        this.body.appendChild(r);
      } catch {
        // Ignorar ítems con id inválido
      }
    }
  }

  remove() {
    this.root.remove();
  }
}

/** Re-export para consumidores que sólo importan el tipo de slot desde acá. */
export type { EquipSlot };
