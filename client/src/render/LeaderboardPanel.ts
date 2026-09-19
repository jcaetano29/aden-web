import { COLORS, FONT_DISPLAY, FONT_BODY } from "./theme.js";

export interface LeaderPlayerRow {
  name: string;
  level: number;
  pvpKills: number;
  className: string;
}

export interface LeaderGuildRow {
  name: string;
  tag: string;
  bossKills: number;
}

export interface LeaderboardData {
  players: LeaderPlayerRow[];
  guilds: LeaderGuildRow[];
}

/**
 * Panel HTML de leaderboard (tecla "l"): overlay fijo, oculto por defecto.
 * Dos tablas de sólo lectura: Jugadores (nombre/nivel/kills PvP) y Guilds
 * (tag+nombre/jefes derrotados). Sigue el estilo DOM de GuildPanel.
 */
export class LeaderboardPanel {
  readonly el: HTMLDivElement;
  private lastData: LeaderboardData = { players: [], guilds: [] };
  /** Firma de la última data renderizada; null antes del primer render (fuerza el primer `update()` a dibujar). */
  private lastSignature: string | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "aden-panel aden-scroll";
    this.el.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;" +
      `pointer-events:none;z-index:1000;min-width:360px;max-height:72vh;overflow-y:auto;` +
      `font-family:${FONT_BODY};font-size:13px;color:${COLORS.text};padding:16px 18px;user-select:none;`;
    this.render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  setVisible(v: boolean): void {
    this.el.style.display = v ? "block" : "none";
  }

  update(data: LeaderboardData): void {
    // Evita redibujar cuando la data no cambió: se llama una vez por frame
    // mientras el panel está abierto (refresco del servidor cada ~15s).
    const signature = JSON.stringify(data);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.lastData = data;
    this.render();
  }

  private render(): void {
    const data = this.lastData;
    this.el.innerHTML = "";

    const title = document.createElement("div");
    title.textContent = "🏆 Salón de la Fama";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:18px;color:${COLORS.goldBright};margin-bottom:12px;letter-spacing:0.5px;`;
    this.el.appendChild(title);

    this.el.appendChild(this.renderPlayersSection(data.players));
    this.el.appendChild(this.renderGuildsSection(data.guilds));
  }

  private renderPlayersSection(players: LeaderPlayerRow[]): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom:12px;";

    const heading = document.createElement("div");
    heading.textContent = "Jugadores";
    heading.style.cssText = `font-family:${FONT_DISPLAY};font-weight:600;color:${COLORS.gold};margin-bottom:8px;letter-spacing:1px;font-size:13px;`;
    section.appendChild(heading);

    if (players.length === 0) {
      section.appendChild(this.renderEmpty());
      return section;
    }

    const table = document.createElement("div");
    table.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    players.forEach((p, i) => {
      const row = document.createElement("div");
      row.style.cssText = rankRowCss(i);
      row.textContent = `${medal(i)} ${p.name} (${p.className}) — Nv. ${p.level} — ${p.pvpKills} kills PvP`;
      table.appendChild(row);
    });
    section.appendChild(table);
    return section;
  }

  private renderGuildsSection(guilds: LeaderGuildRow[]): HTMLDivElement {
    const section = document.createElement("div");

    const heading = document.createElement("div");
    heading.textContent = "Guilds";
    heading.style.cssText = `font-family:${FONT_DISPLAY};font-weight:600;color:${COLORS.gold};margin-bottom:8px;letter-spacing:1px;font-size:13px;`;
    section.appendChild(heading);

    if (guilds.length === 0) {
      section.appendChild(this.renderEmpty());
      return section;
    }

    const table = document.createElement("div");
    table.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    guilds.forEach((g, i) => {
      const row = document.createElement("div");
      row.style.cssText = rankRowCss(i);
      row.textContent = `${medal(i)} [${g.tag}] ${g.name} — ${g.bossKills} jefes`;
      table.appendChild(row);
    });
    section.appendChild(table);
    return section;
  }

  private renderEmpty(): HTMLDivElement {
    const empty = document.createElement("div");
    empty.textContent = "Sin datos";
    empty.style.cssText = `opacity:0.6;font-style:italic;color:${COLORS.textDim};`;
    return empty;
  }
}

/** Medalla para los 3 primeros; número para el resto. */
function medal(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`;
}

/** Fila con tinte de rango (oro/plata/bronce para el podio). */
function rankRowCss(i: number): string {
  const tint = ["rgba(201,162,75,0.18)", "rgba(190,190,200,0.14)", "rgba(180,120,70,0.15)"][i] ?? "rgba(201,162,75,0.06)";
  const border = i < 3 ? "rgba(201,162,75,0.35)" : "rgba(201,162,75,0.15)";
  return (
    "display:flex;justify-content:space-between;gap:8px;" +
    `padding:5px 9px;background:${tint};border:1px solid ${border};border-radius:5px;`
  );
}
