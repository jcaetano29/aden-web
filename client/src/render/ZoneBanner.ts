import { getZone } from "@aden/shared";

/**
 * Cartel cinemático de zona (Etapa 11). Cuando el jugador cruza a una zona nueva,
 * muestra centrado el nombre del área, su nivel recomendado y una línea de flavor,
 * y se desvanece. Es el "descubriste una zona" — refuerza el viaje y señaliza el
 * peligro (nivel recomendado). Sólo presentación; no bloquea clicks.
 */
export class ZoneBanner {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private readonly subEl: HTMLDivElement;
  private readonly levelEl: HTMLDivElement;
  private currentZoneId: string | null = null;
  private hideTimer: number | null = null;

  constructor() {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;top:16%;left:50%;transform:translateX(-50%);z-index:1400;" +
      "pointer-events:none;text-align:center;opacity:0;transition:opacity 0.6s ease;" +
      "text-shadow:0 2px 12px rgba(0,0,0,0.9);";

    this.levelEl = document.createElement("div");
    this.levelEl.style.cssText =
      "font:bold 12px sans-serif;letter-spacing:2px;color:#ffd54f;margin-bottom:6px;text-transform:uppercase;";

    this.titleEl = document.createElement("div");
    this.titleEl.style.cssText =
      "font:bold 40px 'Georgia',serif;color:#fff;letter-spacing:1px;line-height:1.1;";

    this.subEl = document.createElement("div");
    this.subEl.style.cssText =
      "font:italic 16px 'Georgia',serif;color:#d8d2c4;margin-top:8px;";

    this.root.append(this.levelEl, this.titleEl, this.subEl);
  }

  mount(parent: HTMLElement = document.body): void {
    parent.appendChild(this.root);
  }

  /**
   * Notifica la zona actual del jugador. Si cambió respecto a la anterior, dispara
   * el cartel. La primera zona (spawn en el pueblo) NO dispara cartel: sólo se
   * anuncian los descubrimientos al viajar.
   */
  setZone(zoneId: string): void {
    if (zoneId === this.currentZoneId) return;
    const first = this.currentZoneId === null;
    this.currentZoneId = zoneId;
    if (first) return; // no anunciar la zona de spawn

    const z = getZone(zoneId);
    this.levelEl.textContent = z.safe ? "Zona segura" : `Nivel recomendado ${z.levelMin}–${z.levelMax}`;
    this.titleEl.textContent = z.name;
    this.subEl.textContent = z.subtitle;
    // Acento del bioma en el borde inferior del título.
    this.titleEl.style.color = "#fff";

    this.root.style.opacity = "1";
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.root.style.opacity = "0";
    }, 3200);
  }
}
