import { getItem } from "@aden/shared";

/**
 * Panel HTML de inventario (tecla "i"): overlay fijo, oculto por defecto, que
 * lista los ítems del jugador local con nombre y cantidad. Sólo refleja el
 * inventario sincronizado por el server (`update(...)`) — nunca lo muta
 * (cliente no-autoritativo). Los ítems consumibles tienen un botón "Usar" que
 * dispara el callback `onUseItem`.
 */
export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private visible = false;
  private onUseItem?: (itemTemplateId: string) => void;

  constructor(
    parent: HTMLElement = document.body,
    onUseItem?: (itemTemplateId: string) => void,
  ) {
    this.onUseItem = onUseItem;
    this.root = document.createElement("div");
    this.root.style.cssText =
      // top:192 → debajo del minimapa (168px + margen) para no superponerse.
      "position:fixed;right:12px;top:192px;display:none;pointer-events:none;z-index:1000;" +
      "min-width:160px;font:12px sans-serif;text-shadow:0 0 3px #000;color:#fff;" +
      "background:rgba(0,0,0,0.5);border-radius:6px;padding:8px 10px;user-select:none;";

    const title = document.createElement("div");
    title.textContent = "Inventario";
    title.style.cssText = "font-weight:bold;margin-bottom:6px;";
    this.root.appendChild(title);

    this.list = document.createElement("div");
    this.list.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    this.root.appendChild(this.list);

    parent.appendChild(this.root);
  }

  /** Alterna la visibilidad del panel. */
  toggle() {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? "" : "none";
  }

  /** Re-renderiza la lista de ítems ("{name} x{qty}"); "(vacío)" si no hay ninguno.
   *  Para ítems consumibles, agrega un botón "Usar". */
  update(entries: { itemTemplateId: string; qty: number; name: string }[]) {
    this.list.innerHTML = "";
    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "(vacío)";
      empty.style.cssText = "opacity:0.7;";
      this.list.appendChild(empty);
      return;
    }
    for (const e of entries) {
      try {
        const item = getItem(e.itemTemplateId);
        const row = document.createElement("div");
        row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:6px;";

        const label = document.createElement("div");
        label.textContent = `${e.name} x${e.qty}`;
        row.appendChild(label);

        if (item.type === "consumable") {
          const useBtn = document.createElement("button");
          useBtn.textContent = "Usar";
          useBtn.style.cssText =
            "padding:2px 6px;background:#2ecc40;color:#000;border:none;border-radius:3px;" +
            "font:10px bold sans-serif;cursor:pointer;pointer-events:auto;";
          useBtn.addEventListener("click", () => {
            if (this.onUseItem) this.onUseItem(e.itemTemplateId);
          });
          row.appendChild(useBtn);
        }

        this.list.appendChild(row);
      } catch {
        // Ignorar ítems con id inválido
      }
    }
  }

  remove() {
    this.root.remove();
  }
}
