import { ZONES, canEnterZone, type Zone } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

/**
 * Menú de mapas (tecla M, Etapa 15, estilo Mu): lista los mapas del mundo con su
 * nivel requerido y estado (actual / disponible / bloqueado por nivel). Al elegir un
 * mapa disponible, dispara el viaje (warp). Sólo presentación; el server valida el gate.
 */
export class MapPanel {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private visible = false;
  private readonly onWarp: (mapId: string) => void;

  constructor(onWarp: (mapId: string) => void) {
    this.onWarp = onWarp;
    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-scroll";
    this.root.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;z-index:1300;" +
      `min-width:380px;max-height:78vh;overflow-y:auto;pointer-events:auto;font-family:${FONT_BODY};font-size:13px;color:${COLORS.text};` +
      "padding:20px 22px;";

    const title = document.createElement("div");
    title.textContent = "🗺 Viajar a un mapa";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;color:${COLORS.goldBright};margin-bottom:14px;letter-spacing:0.5px;`;
    this.root.appendChild(title);

    this.list = document.createElement("div");
    this.list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    this.root.appendChild(this.list);

    const hint = document.createElement("div");
    hint.textContent = "Tecla M para cerrar";
    hint.style.cssText = `margin-top:14px;opacity:0.5;font-size:11px;text-align:center;letter-spacing:1px;color:${COLORS.textDim};`;
    this.root.appendChild(hint);
  }

  mount(parent: HTMLElement = document.body): void {
    parent.appendChild(this.root);
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Alterna la visibilidad; al abrir, redibuja con el nivel/mapa actuales. */
  toggle(level: number, currentMapId: string): void {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? "" : "none";
    if (this.visible) this.render(level, currentMapId);
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = "none";
  }

  private render(level: number, currentMapId: string): void {
    this.list.innerHTML = "";
    for (const z of ZONES) {
      this.list.appendChild(this.row(z, level, currentMapId));
    }
  }

  private row(z: Zone, level: number, currentMapId: string): HTMLDivElement {
    const isCurrent = z.id === currentMapId;
    const unlocked = canEnterZone(z, level);
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;gap:10px;" +
      "padding:9px 11px;border-radius:7px;margin-bottom:6px;" +
      `border:1px solid ${isCurrent ? "rgba(201,162,75,0.55)" : "rgba(201,162,75,0.18)"};` +
      `background:${isCurrent ? "rgba(201,162,75,0.14)" : "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.15))"};` +
      (unlocked ? "" : "opacity:0.5;");

    const info = document.createElement("div");
    const reqTxt = z.levelMin === 0 ? "seguro" : `Nivel ${z.levelMin}-${z.levelMax}`;
    info.innerHTML =
      `<div style="font-family:${FONT_DISPLAY};font-weight:700;font-size:15px;color:${hex(z.biome.accent)}">${z.name}</div>` +
      `<div style="opacity:0.8;font-size:12px;margin-top:1px;color:${COLORS.textDim}">${z.subtitle} · ${reqTxt}</div>`;
    row.appendChild(info);

    const btn = document.createElement("button");
    if (isCurrent) {
      btn.textContent = "Aquí";
      btn.disabled = true;
      btn.style.cssText = "padding:6px 14px;background:#2a2118;color:#8a7a58;border:1px solid #3a2c1c;border-radius:5px;font-family:" + FONT_DISPLAY + ";font-weight:600;font-size:12px;";
    } else if (unlocked) {
      btn.textContent = "Viajar";
      applyButton(btn);
      btn.style.cssText += "padding:6px 16px;font-size:12px;";
      btn.addEventListener("click", () => { this.onWarp(z.id); this.hide(); });
    } else {
      btn.textContent = `🔒 Nv ${z.levelReq}`;
      btn.disabled = true;
      btn.style.cssText = "padding:6px 14px;background:#2a1616;color:#c99;border:1px solid #4a2020;border-radius:5px;font-family:" + FONT_DISPLAY + ";font-weight:600;font-size:12px;";
    }
    row.appendChild(btn);
    return row;
  }
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
