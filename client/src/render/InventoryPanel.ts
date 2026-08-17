/**
 * Panel HTML de inventario (tecla "i"): overlay fijo, oculto por defecto, que
 * lista los ítems del jugador local con nombre y cantidad. Sólo refleja el
 * inventario sincronizado por el server (`update(...)`) — nunca lo muta
 * (cliente no-autoritativo).
 */
export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private visible = false;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;right:12px;top:12px;display:none;pointer-events:none;z-index:1000;" +
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

  /** Re-renderiza la lista de ítems ("{name} x{qty}"); "(vacío)" si no hay ninguno. */
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
      const row = document.createElement("div");
      row.textContent = `${e.name} x${e.qty}`;
      this.list.appendChild(row);
    }
  }

  remove() {
    this.root.remove();
  }
}
