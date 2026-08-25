import { ZONES, canEnterZone, type Zone } from "@aden/shared";

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
    this.root.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;z-index:1300;" +
      "min-width:340px;pointer-events:auto;font:13px sans-serif;color:#fff;" +
      "background:rgba(12,14,20,0.95);border:1px solid #3a3f52;border-radius:10px;" +
      "padding:18px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.6);";

    const title = document.createElement("div");
    title.textContent = "🗺 Viajar a un mapa";
    title.style.cssText = "font:bold 18px 'Georgia',serif;color:#ffd54f;margin-bottom:12px;";
    this.root.appendChild(title);

    this.list = document.createElement("div");
    this.list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    this.root.appendChild(this.list);

    const hint = document.createElement("div");
    hint.textContent = "Tecla M para cerrar";
    hint.style.cssText = "margin-top:12px;opacity:0.5;font-size:11px;text-align:center;";
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
      "padding:8px 10px;border-radius:6px;border:1px solid #2a2f3e;" +
      `background:${isCurrent ? "rgba(255,213,79,0.12)" : "rgba(255,255,255,0.03)"};` +
      (unlocked ? "" : "opacity:0.5;");

    const info = document.createElement("div");
    const reqTxt = z.levelMin === 0 ? "seguro" : `Nivel ${z.levelMin}-${z.levelMax}`;
    info.innerHTML =
      `<div style="font-weight:bold;color:${hex(z.biome.accent)}">${z.name}</div>` +
      `<div style="opacity:0.75;font-size:11px">${z.subtitle} · ${reqTxt}</div>`;
    row.appendChild(info);

    const btn = document.createElement("button");
    if (isCurrent) {
      btn.textContent = "Aquí";
      btn.disabled = true;
      btn.style.cssText = "padding:5px 12px;background:#555;color:#ccc;border:none;border-radius:5px;font:11px bold sans-serif;";
    } else if (unlocked) {
      btn.textContent = "Viajar";
      btn.style.cssText = "padding:5px 12px;background:#4da6ff;color:#000;border:none;border-radius:5px;font:11px bold sans-serif;cursor:pointer;";
      btn.addEventListener("click", () => { this.onWarp(z.id); this.hide(); });
    } else {
      btn.textContent = `🔒 Nv ${z.levelReq}`;
      btn.disabled = true;
      btn.style.cssText = "padding:5px 12px;background:#3a2a2a;color:#c99;border:none;border-radius:5px;font:11px bold sans-serif;";
    }
    row.appendChild(btn);
    return row;
  }
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}
