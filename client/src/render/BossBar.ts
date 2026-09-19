import { COLORS, FONT_DISPLAY } from "./theme.js";

export interface BossState {
  name: string;
  hp: number;
  maxHp: number;
  dead: boolean;
}

/**
 * Barra de vida del jefe en pantalla (Etapa 14): un evento con público. Aparece
 * arriba-centro cuando el jefe está SIENDO PELEADO (HP < máx) para que todos vean
 * la pelea en vivo desde cualquier zona; cuando cae, muestra un contador de
 * reaparición. Oculta si el jefe está intacto (idle) o no existe. Sólo presentación.
 */
export class BossBar {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly barWrap: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly hpText: HTMLDivElement;
  private readonly subText: HTMLDivElement;
  /** timestamp (ms) en que se lo vio morir, para el contador de reaparición. */
  private deadSince: number | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:1100;" +
      "display:none;pointer-events:none;text-align:center;width:min(52vw,480px);" +
      `font-family:${FONT_DISPLAY};color:#fff;`;

    this.nameEl = document.createElement("div");
    this.nameEl.style.cssText =
      "font-weight:700;font-size:17px;color:#ff6b6b;letter-spacing:3px;margin-bottom:5px;" +
      "text-transform:uppercase;text-shadow:0 0 8px #000,0 0 16px rgba(163,35,28,0.8);";
    this.root.appendChild(this.nameEl);

    this.barWrap = document.createElement("div");
    this.barWrap.style.cssText =
      "position:relative;height:20px;border-radius:5px;overflow:hidden;" +
      "background:linear-gradient(180deg,#1a0605,#2c0a0a);" +
      "border:1px solid #5a1512;box-shadow:0 4px 16px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(201,162,75,0.25);";
    this.fill = document.createElement("div");
    this.fill.style.cssText =
      "height:100%;width:100%;transition:width 0.18s ease;position:relative;" +
      "background:linear-gradient(180deg,#ff6b52,#c0201a 60%,#7a1210);" +
      "box-shadow:0 0 14px rgba(255,80,60,0.6);";
    // Brillo superior en el relleno.
    const sheen = document.createElement("div");
    sheen.style.cssText = "position:absolute;inset:0 0 auto 0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0));";
    this.fill.appendChild(sheen);
    this.barWrap.appendChild(this.fill);
    this.hpText = document.createElement("div");
    this.hpText.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "font-weight:700;font-size:12px;letter-spacing:0.5px;text-shadow:0 1px 3px #000,0 0 4px #000;";
    this.barWrap.appendChild(this.hpText);
    this.root.appendChild(this.barWrap);

    this.subText = document.createElement("div");
    this.subText.style.cssText = `margin-top:5px;font-size:13px;color:${COLORS.exp1};letter-spacing:1px;text-shadow:0 1px 3px #000;`;
    this.root.appendChild(this.subText);

    parent.appendChild(this.root);
  }

  private static fmt(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /**
   * Refresca la barra. `boss` es el estado del jefe (o null si no existe).
   * `respawnTotalMs` es el tiempo de reaparición del jefe (de la config compartida),
   * usado para el contador cuando está muerto. Llamar cada frame.
   */
  update(boss: BossState | null, respawnTotalMs: number): void {
    if (!boss) {
      this.root.style.display = "none";
      this.deadSince = null;
      return;
    }

    if (boss.dead) {
      if (this.deadSince === null) this.deadSince = performance.now();
      const remaining = respawnTotalMs - (performance.now() - this.deadSince);
      this.root.style.display = "";
      this.nameEl.textContent = `☠ ${boss.name}`;
      this.barWrap.style.display = "none";
      this.subText.textContent = `Renace en ${BossBar.fmt(remaining)}`;
      return;
    }

    this.deadSince = null;
    // Vivo e intacto → oculto (idle). Vivo y dañado → mostrar la pelea.
    if (boss.hp >= boss.maxHp) {
      this.root.style.display = "none";
      return;
    }
    this.root.style.display = "";
    this.barWrap.style.display = "";
    this.nameEl.textContent = `☠ ${boss.name} ☠`;
    const ratio = boss.maxHp > 0 ? Math.max(0, Math.min(1, boss.hp / boss.maxHp)) : 0;
    this.fill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `${Math.max(0, Math.round(boss.hp))} / ${Math.round(boss.maxHp)}`;
    this.subText.textContent = "";
  }
}
