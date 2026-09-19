import { FONT_DISPLAY } from "./theme.js";

export class ZoneIndicator {
  readonly el: HTMLDivElement;
  constructor() {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:absolute;bottom:14px;left:50%;transform:translateX(-50%);" +
      `padding:5px 14px;border-radius:20px;font-family:${FONT_DISPLAY};font-weight:600;font-size:12px;` +
      "letter-spacing:1px;color:#fff;pointer-events:none;user-select:none;text-shadow:0 1px 3px #000;" +
      "box-shadow:0 3px 12px rgba(0,0,0,0.5);";
    this.update(false);
  }
  mount(parent: HTMLElement) { parent.appendChild(this.el); }
  update(inPvp: boolean) {
    this.el.textContent = inPvp ? "⚔ Zona PvP" : "🛡 Zona segura";
    this.el.style.background = inPvp
      ? "linear-gradient(180deg,rgba(180,40,32,0.85),rgba(110,18,14,0.85))"
      : "linear-gradient(180deg,rgba(48,110,66,0.8),rgba(24,64,38,0.8))";
    this.el.style.border = inPvp ? "1px solid rgba(255,120,100,0.5)" : "1px solid rgba(201,162,75,0.35)";
  }
}
