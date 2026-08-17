import { getItem, getShopPrice, SHOP_STOCK } from "@aden/shared";

/**
 * Panel HTML de tienda (fijo, oculto por defecto) que lista los ítems a la venta:
 * nombre + precio + botón "Comprar". Muestra el oro actual del jugador.
 * Callback `onBuy(itemTemplateId)` se dispara al hacer clic en "Comprar".
 */
export class ShopPanel {
  private readonly root: HTMLDivElement;
  private readonly itemsList: HTMLDivElement;
  private readonly goldLabel: HTMLDivElement;
  private visible = false;
  private onBuy: (itemTemplateId: string) => void;

  constructor(
    onBuy: (itemTemplateId: string) => void,
    parent: HTMLElement = document.body,
  ) {
    this.onBuy = onBuy;

    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;left:12px;top:12px;display:none;pointer-events:none;z-index:1000;" +
      "min-width:220px;font:12px sans-serif;text-shadow:0 0 3px #000;color:#fff;" +
      "background:rgba(0,0,0,0.7);border-radius:6px;padding:12px;user-select:none;" +
      "border:2px solid #ffd700;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;";

    const title = document.createElement("div");
    title.textContent = "Tienda";
    title.style.cssText = "font-weight:bold;color:#ffd700;";
    header.appendChild(title);

    const closeBtn = document.createElement("div");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText =
      "cursor:pointer;color:#ffd700;font-weight:bold;font-size:16px;" +
      "padding:0 4px;pointer-events:auto;";
    closeBtn.addEventListener("click", () => this.close());
    header.appendChild(closeBtn);
    this.root.appendChild(header);

    this.goldLabel = document.createElement("div");
    this.goldLabel.style.cssText = "margin-bottom:10px;color:#ffd700;font-weight:bold;";
    this.goldLabel.textContent = "Oro: 0";
    this.root.appendChild(this.goldLabel);

    this.itemsList = document.createElement("div");
    this.itemsList.style.cssText = "display:flex;flex-direction:column;gap:8px;";
    this.root.appendChild(this.itemsList);

    parent.appendChild(this.root);

    // Renderizar el stock
    this.renderItems();
  }

  /** Renderiza cada ítem del stock con nombre, precio y botón Comprar. */
  private renderItems(): void {
    this.itemsList.innerHTML = "";
    for (const itemId of SHOP_STOCK) {
      try {
        const item = getItem(itemId);
        const price = getShopPrice(itemId);

        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;gap:8px;" +
          "padding:6px;background:rgba(255,215,0,0.1);border-radius:4px;";

        const info = document.createElement("div");
        info.style.cssText = "flex:1;";
        info.innerHTML = `<div style="font-weight:bold;">${item.name}</div>` +
                         `<div style="font-size:11px;color:#aaa;">${price} oro</div>`;
        row.appendChild(info);

        const buyBtn = document.createElement("button");
        buyBtn.textContent = "Comprar";
        buyBtn.style.cssText =
          "padding:4px 10px;background:#ffd700;color:#000;border:none;border-radius:3px;" +
          "font:11px bold sans-serif;cursor:pointer;pointer-events:auto;";
        buyBtn.addEventListener("click", () => this.onBuy(itemId));
        row.appendChild(buyBtn);

        this.itemsList.appendChild(row);
      } catch {
        // Ignorar ítems inválidos
      }
    }
  }

  /** Actualiza el oro mostrado. */
  updateGold(gold: number): void {
    this.goldLabel.textContent = `Oro: ${Math.round(gold)}`;
  }

  /** Abre el panel. */
  open(): void {
    if (this.visible) return;
    this.visible = true;
    this.root.style.display = "";
    // Asegurar que el root tiene pointer-events cuando está abierto
    this.root.style.pointerEvents = "auto";
  }

  /** Cierra el panel. */
  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.root.style.display = "none";
    this.root.style.pointerEvents = "none";
  }

  /** Alterna la visibilidad del panel. */
  toggle(): void {
    if (this.visible) this.close();
    else this.open();
  }

  /** Devuelve si el panel está abierto. */
  isOpen(): boolean {
    return this.visible;
  }

  remove() {
    this.root.remove();
  }
}
