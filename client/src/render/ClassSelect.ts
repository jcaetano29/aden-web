import { CLASSES, CLASS_ORDER } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

/** Acento e ícono por clase para las cards. */
const CLASS_STYLE: Record<string, { accent: string; glyph: string; role: string }> = {
  knight: { accent: "#c9a24b", glyph: "🛡", role: "Tanque — mucha vida y defensa" },
  mage: { accent: "#7fb0ff", glyph: "✷", role: "Daño mágico — mucho MP, frágil" },
  barbarian: { accent: "#e0563f", glyph: "⚔", role: "Daño físico bruto" },
  rogue: { accent: "#6fd06a", glyph: "🗡", role: "Rápido — ataca seguido" },
};

export type LoginMode = "login" | "create";

export interface LoginResult {
  name: string;
  className: string;
  password: string;
  mode: LoginMode;
}

/**
 * Pantalla de acceso: dos modos con pestañas — "Entrar" (nombre + contraseña, para
 * volver con tu personaje) y "Crear personaje" (nombre + contraseña + clase). En
 * modo Entrar NO se elige clase (la clase la trae tu personaje guardado). `create()`
 * resuelve con { name, className, password, mode } al confirmar.
 */
export class ClassSelect {
  private readonly root: HTMLDivElement;
  private resolver: ((v: LoginResult) => void) | null = null;
  private selected: string | null = null;
  private mode: LoginMode = "login";
  private readonly cards = new Map<string, HTMLDivElement>();
  private readonly nameInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly errorDiv: HTMLDivElement;
  private readonly enterBtn: HTMLButtonElement;
  private readonly loginTab: HTMLButtonElement;
  private readonly createTab: HTMLButtonElement;
  private readonly pickLabel: HTMLDivElement;
  private readonly cardContainer: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;align-items:center;" +
      "pointer-events:auto;z-index:2000;gap:14px;padding:32px;overflow-y:auto;" +
      "background:radial-gradient(120% 90% at 50% -10%, #241706 0%, #0c0a07 55%, #050403 100%);" +
      `font-family:${FONT_BODY};color:${COLORS.text};`;
    this.root.className = "aden-scroll";

    const eyebrow = document.createElement("div");
    eyebrow.textContent = "EL ASEDIO DE ADEN";
    eyebrow.style.cssText = `font-family:${FONT_DISPLAY};letter-spacing:5px;font-size:13px;color:${COLORS.gold};text-shadow:0 1px 3px #000;`;

    const title = document.createElement("h1");
    title.textContent = "ADEN";
    title.className = "aden-title";
    title.style.cssText += "font-size:60px;letter-spacing:10px;margin:0;text-align:center;line-height:1;";
    const rule = document.createElement("div");
    rule.style.cssText = `height:2px;width:200px;background:linear-gradient(90deg,transparent,${COLORS.gold},transparent);margin:2px 0 4px;`;

    // Pestañas de modo: Entrar / Crear personaje.
    const tabs = document.createElement("div");
    tabs.style.cssText = "display:flex;gap:8px;margin-top:2px;";
    this.loginTab = document.createElement("button");
    this.loginTab.textContent = "Entrar";
    this.createTab = document.createElement("button");
    this.createTab.textContent = "Crear personaje";
    for (const t of [this.loginTab, this.createTab]) {
      t.style.cssText =
        `font-family:${FONT_DISPLAY};font-size:14px;letter-spacing:1px;padding:7px 18px;cursor:pointer;` +
        "background:transparent;border:1px solid #4a380f;border-radius:8px;color:#b9a06a;transition:all 0.15s;";
    }
    this.loginTab.addEventListener("click", () => this.setMode("login"));
    this.createTab.addEventListener("click", () => this.setMode("create"));
    tabs.append(this.loginTab, this.createTab);

    // Campo de nombre.
    const nameWrap = document.createElement("div");
    nameWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:4px;";
    const nameLabel = document.createElement("div");
    nameLabel.textContent = "NOMBRE DEL HÉROE";
    nameLabel.style.cssText = `font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:3px;color:${COLORS.textDim};`;
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.maxLength = 16;
    this.nameInput.placeholder = "Adventurer";
    this.nameInput.style.cssText =
      `font-family:${FONT_DISPLAY};font-size:20px;color:${COLORS.goldBright};text-align:center;` +
      "background:linear-gradient(180deg,#1a130b,#0d0906);border:1px solid #4a380f;border-radius:8px;" +
      "padding:10px 18px;width:280px;outline:none;letter-spacing:1px;" +
      "box-shadow:inset 0 2px 6px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,75,0.15);";
    this.nameInput.addEventListener("focus", () => {
      this.nameInput.style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,75,0.5), 0 0 14px rgba(201,162,75,0.3)";
    });
    this.nameInput.addEventListener("blur", () => {
      this.nameInput.style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,75,0.15)";
    });
    // Campo de contraseña.
    const passLabel = document.createElement("div");
    passLabel.textContent = "CONTRASEÑA";
    passLabel.style.cssText = `font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:3px;color:${COLORS.textDim};margin-top:10px;`;
    this.passwordInput = document.createElement("input");
    this.passwordInput.type = "password";
    this.passwordInput.maxLength = 40;
    this.passwordInput.placeholder = "••••••";
    this.passwordInput.autocomplete = "current-password";
    this.passwordInput.style.cssText = this.nameInput.style.cssText;
    this.passwordInput.addEventListener("focus", () => {
      this.passwordInput.style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,75,0.5), 0 0 14px rgba(201,162,75,0.3)";
    });
    this.passwordInput.addEventListener("blur", () => {
      this.passwordInput.style.boxShadow = "inset 0 2px 6px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,75,0.15)";
    });
    this.errorDiv = document.createElement("div");
    this.errorDiv.style.cssText = "min-height:16px;font-size:13px;color:#ff6b6b;font-weight:600;text-align:center;max-width:320px;";
    nameWrap.append(nameLabel, this.nameInput, passLabel, this.passwordInput, this.errorDiv);

    this.pickLabel = document.createElement("div");
    this.pickLabel.textContent = "ELEGÍ TU CLASE";
    this.pickLabel.style.cssText = `font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:3px;color:${COLORS.textDim};margin-top:4px;`;

    this.cardContainer = document.createElement("div");
    this.cardContainer.style.cssText =
      "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;max-width:820px;width:100%;";

    for (const classId of CLASS_ORDER) {
      const classDef = CLASSES[classId];
      if (!classDef) continue;
      const st = CLASS_STYLE[classId] ?? { accent: COLORS.gold, glyph: "◆", role: "" };
      const card = document.createElement("div");
      card.className = "aden-panel";
      card.style.cssText =
        "padding:20px 16px;cursor:pointer;text-align:center;min-height:150px;" +
        "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;" +
        "transition:transform 0.15s ease, box-shadow 0.15s ease;";
      const glyph = document.createElement("div");
      glyph.textContent = st.glyph;
      glyph.style.cssText = `font-size:34px;color:${st.accent};text-shadow:0 0 12px ${st.accent}88;line-height:1;`;
      const cardTitle = document.createElement("div");
      cardTitle.textContent = classDef.name;
      cardTitle.style.cssText = `font-family:${FONT_DISPLAY};font-size:20px;font-weight:700;color:${COLORS.goldBright};letter-spacing:0.5px;`;
      const cardDesc = document.createElement("div");
      cardDesc.textContent = st.role;
      cardDesc.style.cssText = `font-size:14px;color:${COLORS.textDim};line-height:1.35;`;
      card.append(glyph, cardTitle, cardDesc);
      card.addEventListener("mouseenter", () => { if (this.selected !== classId) card.style.transform = "translateY(-3px)"; });
      card.addEventListener("mouseleave", () => { if (this.selected !== classId) card.style.transform = "translateY(0)"; });
      card.addEventListener("click", () => this.selectCard(classId, st.accent));
      this.cards.set(classId, card);
      this.cardContainer.appendChild(card);
    }

    this.enterBtn = document.createElement("button");
    applyButton(this.enterBtn);
    this.enterBtn.style.marginTop = "8px";
    this.enterBtn.style.padding = "12px 34px";
    this.enterBtn.style.fontSize = "18px";
    this.enterBtn.addEventListener("click", () => this.confirm());

    const onEnter = (e: KeyboardEvent) => { if (e.key === "Enter") this.confirm(); };
    this.nameInput.addEventListener("keydown", onEnter);
    this.passwordInput.addEventListener("keydown", onEnter);
    this.nameInput.addEventListener("input", () => this.refreshButton());
    this.passwordInput.addEventListener("input", () => this.refreshButton());

    this.root.append(eyebrow, title, rule, tabs, nameWrap, this.pickLabel, this.cardContainer, this.enterBtn);
    parent.appendChild(this.root);
    this.setMode("login");
  }

  private setMode(mode: LoginMode): void {
    this.mode = mode;
    const on = `background:linear-gradient(180deg,rgba(201,162,75,0.25),rgba(201,162,75,0.08));color:${COLORS.goldBright};border-color:${COLORS.gold};`;
    const off = "background:transparent;color:#b9a06a;border-color:#4a380f;";
    this.loginTab.style.cssText = this.loginTab.style.cssText.replace(/background:[^;]*;|color:[^;]*;|border-color:[^;]*;/g, "") + (mode === "login" ? on : off);
    this.createTab.style.cssText = this.createTab.style.cssText.replace(/background:[^;]*;|color:[^;]*;|border-color:[^;]*;/g, "") + (mode === "create" ? on : off);
    // La clase sólo se elige al crear.
    const showClass = mode === "create";
    this.pickLabel.style.display = showClass ? "" : "none";
    this.cardContainer.style.display = showClass ? "" : "none";
    this.errorDiv.textContent = "";
    this.refreshButton();
  }

  private selectCard(classId: string, accent: string): void {
    this.selected = classId;
    for (const [id, card] of this.cards) {
      const active = id === classId;
      card.style.transform = active ? "translateY(-4px) scale(1.02)" : "translateY(0)";
      card.style.boxShadow = active ? `0 10px 34px rgba(0,0,0,0.66), 0 0 0 2px ${accent}, 0 0 22px ${accent}66` : "";
    }
    this.refreshButton();
  }

  /** Habilita/deshabilita el botón y ajusta su texto según el modo y los campos. */
  private refreshButton(): void {
    this.enterBtn.textContent = this.mode === "login" ? "Entrar a Aden" : "Crear personaje";
    const nameOk = this.nameInput.value.trim().length > 0;
    const passOk = this.passwordInput.value.length >= 4;
    const classOk = this.mode === "login" || this.selected !== null;
    const ready = nameOk && passOk && classOk;
    this.enterBtn.disabled = !ready;
    this.enterBtn.style.opacity = ready ? "1" : "0.5";
    this.enterBtn.style.cursor = ready ? "pointer" : "not-allowed";
  }

  private confirm(): void {
    if (!this.resolver) return;
    const name = this.nameInput.value.trim();
    const password = this.passwordInput.value;
    if (name.length < 1) { this.errorDiv.textContent = "Escribí un nombre."; this.nameInput.focus(); return; }
    if (password.length < 4) { this.errorDiv.textContent = "La contraseña necesita al menos 4 caracteres."; this.passwordInput.focus(); return; }
    if (this.mode === "create" && !this.selected) { this.errorDiv.textContent = "Elegí una clase."; return; }
    this.resolver({ name, password, mode: this.mode, className: this.mode === "create" ? this.selected! : "" });
    this.hide();
  }

  /** Muestra la pantalla y resuelve con la elección. `errorMsg` se muestra al reintentar. */
  async create(errorMsg = ""): Promise<LoginResult> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.errorDiv.textContent = errorMsg;
      this.passwordInput.value = "";
      this.root.style.display = "flex";
      this.refreshButton();
      setTimeout(() => (this.nameInput.value ? this.passwordInput : this.nameInput).focus(), 50);
    });
  }

  private hide() {
    this.root.style.display = "none";
    this.resolver = null;
  }

  remove() {
    this.root.remove();
  }
}
