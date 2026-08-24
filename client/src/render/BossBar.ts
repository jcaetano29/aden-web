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
      "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:1100;" +
      "display:none;pointer-events:none;text-align:center;width:min(46vw,420px);" +
      "font:12px sans-serif;color:#fff;text-shadow:0 0 4px #000;";

    this.nameEl = document.createElement("div");
    this.nameEl.style.cssText = "font:bold 15px 'Georgia',serif;color:#ff6b6b;letter-spacing:1px;margin-bottom:3px;";
    this.root.appendChild(this.nameEl);

    this.barWrap = document.createElement("div");
    this.barWrap.style.cssText =
      "position:relative;height:16px;background:#3a0d0d;border:1px solid #000;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.6);";
    this.fill = document.createElement("div");
    this.fill.style.cssText = "height:100%;width:100%;background:linear-gradient(#ff5252,#a31212);transition:width 0.15s;";
    this.barWrap.appendChild(this.fill);
    this.hpText = document.createElement("div");
    this.hpText.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:bold 11px sans-serif;";
    this.barWrap.appendChild(this.hpText);
    this.root.appendChild(this.barWrap);

    this.subText = document.createElement("div");
    this.subText.style.cssText = "margin-top:3px;font-size:12px;color:#ffd54f;";
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
      this.nameEl.textContent = boss.name;
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
    this.nameEl.textContent = boss.name;
    const ratio = boss.maxHp > 0 ? Math.max(0, Math.min(1, boss.hp / boss.maxHp)) : 0;
    this.fill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `${Math.max(0, Math.round(boss.hp))} / ${Math.round(boss.maxHp)}`;
    this.subText.textContent = "";
  }
}
