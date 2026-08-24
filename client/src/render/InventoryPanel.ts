import {
  getItem,
  EQUIP_SLOTS,
  SLOT_LABELS,
  RARITY_COLORS,
  type EquipSlot,
} from "@aden/shared";

export interface InventoryPanelCallbacks {
  onUseItem?: (itemTemplateId: string) => void;
  onEquip?: (itemTemplateId: string) => void;
  onUnequip?: (slot: string) => void;
}

export interface InventoryView {
  entries: { itemTemplateId: string; qty: number; name: string }[];
  /** slot → itemTemplateId equipado. */
  equipment: Record<string, string>;
  /** Stats de combate efectivos (base + equipo) para el encabezado. */
  stats: { pAtk: number; pDef: number };
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
    this.root.style.cssText =
      // top:192 → debajo del minimapa (168px + margen) para no superponerse.
      "position:fixed;right:12px;top:192px;display:none;pointer-events:none;z-index:1000;" +
      "min-width:210px;max-width:240px;font:12px sans-serif;text-shadow:0 0 3px #000;color:#fff;" +
      "background:rgba(0,0,0,0.6);border-radius:6px;padding:8px 10px;user-select:none;";

    const title = document.createElement("div");
    title.textContent = "Inventario y Equipo";
    title.style.cssText = "font-weight:bold;margin-bottom:6px;";
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
      `padding:2px 7px;background:${color};color:#000;border:none;border-radius:3px;` +
      "font:10px bold sans-serif;cursor:pointer;pointer-events:auto;";
    btn.addEventListener("click", onClick);
    return btn;
  }

  private row(): HTMLDivElement {
    const r = document.createElement("div");
    r.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:6px;";
    return r;
  }

  update(view: InventoryView) {
    if (!this.visible) return;
    const sig = this.sig(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.body.innerHTML = "";

    // ── Stats efectivos ────────────────────────────────────────────────
    const stat = document.createElement("div");
    stat.textContent = `⚔ Ataque ${view.stats.pAtk}   🛡 Defensa ${view.stats.pDef}`;
    stat.style.cssText = "opacity:0.95;margin-bottom:2px;";
    this.body.appendChild(stat);

    // ── Paperdoll: 3 slots de equipo ───────────────────────────────────
    const equipHeader = document.createElement("div");
    equipHeader.textContent = "Equipo";
    equipHeader.style.cssText = "font-weight:bold;opacity:0.8;margin-top:2px;";
    this.body.appendChild(equipHeader);

    for (const slot of EQUIP_SLOTS) {
      const r = this.row();
      const equippedId = view.equipment[slot];
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
      r.appendChild(label);
      if (equippedId) {
        r.appendChild(this.makeBtn("Quitar", "#d9a441", () => this.cb.onUnequip?.(slot)));
      }
      this.body.appendChild(r);
    }

    // ── Divisor ────────────────────────────────────────────────────────
    const hr = document.createElement("div");
    hr.style.cssText = "height:1px;background:rgba(255,255,255,0.15);margin:4px 0;";
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
        const label = document.createElement("div");
        label.textContent = `${e.name}${e.qty > 1 ? ` x${e.qty}` : ""}`;
        if (item.type === "equipment") label.style.color = RARITY_COLORS[item.rarity ?? "common"];
        r.appendChild(label);

        if (item.type === "consumable") {
          r.appendChild(this.makeBtn("Usar", "#2ecc40", () => this.cb.onUseItem?.(e.itemTemplateId)));
        } else if (item.type === "equipment") {
          r.appendChild(this.makeBtn("Equipar", "#4da6ff", () => this.cb.onEquip?.(e.itemTemplateId)));
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
