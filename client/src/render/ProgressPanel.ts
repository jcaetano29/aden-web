import { ACHIEVEMENTS, getDailyQuest, type Achievement } from "@aden/shared";

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
    this.root.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;z-index:1200;" +
      "min-width:320px;max-width:420px;max-height:80vh;overflow-y:auto;pointer-events:auto;" +
      "font:13px sans-serif;color:#fff;background:rgba(12,14,20,0.94);border:1px solid #3a3f52;" +
      "border-radius:8px;padding:16px 18px;box-shadow:0 8px 32px rgba(0,0,0,0.6);";

    const title = document.createElement("div");
    title.textContent = "Progreso";
    title.style.cssText = "font:bold 18px serif;margin-bottom:10px;color:#ffd54f;";
    this.root.appendChild(title);

    this.body = document.createElement("div");
    this.root.appendChild(this.body);

    const hint = document.createElement("div");
    hint.textContent = "Tecla T para cerrar";
    hint.style.cssText = "margin-top:10px;opacity:0.5;font-size:11px;text-align:center;";
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
    h.style.cssText = "font-weight:bold;margin:12px 0 4px;color:#9fb4ff;";
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
      `padding:3px 9px;background:${bg};color:#000;border:none;border-radius:4px;` +
      "font:11px bold sans-serif;cursor:pointer;pointer-events:auto;white-space:nowrap;";
    return b;
  }
}
