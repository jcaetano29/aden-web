import { ACHIEVEMENTS, getDailyQuest, type Achievement } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "./theme.js";

export interface ProgressView {
  loginStreak: number;
  dailyQuestId: string;
  dailyProgress: number;
  dailyDone: boolean;
  totalKills: number;
  title: string;
  achievements: string[];
}

/**
 * Panel de Progreso (tecla "t"): la cara de la retención. Muestra la racha de
 * login, la misión diaria y su progreso, la lista de logros (desbloqueados vs.
 * bloqueados) y un selector para lucir el título ganado en el nameplate. Sólo
 * refleja el estado sincronizado; las acciones (lucir título) pasan por el server.
 * Signature-guard para no redibujar cada frame.
 */
export class ProgressPanel {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private visible = false;
  private lastSig = "";
  private readonly onSetTitle: (title: string) => void;

  constructor(onSetTitle: (title: string) => void) {
    this.onSetTitle = onSetTitle;
    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-scroll";
    this.root.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;z-index:1200;" +
      `min-width:340px;max-width:440px;max-height:80vh;overflow-y:auto;pointer-events:auto;` +
      `font-family:${FONT_BODY};font-size:13px;color:${COLORS.text};padding:18px 20px;`;

    const title = document.createElement("div");
    title.textContent = "📜 Crónica del Héroe";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;margin-bottom:12px;color:${COLORS.goldBright};letter-spacing:0.5px;`;
    this.root.appendChild(title);

    this.body = document.createElement("div");
    this.root.appendChild(this.body);

    const hint = document.createElement("div");
    hint.textContent = "Tecla T para cerrar";
    hint.style.cssText = `margin-top:12px;opacity:0.5;font-size:11px;text-align:center;letter-spacing:1px;color:${COLORS.textDim};`;
    this.root.appendChild(hint);
  }

  mount(parent: HTMLElement = document.body): void {
    parent.appendChild(this.root);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.root.style.display = v ? "" : "none";
    if (v) this.lastSig = ""; // forzar redibujo al abrir
  }

  isVisible(): boolean {
    return this.visible;
  }

  private section(titleText: string): HTMLDivElement {
    const h = document.createElement("div");
    h.textContent = titleText;
    h.style.cssText =
      `font-family:${FONT_DISPLAY};font-weight:600;margin:14px 0 6px;color:${COLORS.gold};letter-spacing:1px;font-size:13px;` +
      `border-bottom:1px solid rgba(201,162,75,0.2);padding-bottom:3px;`;
    this.body.appendChild(h);
    return h;
  }

  update(view: ProgressView): void {
    if (!this.visible) return;
    const sig = JSON.stringify(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.body.innerHTML = "";

    // ── Racha ──────────────────────────────────────────────────────────
    const streak = document.createElement("div");
    streak.innerHTML = `🔥 Racha de login: <b>${view.loginStreak}</b> día${view.loginStreak === 1 ? "" : "s"}`;
    this.body.appendChild(streak);
    const kills = document.createElement("div");
    kills.style.cssText = "opacity:0.85;margin-top:2px;";
    kills.textContent = `Enemigos derrotados: ${view.totalKills}`;
    this.body.appendChild(kills);

    // ── Misión diaria ──────────────────────────────────────────────────
    this.section("Misión diaria");
    const daily = document.createElement("div");
    if (view.dailyQuestId) {
      try {
        const dq = getDailyQuest(view.dailyQuestId);
        const done = view.dailyDone;
        daily.innerHTML = done
          ? `✅ <span style="color:#4fd14f">${dq.desc} — ¡completada!</span>`
          : `${dq.desc}<br><span style="opacity:0.8">Progreso: ${Math.min(view.dailyProgress, dq.amount)}/${dq.amount} · Recompensa: ${dq.rewardGold} oro</span>`;
      } catch {
        daily.textContent = "—";
      }
    } else {
      daily.textContent = "Entrá un nuevo día para recibir una misión diaria.";
    }
    this.body.appendChild(daily);

    // ── Logros ─────────────────────────────────────────────────────────
    const have = new Set(view.achievements);
    this.section(`Logros (${have.size}/${ACHIEVEMENTS.length})`);
    for (const a of ACHIEVEMENTS) {
      this.body.appendChild(this.achievementRow(a, have.has(a.id), view.title));
    }

    // ── Título activo ──────────────────────────────────────────────────
    this.section("Título en el nameplate");
    const cur = document.createElement("div");
    cur.innerHTML = view.title
      ? `Actual: <span style="color:#ffd54f;font-style:italic">${view.title}</span>`
      : `Actual: <span style="opacity:0.6">ninguno</span>`;
    this.body.appendChild(cur);
    if (view.title) {
      const clear = this.button("Quitar título", "#8a5a3c");
      clear.addEventListener("click", () => this.onSetTitle(""));
      clear.style.marginTop = "6px";
      this.body.appendChild(clear);
    }
  }

  private achievementRow(a: Achievement, unlocked: boolean, currentTitle: string): HTMLDivElement {
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;" +
      (unlocked ? "" : "opacity:0.45;");
    const label = document.createElement("div");
    label.innerHTML = `${unlocked ? "🏆" : "🔒"} <b>${a.name}</b> — <span style="opacity:0.85">${a.desc}</span>`;
    row.appendChild(label);
    // Botón para lucir el título del logro (si lo desbloqueó y no lo tiene puesto).
    if (unlocked && a.title && a.title !== currentTitle) {
      const btn = this.button("Lucir", "#4da6ff");
      btn.addEventListener("click", () => this.onSetTitle(a.title));
      row.appendChild(btn);
    }
    return row;
  }

  private button(text: string, bg: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText =
      `padding:4px 11px;background:linear-gradient(180deg,${bg},${bg}bb);color:#0d0a05;` +
      "border:1px solid rgba(0,0,0,0.5);border-radius:4px;font-weight:700;font-size:11px;" +
      "cursor:pointer;pointer-events:auto;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.3);transition:filter 0.12s;";
    b.addEventListener("mouseenter", () => { b.style.filter = "brightness(1.12)"; });
    b.addEventListener("mouseleave", () => { b.style.filter = "none"; });
    return b;
  }
}
