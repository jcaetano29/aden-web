import { getInvader, getTemplate, getZone, type WorldEventView } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Cartel de evento de mundo: cuenta regresiva antes de la invasión y contribución de grupos durante. */
export class EventBanner {
  private readonly root = document.createElement("div");
  private readonly title = document.createElement("div");
  private readonly ranking = document.createElement("div");

  constructor(parent: HTMLElement) {
    this.root.style.cssText =
      "position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:1100;pointer-events:none;" +
      "padding:8px 18px;border-radius:6px;text-align:center;color:#f3e2c0;text-shadow:0 1px 3px #000;" +
      "background:linear-gradient(180deg,rgba(90,20,16,0.92),rgba(40,10,8,0.9));border:1px solid rgba(255,140,90,0.55);" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.55);display:none;";
    this.title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:14px;letter-spacing:.5px;`;
    this.ranking.style.cssText = "font-size:12px;margin-top:3px;color:#ffd9a8;";
    this.root.append(this.title, this.ranking);
    parent.appendChild(this.root);
  }

  update(ev: WorldEventView | null, now: number): void {
    if (!ev) { this.root.style.display = "none"; return; }
    const name = getTemplate(getInvader(ev.invaderId).templateId).name, map = getZone(ev.mapId).name;
    this.root.style.display = "";
    if (ev.phase === "announced") {
      this.title.textContent = `⚔ Invasión: ${name} en ${map} · empieza en ${clock(ev.startsAt - now)}`;
      this.ranking.textContent = "Reuní a tu party o gremio y explorá el mapa: la ubicación es desconocida.";
    } else {
      this.title.textContent = `⚔ ${name} · ${map} · quedan ${clock(ev.endsAt - now)}`;
      this.ranking.textContent = ev.ranking.length ? `Contribución (daño y apoyo): ${ev.ranking.join("   ·   ")}` : "Buscá al invasor explorando el mapa.";
    }
  }

  remove(): void { this.root.remove(); }
}
