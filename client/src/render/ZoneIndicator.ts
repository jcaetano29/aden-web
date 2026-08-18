export class ZoneIndicator {
  readonly el: HTMLDivElement;
  constructor() {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:absolute;bottom:12px;left:50%;transform:translateX(-50%);" +
      "padding:4px 10px;border-radius:6px;font:600 12px/1.2 sans-serif;" +
      "color:#fff;pointer-events:none;user-select:none;";
    this.update(false);
  }
  mount(parent: HTMLElement) { parent.appendChild(this.el); }
  update(inPvp: boolean) {
    this.el.textContent = inPvp ? "⚔ Zona PvP" : "🛡 Zona segura";
    this.el.style.background = inPvp ? "rgba(200,40,40,0.75)" : "rgba(40,120,60,0.7)";
  }
}
