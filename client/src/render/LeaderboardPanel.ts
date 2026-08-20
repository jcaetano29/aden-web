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
    this.el.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;" +
      "pointer-events:none;z-index:1000;min-width:320px;font:12px sans-serif;" +
      "text-shadow:0 0 3px #000;color:#fff;background:rgba(0,0,0,0.75);" +
      "border-radius:6px;padding:12px;user-select:none;border:2px solid #7ec8ff;";
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
    title.textContent = "Leaderboard";
    title.style.cssText = "font-weight:bold;color:#7ec8ff;margin-bottom:10px;";
    this.el.appendChild(title);

    this.el.appendChild(this.renderPlayersSection(data.players));
    this.el.appendChild(this.renderGuildsSection(data.guilds));
  }

  private renderPlayersSection(players: LeaderPlayerRow[]): HTMLDivElement {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom:12px;";

    const heading = document.createElement("div");
    heading.textContent = "Jugadores";
    heading.style.cssText = "font-weight:bold;margin-bottom:6px;";
    section.appendChild(heading);

    if (players.length === 0) {
      section.appendChild(this.renderEmpty());
      return section;
    }

    const table = document.createElement("div");
    table.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    players.forEach((p, i) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:8px;" +
        "padding:2px 6px;background:rgba(126,200,255,0.1);border-radius:4px;";
      row.textContent = `#${i + 1} ${p.name} (${p.className}) — Nv. ${p.level} — ${p.pvpKills} kills PvP`;
      table.appendChild(row);
    });
    section.appendChild(table);
    return section;
  }

  private renderGuildsSection(guilds: LeaderGuildRow[]): HTMLDivElement {
    const section = document.createElement("div");

    const heading = document.createElement("div");
    heading.textContent = "Guilds";
    heading.style.cssText = "font-weight:bold;margin-bottom:6px;";
    section.appendChild(heading);

    if (guilds.length === 0) {
      section.appendChild(this.renderEmpty());
      return section;
    }

    const table = document.createElement("div");
    table.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    guilds.forEach((g, i) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;gap:8px;" +
        "padding:2px 6px;background:rgba(126,200,255,0.1);border-radius:4px;";
      row.textContent = `#${i + 1} [${g.tag}] ${g.name} — ${g.bossKills} jefes`;
      table.appendChild(row);
    });
    section.appendChild(table);
    return section;
  }

  private renderEmpty(): HTMLDivElement {
    const empty = document.createElement("div");
    empty.textContent = "Sin datos";
    empty.style.cssText = "opacity:0.7;";
    return empty;
  }
}
