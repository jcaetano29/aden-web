import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

export interface GuildRow {
  id: string;
  name: string;
  tag: string;
  leaderName: string;
  bossKills: number;
}

export interface GuildPanelData {
  myGuildId: string;
  guilds: GuildRow[];
  roster: string[];
}

export interface GuildPanelHandlers {
  onCreate(name: string, tag: string): void;
  onJoin(guildId: string): void;
  onLeave(): void;
}

/**
 * Panel HTML de guild (tecla "g"): overlay fijo, oculto por defecto.
 * Sin guild: formulario para crear una nueva + lista de guilds vivas a las
 * que unirse. Con guild: nombre/tag + roster de miembros + botón salir.
 * Sigue el estilo DOM de ShopPanel/InventoryPanel (posición fija,
 * fondo semitransparente, pointer-events:auto en inputs/botones).
 */
export class GuildPanel {
  readonly el: HTMLDivElement;
  private lastData: GuildPanelData = { myGuildId: "", guilds: [], roster: [] };
  /** Firma de la última data renderizada; null antes del primer render (fuerza el primer `update()` a dibujar). */
  private lastSignature: string | null = null;

  constructor(private readonly handlers: GuildPanelHandlers) {
    this.el = document.createElement("div");
    this.el.className = "aden-panel aden-scroll";
    this.el.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;" +
      `pointer-events:none;z-index:1000;min-width:290px;max-height:70vh;overflow-y:auto;` +
      `font-family:${FONT_BODY};font-size:13px;color:${COLORS.text};padding:16px 18px;user-select:none;`;
    this.render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  setVisible(v: boolean): void {
    this.el.style.display = v ? "block" : "none";
    this.el.style.pointerEvents = v ? "auto" : "none";
  }

  update(data: GuildPanelData): void {
    // Evita redibujar (y por lo tanto destruir/recrear los <input>) cuando la
    // data no cambió: se llama una vez por frame mientras el panel está
    // abierto, y recrear el DOM en cada llamada tira el foco/valor de los
    // inputs del form de crear guild mientras el usuario está tipeando.
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
    title.textContent = "⚑ Hermandad";
    title.style.cssText = `font-family:${FONT_DISPLAY};font-weight:700;font-size:18px;color:${COLORS.goldBright};margin-bottom:12px;letter-spacing:0.5px;`;
    this.el.appendChild(title);

    if (data.myGuildId === "") {
      this.renderNoGuild(data);
    } else {
      this.renderMyGuild(data);
    }
  }

  private renderNoGuild(data: GuildPanelData): void {
    // Formulario de creación
    const form = document.createElement("div");
    form.style.cssText = "display:flex;gap:6px;margin-bottom:12px;";

    const inputCss =
      `pointer-events:auto;padding:6px 8px;border-radius:5px;border:1px solid #4a380f;` +
      `background:#0f0b07;color:${COLORS.goldBright};font-family:${FONT_BODY};outline:none;`;

    const nameInput = document.createElement("input");
    nameInput.setAttribute("data-guild-name", "");
    nameInput.placeholder = "Nombre";
    nameInput.style.cssText = "flex:1;" + inputCss;
    form.appendChild(nameInput);

    const tagInput = document.createElement("input");
    tagInput.setAttribute("data-guild-tag", "");
    tagInput.placeholder = "TAG";
    tagInput.style.cssText = "width:64px;" + inputCss;
    form.appendChild(tagInput);

    const createBtn = document.createElement("button");
    createBtn.setAttribute("data-guild-create", "");
    createBtn.textContent = "Crear";
    applyButton(createBtn);
    createBtn.style.cssText += "padding:5px 12px;font-size:12px;";
    createBtn.addEventListener("click", () => {
      this.handlers.onCreate(nameInput.value, tagInput.value.toUpperCase());
    });
    form.appendChild(createBtn);

    this.el.appendChild(form);

    // Lista de guilds vivas a las que unirse
    const listTitle = document.createElement("div");
    listTitle.textContent = "Guilds activas";
    listTitle.style.cssText = `font-family:${FONT_DISPLAY};font-weight:600;color:${COLORS.gold};margin-bottom:8px;letter-spacing:1px;font-size:13px;`;
    this.el.appendChild(listTitle);

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    if (data.guilds.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "(ninguna)";
      empty.style.cssText = "opacity:0.7;";
      list.appendChild(empty);
    } else {
      for (const g of data.guilds) {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;align-items:center;gap:8px;" +
          "padding:6px 8px;background:linear-gradient(180deg,rgba(201,162,75,0.10),rgba(0,0,0,0.15));" +
          "border:1px solid rgba(201,162,75,0.2);border-radius:6px;";

        const info = document.createElement("div");
        info.innerHTML = `<span style="color:${COLORS.gold};font-weight:600;">[${g.tag}]</span> ${g.name}`;
        row.appendChild(info);

        const joinBtn = document.createElement("button");
        joinBtn.setAttribute("data-guild-join", g.id);
        joinBtn.textContent = "Unirse";
        joinBtn.style.cssText =
          "padding:3px 10px;background:linear-gradient(180deg,#6fd06a,#3a9c3a);color:#0d0a05;" +
          "border:1px solid rgba(0,0,0,0.5);border-radius:4px;font-weight:700;font-size:11px;cursor:pointer;pointer-events:auto;";
        joinBtn.addEventListener("click", () => this.handlers.onJoin(g.id));
        row.appendChild(joinBtn);

        list.appendChild(row);
      }
    }
    this.el.appendChild(list);
  }

  private renderMyGuild(data: GuildPanelData): void {
    const guild = data.guilds.find((g) => g.id === data.myGuildId);

    const info = document.createElement("div");
    info.style.cssText = "margin-bottom:10px;";
    if (guild) {
      info.innerHTML =
        `<div style="font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${COLORS.goldBright};">[${guild.tag}] ${guild.name}</div>` +
        `<div style="font-size:12px;color:${COLORS.textDim};margin-top:2px;">Líder: ${guild.leaderName} · ☠ Jefes derrotados: ${guild.bossKills}</div>`;
    }
    this.el.appendChild(info);

    const rosterTitle = document.createElement("div");
    rosterTitle.textContent = "Miembros";
    rosterTitle.style.cssText = `font-family:${FONT_DISPLAY};font-weight:600;color:${COLORS.gold};margin-bottom:8px;letter-spacing:1px;font-size:13px;`;
    this.el.appendChild(rosterTitle);

    const roster = document.createElement("div");
    roster.style.cssText = "display:flex;flex-direction:column;gap:2px;margin-bottom:12px;";
    for (const name of data.roster) {
      const row = document.createElement("div");
      row.textContent = name;
      roster.appendChild(row);
    }
    this.el.appendChild(roster);

    const leaveBtn = document.createElement("button");
    leaveBtn.setAttribute("data-guild-leave", "");
    leaveBtn.textContent = "Salir de la guild";
    applyButton(leaveBtn, "danger");
    leaveBtn.style.cssText += "padding:5px 12px;font-size:12px;";
    leaveBtn.addEventListener("click", () => this.handlers.onLeave());
    this.el.appendChild(leaveBtn);
  }
}
