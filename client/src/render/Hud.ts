import { expToNextLevel, getQuest } from "@aden/shared";

const BAR_WIDTH_PX = 160;
const BAR_HEIGHT_PX = 14;
const LEVEL_UP_BANNER_MS = 2000;

/**
 * HUD fijo (esquina inferior izq.) con las barras HP/MP/EXP del jugador
 * local, el nivel actual y un cartel de muerte/respawn. Sólo refleja el
 * estado sincronizado por el server (`update(...)`) — no muta HP/MP/exp/nivel
 * del lado cliente (autoritativo); `expToNextLevel` se usa únicamente para
 * calcular el relleno de la barra de EXP.
 */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly hpLabel: HTMLDivElement;
  private readonly mpFill: HTMLDivElement;
  private readonly mpLabel: HTMLDivElement;
  private readonly expFill: HTMLDivElement;
  private readonly expLabel: HTMLDivElement;
  private readonly levelLabel: HTMLDivElement;
  private readonly deathBanner: HTMLDivElement;
  private readonly levelUpBanner: HTMLDivElement;
  private levelUpTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly questLabel: HTMLDivElement;
  private readonly goldLabel: HTMLDivElement;
  private readonly toastBanner: HTMLDivElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;left:12px;bottom:12px;pointer-events:none;z-index:1000;" +
      "display:flex;flex-direction:column;gap:4px;font:12px sans-serif;" +
      "text-shadow:0 0 3px #000;color:#fff;user-select:none;";

    this.levelLabel = document.createElement("div");
    this.levelLabel.style.cssText = "font-weight:bold;";
    this.levelLabel.textContent = "Nv. 1";
    this.root.appendChild(this.levelLabel);

    const [hpRow, hpFill, hpLabel] = makeBar(BAR_WIDTH_PX, BAR_HEIGHT_PX, "#8b1e1e", "#e53935");
    const [mpRow, mpFill, mpLabel] = makeBar(BAR_WIDTH_PX, BAR_HEIGHT_PX, "#12305c", "#2979ff");
    const [expRow, expFill, expLabel] = makeBar(BAR_WIDTH_PX, BAR_HEIGHT_PX, "#4a3b12", "#ffd54f");
    this.hpFill = hpFill;
    this.hpLabel = hpLabel;
    this.mpFill = mpFill;
    this.mpLabel = mpLabel;
    this.expFill = expFill;
    this.expLabel = expLabel;
    this.root.appendChild(hpRow);
    this.root.appendChild(mpRow);
    this.root.appendChild(expRow);

    // Línea de misión (resaltada para que se note el objetivo)
    this.questLabel = document.createElement("div");
    this.questLabel.style.cssText =
      "margin-top:4px;font-weight:bold;color:#ffe066;";
    this.questLabel.textContent = "Sin misión";
    this.root.appendChild(this.questLabel);

    // Línea de oro
    this.goldLabel = document.createElement("div");
    this.goldLabel.style.cssText = "margin-top:4px;";
    this.goldLabel.textContent = "Oro: 0";
    this.root.appendChild(this.goldLabel);

    this.deathBanner = document.createElement("div");
    this.deathBanner.textContent = "Has muerto — respawneando…";
    this.deathBanner.style.cssText =
      "position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;" +
      "font:bold 22px sans-serif;color:#ff5252;text-shadow:0 0 6px #000,0 0 12px #000;" +
      "background:rgba(0,0,0,0.5);padding:10px 20px;border-radius:6px;";

    this.levelUpBanner = document.createElement("div");
    this.levelUpBanner.style.cssText =
      "position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;" +
      "font:bold 26px sans-serif;color:#ffd54f;text-shadow:0 0 6px #000,0 0 12px #000;" +
      "background:rgba(0,0,0,0.5);padding:10px 20px;border-radius:6px;";

    this.toastBanner = document.createElement("div");
    this.toastBanner.style.cssText =
      "position:fixed;left:50%;top:18%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;text-align:center;" +
      "font:bold 18px sans-serif;color:#fff;text-shadow:0 0 6px #000,0 0 12px #000;" +
      "background:rgba(0,0,0,0.55);padding:8px 18px;border-radius:6px;max-width:70vw;";

    parent.appendChild(this.root);
    parent.appendChild(this.deathBanner);
    parent.appendChild(this.levelUpBanner);
    parent.appendChild(this.toastBanner);
  }

  /**
   * Mensaje transitorio centrado arriba (feedback de interacción con el NPC):
   * p.ej. "acercate al Anciano", "te faltan 3 esqueletos", "¡misión entregada!".
   * Se auto-oculta a los `ms` milisegundos.
   */
  toast(msg: string, color = "#fff", ms = 2200): void {
    this.toastBanner.textContent = msg;
    this.toastBanner.style.color = color;
    this.toastBanner.style.display = "";
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastBanner.style.display = "none";
    }, ms);
  }

  /**
   * Refleja hp/maxHp (rojo), mp/maxMp (azul), exp/expToNextLevel(level)
   * (amarillo) y el nivel actual; muestra el cartel de muerte cuando `dead`.
   * También refleja gold, questId y questProgress para el tracker de misión.
   */
  update(
    hp: number,
    maxHp: number,
    mp: number,
    maxMp: number,
    dead: boolean,
    exp: number,
    level: number,
    gold: number = 0,
    questId: string = "",
    questProgress: number = 0,
  ) {
    const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const mpRatio = maxMp > 0 ? Math.max(0, Math.min(1, mp / maxMp)) : 0;
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpLabel.textContent = `HP ${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}`;
    this.mpFill.style.width = `${mpRatio * 100}%`;
    this.mpLabel.textContent = `MP ${Math.max(0, Math.round(mp))}/${Math.round(maxMp)}`;
    this.deathBanner.style.display = dead ? "" : "none";

    const expNeeded = expToNextLevel(level);
    const expRatio = expNeeded > 0 ? Math.max(0, Math.min(1, exp / expNeeded)) : 0;
    this.expFill.style.width = `${expRatio * 100}%`;
    this.expLabel.textContent = `EXP ${Math.max(0, Math.round(exp))}/${Math.round(expNeeded)}`;
    this.levelLabel.textContent = `Nv. ${level}`;

    // Actualizar quest tracker
    if (questId === "") {
      this.questLabel.textContent = "Sin misión";
    } else {
      try {
        const quest = getQuest(questId);
        const questText = `${quest.title} — ${questProgress}/${quest.amount}`;
        if (questProgress >= quest.amount) {
          this.questLabel.textContent = questText + " — ¡Volvé al NPC!";
        } else {
          this.questLabel.textContent = questText;
        }
      } catch {
        this.questLabel.textContent = "Misión desconocida";
      }
    }

    // Actualizar oro
    this.goldLabel.textContent = `Oro: ${Math.round(gold)}`;
  }

  /** Muestra "¡Subiste a nivel {level}!" centrado ~2s y luego lo oculta. */
  flashLevelUp(level: number) {
    this.levelUpBanner.textContent = `¡Subiste a nivel ${level}!`;
    this.levelUpBanner.style.display = "";
    if (this.levelUpTimer !== null) clearTimeout(this.levelUpTimer);
    this.levelUpTimer = setTimeout(() => {
      this.levelUpBanner.style.display = "none";
      this.levelUpTimer = null;
    }, LEVEL_UP_BANNER_MS);
  }

  remove() {
    if (this.levelUpTimer !== null) clearTimeout(this.levelUpTimer);
    this.root.remove();
    this.deathBanner.remove();
    this.levelUpBanner.remove();
  }
}

/** Crea una fila `label + barra` y devuelve [fila, relleno, label] para que el caller los guarde. */
function makeBar(
  width: number,
  height: number,
  bg: string,
  fg: string,
): [HTMLDivElement, HTMLDivElement, HTMLDivElement] {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:6px;";

  const bar = document.createElement("div");
  bar.style.cssText =
    `width:${width}px;height:${height}px;background:${bg};` +
    "border:1px solid rgba(0,0,0,0.8);border-radius:3px;overflow:hidden;position:relative;";

  const fill = document.createElement("div");
  fill.style.cssText = `height:100%;width:100%;background:${fg};`;
  bar.appendChild(fill);

  const label = document.createElement("div");
  label.style.cssText = "min-width:70px;";
  row.appendChild(bar);
  row.appendChild(label);

  return [row, fill, label];
}
