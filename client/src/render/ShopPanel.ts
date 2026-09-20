import { CLASSES, getItem, getShopPrice, SHOP_STOCK, isEquipment, getRarity, RARITY_COLORS } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";
import {itemIcon} from './ItemModels.js';

export interface ShopPanelOpts {
  /** Ítems a la venta (default: stock del Mercader). */
  stock?: string[];
  /** Título del panel. */
  title?: string;
  parent?: HTMLElement;
}

/**
 * Panel HTML de tienda (fijo, oculto por defecto) que lista los ítems a la venta:
 * nombre + precio + botón "Comprar". Muestra el oro actual del jugador. Reutilizable
 * para el Mercader (consumibles) y el Herrero (equipo) vía `stock`/`title`.
 * Callback `onBuy(itemTemplateId)` se dispara al hacer clic en "Comprar".
 */
export class ShopPanel {
  private readonly root: HTMLDivElement;
  private readonly itemsList: HTMLDivElement;
  private readonly goldLabel: HTMLDivElement;
  private readonly searchInput: HTMLInputElement;
  private visible = false;
  private onBuy: (itemTemplateId: string) => void;
  private readonly stock: string[];

  constructor(
    onBuy: (itemTemplateId: string) => void,
    opts: ShopPanelOpts = {},
  ) {
    this.onBuy = onBuy;
    this.stock = opts.stock ?? SHOP_STOCK;
    const parent = opts.parent ?? document.body;
    const titleText = opts.title ?? "⚒ Mercado de Aden";

    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-fadein";
    this.root.style.cssText =
      "position:fixed;left:14px;top:14px;display:none;pointer-events:none;z-index:1000;" +
      `width:min(440px,calc(100vw - 28px));max-height:calc(100vh - 28px);font-family:${FONT_BODY};` +
      `color:${COLORS.text};padding:14px 16px;user-select:none;box-sizing:border-box;`;

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;";

    const title = document.createElement("div");
    title.textContent = titleText;
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:17px;color:${COLORS.goldBright};letter-spacing:0.5px;`;
    header.appendChild(title);

    const closeBtn = document.createElement("div");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText =
      `cursor:pointer;color:${COLORS.gold};font-weight:bold;font-size:16px;` +
      "padding:0 4px;pointer-events:auto;transition:color 0.15s;";
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = COLORS.goldBright; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = COLORS.gold; });
    closeBtn.addEventListener("click", () => this.close());
    header.appendChild(closeBtn);
    this.root.appendChild(header);

    this.goldLabel = document.createElement("div");
    this.goldLabel.style.cssText =
      `margin-bottom:12px;color:${COLORS.parchment};font-weight:600;display:flex;align-items:center;gap:6px;`;
    this.goldLabel.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe9a6,#c9a24b 60%,#7a5c22);"></span>Oro: <span data-gold>0</span>`;
    this.root.appendChild(this.goldLabel);

    this.searchInput = document.createElement("input");
    this.searchInput.type = "search";
    this.searchInput.placeholder = "Buscar por nombre, clase o descripción";
    this.searchInput.setAttribute("aria-label", "Buscar objetos");
    this.searchInput.style.cssText =
      `width:100%;box-sizing:border-box;margin-bottom:10px;padding:7px 9px;background:#120c07;color:${COLORS.text};` +
      "border:1px solid #4a380f;border-radius:5px;outline:none;pointer-events:auto;";
    this.searchInput.addEventListener("input", () => this.renderItems());
    this.root.appendChild(this.searchInput);

    this.itemsList = document.createElement("div");
    this.itemsList.dataset.shopList = "";
    this.itemsList.style.cssText = "display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 175px);overflow-y:auto;padding-right:4px;";
    this.root.appendChild(this.itemsList);

    parent.appendChild(this.root);

    // Renderizar el stock
    this.renderItems();
  }

  /** Renderiza cada ítem del stock con nombre, precio y botón Comprar. */
  private renderItems(): void {
    this.itemsList.innerHTML = "";
    const query = this.searchInput?.value.trim().toLocaleLowerCase("es") ?? "";
    for (const itemId of this.stock) {
      try {
        const item = getItem(itemId);
        const price = getShopPrice(itemId);
        const classNames = item.classes?.map((id) => CLASSES[id]?.name ?? id) ?? [];
        const searchable = [item.name, item.description, item.category, ...classNames].filter(Boolean).join(" ").toLocaleLowerCase("es");
        if (query && !searchable.includes(query)) continue;

        const nameColor = isEquipment(itemId) ? RARITY_COLORS[getRarity(itemId)] : COLORS.parchment;

        const row = document.createElement("div");
        row.dataset.shopItem = itemId;
        row.appendChild(itemIcon(itemId));
        row.title = item.description ?? item.name;
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;gap:10px;" +
          "padding:8px 9px;background:linear-gradient(180deg,rgba(201,162,75,0.10),rgba(0,0,0,0.15));" +
          "border:1px solid rgba(201,162,75,0.2);border-radius:6px;";

        const info = document.createElement("div");
        info.style.cssText = "flex:1;";
        const name = document.createElement("div");
        name.textContent = item.name;
        name.style.cssText = `font-weight:600;color:${nameColor};`;
        const priceLine = document.createElement("div");
        priceLine.textContent = `✦ ${price} oro`;
        priceLine.style.cssText = `font-size:12px;color:${COLORS.textDim};margin-top:1px;`;
        const requirements = document.createElement("div");
        const requirementParts = [
          item.requiredLevel !== undefined ? `Nivel ${item.requiredLevel}` : "",
          classNames.length ? classNames.join(", ") : "",
        ].filter(Boolean);
        requirements.textContent = requirementParts.join(" · ");
        requirements.style.cssText = `font-size:11px;color:${COLORS.textDim};margin-top:2px;line-height:1.25;`;
        info.append(name, priceLine);
        if (requirementParts.length) info.appendChild(requirements);
        row.appendChild(info);

        const buyBtn = document.createElement("button");
        buyBtn.textContent = "Comprar";
        applyButton(buyBtn);
        buyBtn.style.cssText += "padding:5px 12px;font-size:12px;";
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
    const span = this.goldLabel.querySelector("[data-gold]");
    if (span) span.textContent = String(Math.round(gold));
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
