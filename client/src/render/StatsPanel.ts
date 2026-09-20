import { ATTRIBUTES, ATTRIBUTE_LABELS, ATTRIBUTE_EFFECTS, type Attribute } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

export interface StatsView {
  statPoints: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
  pAtk: number;
  pDef: number;
  maxHp: number;
  maxMp: number;
}

const ICON: Record<Attribute, string> = { str: "⚔", agi: "🛡", vit: "❤", ene: "✦" };

/**
 * Panel de atributos (Etapa 21, tecla C): muestra Fuerza/Agilidad/Vitalidad/Energía
 * con su valor y efecto, los puntos disponibles y un botón "+" por atributo para
 * gastarlos. También muestra los stats efectivos (ataque/defensa/vida/maná).
 * El server es autoritativo (valida los puntos); esto sólo manda AllocateStat.
 */
export class StatsPanel {
  private readonly root: HTMLDivElement;
  private readonly pointsLabel: HTMLSpanElement;
  private readonly rows = new Map<Attribute, { value: HTMLSpanElement; btn: HTMLButtonElement }>();
  private readonly derived: HTMLDivElement;
  private visible = false;
  private lastSig = "";

  constructor(private readonly onAllocate: (attr: Attribute) => void, parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-fadein";
    this.root.style.cssText =
      "position:fixed;left:50%;top:110px;transform:translateX(-50%);display:none;pointer-events:none;z-index:1000;" +
      `min-width:300px;font-family:${FONT_BODY};color:${COLORS.text};padding:16px 18px;user-select:none;`;

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;";
    const title = document.createElement("div");
    title.textContent = "✦ Atributos";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:18px;color:${COLORS.goldBright};letter-spacing:0.5px;`;
    const close = document.createElement("div");
    close.textContent = "✕";
    close.style.cssText = `cursor:pointer;color:${COLORS.gold};font-weight:bold;font-size:16px;padding:0 4px;pointer-events:auto;`;
    close.addEventListener("click", () => this.close());
    header.append(title, close);
    this.root.appendChild(header);

    const pts = document.createElement("div");
    pts.style.cssText = `margin-bottom:12px;color:${COLORS.parchment};font-weight:600;`;
    pts.innerHTML = `Puntos para repartir: <span data-pts style="color:${COLORS.goldBright};font-weight:700;">0</span>`;
    this.pointsLabel = pts.querySelector("[data-pts]")!;
    this.root.appendChild(pts);

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px;";
    for (const attr of ATTRIBUTES) {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 10px;" +
        "background:linear-gradient(180deg,rgba(201,162,75,0.10),rgba(0,0,0,0.15));" +
        "border:1px solid rgba(201,162,75,0.2);border-radius:6px;";
      const info = document.createElement("div");
      info.style.cssText = "flex:1;";
      info.innerHTML =
        `<div style="font-weight:600;color:${COLORS.parchment};">${ICON[attr]} ${ATTRIBUTE_LABELS[attr]} ` +
        `<span data-val style="color:${COLORS.goldBright};font-weight:700;">0</span></div>` +
        `<div style="font-size:12px;color:${COLORS.textDim};margin-top:1px;">${ATTRIBUTE_EFFECTS[attr]} por punto</div>`;
      row.appendChild(info);
      const btn = document.createElement("button");
      btn.textContent = "+";
      applyButton(btn);
      btn.style.cssText += "padding:4px 14px;font-size:18px;font-weight:700;line-height:1;pointer-events:auto;";
      btn.addEventListener("click", () => this.onAllocate(attr));
      row.appendChild(btn);
      list.appendChild(row);
      this.rows.set(attr, { value: info.querySelector("[data-val]")!, btn });
    }
    this.root.appendChild(list);

    this.derived = document.createElement("div");
    this.derived.style.cssText = `margin-top:12px;padding-top:10px;border-top:1px solid rgba(201,162,75,0.2);font-size:13px;color:${COLORS.textDim};display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;`;
    this.root.appendChild(this.derived);

    parent.appendChild(this.root);
  }

  update(v: StatsView): void {
    const sig = `${v.statPoints}|${v.str},${v.agi},${v.vit},${v.ene}|${v.pAtk},${v.pDef},${v.maxHp},${v.maxMp}`;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.pointsLabel.textContent = String(v.statPoints);
    const vals: Record<Attribute, number> = { str: v.str, agi: v.agi, vit: v.vit, ene: v.ene };
    for (const attr of ATTRIBUTES) {
      const row = this.rows.get(attr)!;
      row.value.textContent = String(vals[attr]);
      const usable = v.statPoints > 0;
      row.btn.disabled = !usable;
      row.btn.style.opacity = usable ? "1" : "0.4";
      row.btn.style.cursor = usable ? "pointer" : "not-allowed";
    }
    this.derived.innerHTML =
      `<div>⚔ Ataque: <b style="color:${COLORS.parchment}">${v.pAtk}</b></div>` +
      `<div>🛡 Defensa: <b style="color:${COLORS.parchment}">${v.pDef}</b></div>` +
      `<div>❤ Vida máx: <b style="color:${COLORS.parchment}">${v.maxHp}</b></div>` +
      `<div>✦ Maná máx: <b style="color:${COLORS.parchment}">${v.maxMp}</b></div>`;
  }

  open(): void { this.visible = true; this.root.style.display = ""; this.root.style.pointerEvents = "auto"; }
  close(): void { this.visible = false; this.root.style.display = "none"; this.root.style.pointerEvents = "none"; }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
}
