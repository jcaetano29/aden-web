/**
 * Sistema de diseño "Dark Fantasy Épico" (estilo Lineage 2) para toda la UI.
 *
 * Un único lugar que define la paleta (piedra oscura + oro viejo + pergamino +
 * brasa/arcano), la tipografía épica (Cinzel para títulos, EB Garamond para
 * cuerpo, con fallback a serif del sistema si no hay red), y helpers para que
 * cada panel comparta el MISMO lenguaje visual sin repetir CSS.
 *
 * Uso: llamar `injectTheme()` una vez al arrancar la app; luego los componentes
 * usan las clases (`aden-panel`, `aden-btn`, `aden-bar`…) o los tokens `COLORS`.
 */

export const FONT_DISPLAY = `'Cinzel', 'Trajan Pro', 'Georgia', serif`;
export const FONT_BODY = `'EB Garamond', 'Palatino Linotype', 'Georgia', serif`;

/** Paleta central (también expuesta como variables CSS en :root). */
export const COLORS = {
  ink: "#0c0a07",
  stone1: "#222a32",
  stone2: "#10151c",
  stoneEdge: "#525b63",
  gold: "#c9a24b",
  goldBright: "#f2d896",
  goldDeep: "#7a5c22",
  parchment: "#e9dcc2",
  text: "#ddceb0",
  textDim: "#9c8a68",
  hp1: "#e0402f",
  hp2: "#6f1210",
  mp1: "#4a90e2",
  mp2: "#16305c",
  exp1: "#ffd873",
  exp2: "#a9781c",
  arcane: "#9b7fd4",
  blood: "#a3231c",
  danger: "#ff5a4d",
  ok: "#7ac74f",
} as const;

let injected = false;

/** Inserta (una sola vez) las fuentes, variables CSS, keyframes y clases utilitarias. */
export function injectTheme(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;

  // Fuentes épicas (Google Fonts). Degradan a serif del sistema si no hay red.
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href =
    "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap";
  document.head.append(pre1, pre2, fonts);

  const style = document.createElement("style");
  style.id = "aden-theme";
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
:root {
  --aden-ink: ${COLORS.ink};
  --aden-stone-1: ${COLORS.stone1};
  --aden-stone-2: ${COLORS.stone2};
  --aden-stone-edge: ${COLORS.stoneEdge};
  --aden-gold: ${COLORS.gold};
  --aden-gold-bright: ${COLORS.goldBright};
  --aden-gold-deep: ${COLORS.goldDeep};
  --aden-parchment: ${COLORS.parchment};
  --aden-text: ${COLORS.text};
  --aden-text-dim: ${COLORS.textDim};
  --aden-arcane: ${COLORS.arcane};
  --aden-font-display: ${FONT_DISPLAY};
  --aden-font-body: ${FONT_BODY};
}

/* ── Paneles: piedra oscura con filete de oro y doble borde ornamental ─────── */
.aden-panel {
  background:
    linear-gradient(180deg, rgba(17,24,32,0.91), rgba(7,11,17,0.96)),
    var(--aden-panel-texture, none) center / 256px repeat;
  background-color: var(--aden-stone-2);
  border: 1px solid var(--aden-gold-deep);
  border-radius: 10px;
  box-shadow:
    0 10px 34px rgba(0,0,0,0.66),
    inset 0 0 0 1px rgba(0,0,0,0.55),
    inset 0 1px 0 rgba(242,216,150,0.10);
  color: var(--aden-text);
  font-family: var(--aden-font-body);
  position: relative;
  backdrop-filter: blur(2px);
}
/* Filete dorado interior (segundo borde) para el look de marco tallado. */
.aden-panel::before {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(201,162,75,0.30);
  border-radius: 7px;
  pointer-events: none;
}

/* ── Títulos con la tipografía de display ──────────────────────────────────── */
.aden-title {
  font-family: var(--aden-font-display);
  color: var(--aden-gold-bright);
  letter-spacing: 1.5px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0,0,0,0.85), 0 0 18px rgba(201,162,75,0.25);
  margin: 0;
}
.aden-eyebrow {
  font-family: var(--aden-font-display);
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--aden-gold);
  text-shadow: 0 1px 3px #000;
}

/* ── Botones ───────────────────────────────────────────────────────────────── */
.aden-btn {
  font-family: var(--aden-font-display);
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #241a0b;
  background: linear-gradient(180deg, var(--aden-gold-bright), var(--aden-gold) 55%, var(--aden-gold-deep));
  border: 1px solid #4a380f;
  border-radius: 6px;
  padding: 9px 18px;
  cursor: pointer;
  pointer-events: auto;
  text-shadow: 0 1px 0 rgba(255,255,255,0.25);
  box-shadow: 0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
}
.aden-btn:hover { filter: brightness(1.09); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.55), 0 0 16px rgba(201,162,75,0.35), inset 0 1px 0 rgba(255,255,255,0.5); }
.aden-btn:active { transform: translateY(1px); filter: brightness(0.96); }
.aden-btn--ghost {
  color: var(--aden-gold-bright);
  background: linear-gradient(180deg, rgba(60,46,26,0.6), rgba(30,22,12,0.6));
  border: 1px solid var(--aden-gold-deep);
  text-shadow: 0 1px 3px #000;
}
.aden-btn--ghost:hover { background: linear-gradient(180deg, rgba(84,64,34,0.7), rgba(44,32,16,0.7)); }
.aden-btn--danger { background: linear-gradient(180deg, #d9584a, #8f1c14); color: #fbe9e6; border-color: #4a0f0a; text-shadow: 0 1px 2px #000; }

/* ── Barras (HP/MP/EXP y genéricas) ────────────────────────────────────────── */
.aden-bar {
  position: relative;
  background: linear-gradient(180deg, #0a0705, #17110a);
  border: 1px solid #000;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(201,162,75,0.15);
}
.aden-bar__fill {
  height: 100%;
  transition: width 0.22s ease;
  position: relative;
  background-repeat: no-repeat;
}
/* Brillo superior (sheen) sobre el relleno para que no se vea plano. */
.aden-bar__fill::after {
  content: "";
  position: absolute; left: 0; right: 0; top: 0; height: 45%;
  background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0));
  border-radius: 4px 4px 0 0;
}
.aden-bar--hp .aden-bar__fill { background-image: linear-gradient(180deg, ${COLORS.hp1}, ${COLORS.hp2}); }
.aden-bar--mp .aden-bar__fill { background-image: linear-gradient(180deg, ${COLORS.mp1}, ${COLORS.mp2}); }
.aden-bar--exp .aden-bar__fill { background-image: linear-gradient(180deg, ${COLORS.exp1}, ${COLORS.exp2}); }

/* ── Scrollbar temática para paneles con overflow ──────────────────────────── */
.aden-scroll::-webkit-scrollbar { width: 10px; }
.aden-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.35); border-radius: 6px; }
.aden-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, var(--aden-gold-deep), #3a2c17); border-radius: 6px; border: 1px solid #000; }
.aden-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, var(--aden-gold), var(--aden-gold-deep)); }

/* ── Animaciones reutilizables ─────────────────────────────────────────────── */
@keyframes aden-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes aden-pop { 0% { transform: scale(0.85); opacity: 0; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
@keyframes aden-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes aden-shimmer { 0% { background-position: -160% 0; } 100% { background-position: 260% 0; } }
@keyframes aden-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes aden-glowpulse { 0%,100% { box-shadow: 0 0 10px rgba(201,162,75,0.3); } 50% { box-shadow: 0 0 22px rgba(201,162,75,0.6); } }
@keyframes aden-flash-in { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.7); } 15% { opacity: 1; transform: translate(-50%,-50%) scale(1.06); } 80% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1); } }

.aden-fadein { animation: aden-fadein 0.45s ease both; }
.aden-pop { animation: aden-pop 0.28s ease both; }
`;

/** Aplica el look de panel de piedra a un elemento. */
export function applyPanel(el: HTMLElement): void {
  el.classList.add("aden-panel");
}

/** Convierte un `<button>`/`<div>` en botón temático. `variant` opcional. */
export function applyButton(el: HTMLElement, variant?: "ghost" | "danger"): void {
  el.classList.add("aden-btn");
  if (variant === "ghost") el.classList.add("aden-btn--ghost");
  if (variant === "danger") el.classList.add("aden-btn--danger");
}

/**
 * Construye una barra temática (track + relleno con sheen). Devuelve el track y
 * el relleno para que el caller controle el ancho vía `fill.style.width`.
 */
export function makeThemedBar(kind: "hp" | "mp" | "exp"): { track: HTMLDivElement; fill: HTMLDivElement } {
  const track = document.createElement("div");
  track.className = `aden-bar aden-bar--${kind}`;
  const fill = document.createElement("div");
  fill.className = "aden-bar__fill";
  fill.style.width = "100%";
  track.appendChild(fill);
  return { track, fill };
}
