import { CASTLE_BRACKETS, type CastleView } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Cartel del Castillo del Caos: inscripción para todos; la partida sólo para quien está adentro. */
export class CastleBanner {
  private readonly root = document.createElement("div");
  private readonly title = document.createElement("div");
  private readonly detail = document.createElement("div");

  constructor(parent: HTMLElement) {
    this.root.style.cssText =
      "position:fixed;top:118px;left:50%;transform:translateX(-50%);z-index:1100;pointer-events:none;" +
      "padding:7px 16px;border-radius:6px;text-align:center;color:#f0dcc8;text-shadow:0 1px 3px #000;" +
      "background:linear-gradient(180deg,rgba(40,14,40,0.92),rgba(18,8,20,0.9));border:1px solid rgba(200,90,200,0.5);" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.55);display:none;";
    this.title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:14px;letter-spacing:.5px;`;
    this.detail.style.cssText = "font-size:12px;margin-top:3px;color:#e8c8f0;";
    this.root.append(this.title, this.detail);
    parent.appendChild(this.root);
  }

  update(view: CastleView | null, insideCastle: boolean, now: number): void {
    if (!view || (view.phase === "active" && !insideCastle)) { this.root.style.display = "none"; return; }
    const b = CASTLE_BRACKETS[view.bracket];
    this.root.style.display = "";
    if (view.phase === "registration") {
      this.title.textContent = `⚔ ${b.name} · la inscripción cierra en ${clock(view.startsAt - now)}`;
      this.detail.textContent = `Entregá un Sello del Caos al Custodio en el pueblo (nivel ${b.minLevel}–${b.maxLevel}).`;
      return;
    }
    this.title.textContent = `⚔ ${b.name} · Quedan ${view.alive} · Tus puntos: ${view.myPoints ?? 0} · ${clock(view.endsAt - now)}`;
    this.detail.textContent = view.collapseAt > now
      ? (view.ring === 0 ? "¡El borde se derrumba!" : "¡El anillo medio se derrumba!")
      : `Guardias en pie: ${view.monsters}`;
  }

  remove(): void { this.root.remove(); }
}
