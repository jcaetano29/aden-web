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

  constructor(private readonly handlers: GuildPanelHandlers) {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:none;" +
      "pointer-events:none;z-index:1000;min-width:260px;font:12px sans-serif;" +
      "text-shadow:0 0 3px #000;color:#fff;background:rgba(0,0,0,0.75);" +
      "border-radius:6px;padding:12px;user-select:none;border:2px solid #7ec8ff;";
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
    this.lastData = data;
    this.render();
  }

  private render(): void {
    const data = this.lastData;
    this.el.innerHTML = "";

    const title = document.createElement("div");
    title.textContent = "Guild";
    title.style.cssText = "font-weight:bold;color:#7ec8ff;margin-bottom:10px;";
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

    const nameInput = document.createElement("input");
    nameInput.setAttribute("data-guild-name", "");
    nameInput.placeholder = "Nombre";
    nameInput.style.cssText =
      "flex:1;pointer-events:auto;padding:4px;border-radius:3px;border:none;";
    form.appendChild(nameInput);

    const tagInput = document.createElement("input");
    tagInput.setAttribute("data-guild-tag", "");
    tagInput.placeholder = "TAG";
    tagInput.style.cssText =
      "width:60px;pointer-events:auto;padding:4px;border-radius:3px;border:none;";
    form.appendChild(tagInput);

    const createBtn = document.createElement("button");
    createBtn.setAttribute("data-guild-create", "");
    createBtn.textContent = "Crear";
    createBtn.style.cssText =
      "padding:4px 10px;background:#7ec8ff;color:#000;border:none;border-radius:3px;" +
      "font:11px bold sans-serif;cursor:pointer;pointer-events:auto;";
    createBtn.addEventListener("click", () => {
      this.handlers.onCreate(nameInput.value, tagInput.value.toUpperCase());
    });
    form.appendChild(createBtn);

    this.el.appendChild(form);

    // Lista de guilds vivas a las que unirse
    const listTitle = document.createElement("div");
    listTitle.textContent = "Guilds activas";
    listTitle.style.cssText = "font-weight:bold;margin-bottom:6px;";
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
          "padding:4px 6px;background:rgba(126,200,255,0.1);border-radius:4px;";

        const info = document.createElement("div");
        info.textContent = `[${g.tag}] ${g.name}`;
        row.appendChild(info);

        const joinBtn = document.createElement("button");
        joinBtn.setAttribute("data-guild-join", g.id);
        joinBtn.textContent = "Unirse";
        joinBtn.style.cssText =
          "padding:2px 8px;background:#2ecc40;color:#000;border:none;border-radius:3px;" +
          "font:10px bold sans-serif;cursor:pointer;pointer-events:auto;";
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
        `<div style="font-weight:bold;color:#7ec8ff;">[${guild.tag}] ${guild.name}</div>` +
        `<div style="font-size:11px;color:#aaa;">Líder: ${guild.leaderName} · Jefes derrotados: ${guild.bossKills}</div>`;
    }
    this.el.appendChild(info);

    const rosterTitle = document.createElement("div");
    rosterTitle.textContent = "Miembros";
    rosterTitle.style.cssText = "font-weight:bold;margin-bottom:6px;";
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
    leaveBtn.style.cssText =
      "padding:4px 10px;background:#ff5252;color:#000;border:none;border-radius:3px;" +
      "font:11px bold sans-serif;cursor:pointer;pointer-events:auto;";
    leaveBtn.addEventListener("click", () => this.handlers.onLeave());
    this.el.appendChild(leaveBtn);
  }
}
