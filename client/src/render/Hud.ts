import { expToNextLevel, getQuest, getClass, getSkill } from "@aden/shared";
import { COLORS, FONT_DISPLAY, makeThemedBar } from "./theme.js";

const BAR_WIDTH_PX = 190;
const BAR_HEIGHT_PX = 15;
const LEVEL_UP_BANNER_MS = 2200;

/**
 * HUD fijo (esquina inferior izq.) con las barras HP/MP/EXP del jugador
 * local, el nivel actual y un cartel de muerte/respawn. Sólo refleja el
 * estado sincronizado por el server (`update(...)`) — no muta HP/MP/exp/nivel
 * del lado cliente (autoritativo); `expToNextLevel` se usa únicamente para
 * calcular el relleno de la barra de EXP.
 *
 * Tema "dark fantasy épico" (medallón de nivel, barras con degradé + brillo,
 * flash rojo al recibir daño). Ver [[theme]].
 */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly hpLabel: HTMLDivElement;
  private readonly hpTrack: HTMLDivElement;
  private readonly mpFill: HTMLDivElement;
  private readonly mpLabel: HTMLDivElement;
  private readonly expFill: HTMLDivElement;
  private readonly expLabel: HTMLDivElement;
  private readonly levelMedallion: HTMLDivElement;
  private readonly classLabel: HTMLDivElement;
  private readonly skillLabel: HTMLDivElement;
  private readonly deathBanner: HTMLDivElement;
  private readonly levelUpBanner: HTMLDivElement;
  private levelUpTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly questLabel: HTMLDivElement;
  private readonly goldLabel: HTMLDivElement;
  private readonly toastBanner: HTMLDivElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly announceBanner: HTMLDivElement;
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHp = Infinity;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.className = "aden-panel aden-fadein";
    this.root.style.cssText =
      "position:fixed;left:14px;bottom:14px;pointer-events:none;z-index:1000;" +
      "display:flex;gap:12px;align-items:flex-start;padding:12px 14px 11px 12px;" +
      `font-family:${FONT_DISPLAY};color:${COLORS.text};user-select:none;`;

    // Medallón de nivel (círculo de oro grabado).
    this.levelMedallion = document.createElement("div");
    this.levelMedallion.style.cssText =
      "flex:0 0 auto;width:52px;height:52px;border-radius:50%;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;line-height:1;" +
      "background:radial-gradient(circle at 50% 35%, #f4dc92, #c9a24b 55%, #6f5320);" +
      "border:2px solid #4a380f;box-shadow:0 3px 10px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.6);" +
      "color:#2a1e08;text-shadow:0 1px 0 rgba(255,255,255,0.35);";
    const lvCaption = document.createElement("div");
    lvCaption.textContent = "NIVEL";
    lvCaption.style.cssText = "font-size:8px;letter-spacing:1.5px;opacity:0.8;";
    const lvNum = document.createElement("div");
    lvNum.textContent = "1";
    lvNum.style.cssText = "font-size:22px;font-weight:700;";
    this.levelMedallion.append(lvCaption, lvNum);
    (this.levelMedallion as any)._num = lvNum;
    this.root.appendChild(this.levelMedallion);

    // Columna derecha: clase/skill + barras + misión + oro.
    const col = document.createElement("div");
    col.style.cssText = "display:flex;flex-direction:column;gap:5px;";
    this.root.appendChild(col);

    const metaRow = document.createElement("div");
    metaRow.style.cssText = "display:flex;gap:10px;align-items:baseline;font-size:13px;";
    this.classLabel = document.createElement("div");
    this.classLabel.style.cssText = `color:${COLORS.goldBright};font-weight:600;letter-spacing:0.5px;`;
    this.classLabel.textContent = "—";
    this.skillLabel = document.createElement("div");
    this.skillLabel.style.cssText = `color:${COLORS.textDim};font-size:12px;`;
    this.skillLabel.textContent = "";
    metaRow.append(this.classLabel, this.skillLabel);
    col.appendChild(metaRow);

    const hp = this.makeBar("hp", "❤", COLORS.hp1);
    const mp = this.makeBar("mp", "✦", COLORS.mp1);
    const exp = this.makeBar("exp", "★", COLORS.exp1, 9);
    this.hpFill = hp.fill; this.hpLabel = hp.label; this.hpTrack = hp.track;
    this.mpFill = mp.fill; this.mpLabel = mp.label;
    this.expFill = exp.fill; this.expLabel = exp.label;
    col.append(hp.row, mp.row, exp.row);

    // Misión (pergamino) + oro.
    this.questLabel = document.createElement("div");
    this.questLabel.style.cssText =
      `margin-top:3px;font-size:13px;color:${COLORS.exp1};font-weight:600;` +
      "display:flex;align-items:center;gap:6px;";
    this.questLabel.textContent = "⚑ Hablá con el Anciano";
    col.appendChild(this.questLabel);

    this.goldLabel = document.createElement("div");
    this.goldLabel.style.cssText = `font-size:13px;color:${COLORS.parchment};display:flex;align-items:center;gap:6px;`;
    this.goldLabel.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe9a6,#c9a24b 60%,#7a5c22);box-shadow:0 0 5px rgba(201,162,75,0.6);"></span><span data-gold>0</span>`;
    col.appendChild(this.goldLabel);

    this.deathBanner = document.createElement("div");
    this.deathBanner.textContent = "Has caído — renaciendo…";
    this.deathBanner.style.cssText =
      "position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;text-align:center;" +
      `font-family:${FONT_DISPLAY};font-weight:700;font-size:30px;color:${COLORS.danger};` +
      "text-shadow:0 0 10px #000,0 0 24px rgba(224,64,47,0.6);letter-spacing:2px;" +
      "background:radial-gradient(ellipse at center, rgba(30,0,0,0.55), rgba(0,0,0,0) 70%);padding:30px 60px;";

    this.levelUpBanner = document.createElement("div");
    this.levelUpBanner.style.cssText =
      "position:fixed;left:50%;top:32%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;text-align:center;" +
      `font-family:${FONT_DISPLAY};font-weight:700;font-size:34px;color:${COLORS.goldBright};` +
      "text-shadow:0 0 10px #000,0 0 28px rgba(242,216,150,0.7);letter-spacing:2px;";

    this.toastBanner = document.createElement("div");
    this.toastBanner.style.cssText =
      "position:fixed;left:50%;top:20%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1000;display:none;text-align:center;" +
      `font-family:${FONT_DISPLAY};font-weight:600;font-size:17px;color:#fff;` +
      "text-shadow:0 0 6px #000;letter-spacing:0.5px;" +
      "background:linear-gradient(180deg, rgba(20,15,9,0.92), rgba(10,7,4,0.92));" +
      "padding:9px 20px;border-radius:8px;max-width:70vw;border:1px solid rgba(201,162,75,0.4);" +
      "box-shadow:0 6px 20px rgba(0,0,0,0.6);";

    // Banner de anuncio de evento de mundo (Etapa 14): más prominente que el toast.
    this.announceBanner = document.createElement("div");
    this.announceBanner.style.cssText =
      "position:fixed;left:50%;top:11%;transform:translate(-50%,-50%);" +
      "pointer-events:none;z-index:1100;display:none;text-align:center;" +
      `font-family:${FONT_DISPLAY};font-weight:700;font-size:23px;color:${COLORS.goldBright};` +
      "text-shadow:0 0 10px #000,0 0 20px rgba(163,35,28,0.6);letter-spacing:1.5px;" +
      "background:linear-gradient(180deg, rgba(38,10,10,0.85), rgba(16,6,6,0.85));" +
      "padding:12px 30px;border-radius:10px;border:1px solid #6b2b2b;max-width:82vw;" +
      "box-shadow:0 8px 28px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(201,162,75,0.2);";

    parent.appendChild(this.root);
    parent.appendChild(this.deathBanner);
    parent.appendChild(this.levelUpBanner);
    parent.appendChild(this.toastBanner);
    parent.appendChild(this.announceBanner);
  }

  /** Fila `icono + barra + valor` temática. */
  private makeBar(kind: "hp" | "mp" | "exp", icon: string, iconColor: string, height = BAR_HEIGHT_PX) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:7px;";
    const ic = document.createElement("div");
    ic.textContent = icon;
    ic.style.cssText = `width:14px;text-align:center;font-size:12px;color:${iconColor};text-shadow:0 0 4px rgba(0,0,0,0.9);`;
    const { track, fill } = makeThemedBar(kind);
    track.style.width = `${BAR_WIDTH_PX}px`;
    track.style.height = `${height}px`;
    const label = document.createElement("div");
    label.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 2px #000,0 0 3px #000;letter-spacing:0.3px;";
    track.appendChild(label);
    row.append(ic, track);
    return { row, track, fill, label };
  }

  /** Anuncio de evento de mundo (más prominente/duradero que un toast). */
  announce(msg: string, ms = 4500): void {
    this.announceBanner.textContent = msg;
    this.announceBanner.style.display = "";
    this.announceBanner.style.animation = "none";
    void this.announceBanner.offsetHeight;
    this.announceBanner.style.animation = "aden-flash-in 4.5s ease forwards";
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      this.announceBanner.style.display = "none";
    }, ms);
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
    this.toastBanner.classList.remove("aden-pop");
    void this.toastBanner.offsetHeight;
    this.toastBanner.classList.add("aden-pop");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastBanner.style.display = "none";
    }, ms);
  }

  /**
   * Refleja hp/maxHp (rojo), mp/maxMp (azul), exp/expToNextLevel(level)
   * (amarillo) y el nivel actual; muestra el cartel de muerte cuando `dead`.
   * También refleja gold, questId y questProgress para el tracker de misión,
   * y la clase + skill del jugador.
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
    className: string = "knight",
    skillId: string = "power_strike",
  ) {
    const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const mpRatio = maxMp > 0 ? Math.max(0, Math.min(1, mp / maxMp)) : 0;
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpLabel.textContent = `${Math.max(0, Math.round(hp))} / ${Math.round(maxHp)}`;
    this.mpFill.style.width = `${mpRatio * 100}%`;
    this.mpLabel.textContent = `${Math.max(0, Math.round(mp))} / ${Math.round(maxMp)}`;
    this.deathBanner.style.display = dead ? "" : "none";

    // Flash rojo del marco al recibir daño.
    if (hp < this.lastHp - 0.5 && !dead) {
      this.hpTrack.style.boxShadow = "0 0 0 2px rgba(224,64,47,0.9), 0 0 14px rgba(224,64,47,0.7)";
      setTimeout(() => { this.hpTrack.style.boxShadow = ""; }, 220);
    }
    this.lastHp = hp;

    const expNeeded = expToNextLevel(level);
    const expRatio = expNeeded > 0 ? Math.max(0, Math.min(1, exp / expNeeded)) : 0;
    this.expFill.style.width = `${expRatio * 100}%`;
    this.expLabel.textContent = `${Math.max(0, Math.round(exp))} / ${Math.round(expNeeded)}`;
    (this.levelMedallion as any)._num.textContent = String(level);

    try {
      this.classLabel.textContent = getClass(className).name;
    } catch {
      this.classLabel.textContent = "—";
    }
    try {
      this.skillLabel.textContent = `· ${getSkill(skillId).name}`;
    } catch {
      this.skillLabel.textContent = "";
    }

    if (questId === "") {
      this.questLabel.textContent = "⚑ Hablá con el Anciano";
    } else if (questId === "campaign_complete") {
      this.questLabel.textContent = "✦ Campaña completada";
    } else {
      try {
        const quest = getQuest(questId);
        const questText = `⚑ ${quest.title} — ${questProgress}/${quest.amount}`;
        this.questLabel.textContent =
          questProgress >= quest.amount ? questText + " — ¡Volvé al Anciano!" : questText;
      } catch {
        this.questLabel.textContent = "⚑ Misión desconocida";
      }
    }

    const goldSpan = this.goldLabel.querySelector("[data-gold]");
    if (goldSpan) goldSpan.textContent = String(Math.round(gold));
  }

  /** Muestra "¡Subiste a nivel {level}!" centrado ~2s y luego lo oculta. */
  flashLevelUp(level: number) {
    this.levelUpBanner.textContent = `✦ ¡Nivel ${level}! ✦`;
    this.levelUpBanner.style.display = "";
    this.levelUpBanner.style.animation = "none";
    void this.levelUpBanner.offsetHeight;
    this.levelUpBanner.style.animation = "aden-flash-in 2.2s ease forwards";
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
    this.toastBanner.remove();
    this.announceBanner.remove();
  }
}
