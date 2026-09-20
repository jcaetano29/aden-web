import { CLASSES, CLASS_ORDER } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

/** Acento e ícono por clase para las cards. */
const CLASS_STYLE: Record<string, { accent: string; glyph: string; role: string }> = {
  knight: { accent: "#c9a24b", glyph: "🛡", role: "Tanque — mucha vida y defensa" },
  mage: { accent: "#7fb0ff", glyph: "✷", role: "Daño mágico — mucho MP, frágil" },
  barbarian: { accent: "#e0563f", glyph: "⚔", role: "Daño físico bruto" },
  rogue: { accent: "#6fd06a", glyph: "🗡", role: "Rápido — ataca seguido" },
};

/**
 * Pantalla de creación de personaje: overlay cinematográfico con el nombre del
 * mundo, un campo de nombre y 4 cards de clase (una por clase). Reemplaza al
 * viejo `prompt()` nativo. `create()` resuelve a { name, className } cuando el
 * jugador confirma con "Entrar a Aden".
 */
export class ClassSelect {
  private readonly root: HTMLDivElement;
  private resolver: ((v: { name: string; className: string; password: string }) => void) | null = null;
  private selected: string | null = null;
  private readonly cards = new Map<string, HTMLDivElement>();
  private readonly nameInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly errorDiv: HTMLDivElement;
  private readonly enterBtn: HTMLButtonElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;align-items:center;" +
      "pointer-events:auto;z-index:2000;gap:18px;padding:32px;overflow-y:auto;" +
      "background:radial-gradient(120% 90% at 50% -10%, #241706 0%, #0c0a07 55%, #050403 100%);" +
      `font-family:${FONT_BODY};color:${COLORS.text};`;
    this.root.className = "aden-scroll";

    const eyebrow = document.createElement("div");
    eyebrow.textContent = "EL ASEDIO DE ADEN";
    eyebrow.style.cssText = `font-family:${FONT_DISPLAY};letter-spacing:5px;font-size:13px;color:${COLORS.gold};text-shadow:0 1px 3px #000;`;

    const title = document.createElement("h1");
    title.textContent = "ADEN";
    title.className = "aden-title";
    title.style.cssText +=
      "font-size:64px;letter-spacing:10px;margin:0;text-align:center;line-height:1;";
    const rule = document.createElement("div");
    rule.style.cssText = `height:2px;width:200px;background:linear-gradient(90deg,transparent,${COLORS.gold},transparent);margin:2px 0 6px;`;

    const subtitle = document.createElement("div");
    subtitle.textContent = "Forjá tu héroe y defendé el reino de los no-muertos.";
    subtitle.style.cssText = `font-style:italic;font-size:16px;color:${COLORS.parchment};text-align:center;`;

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
    // Campo de contraseña (la cuenta = tu nombre; protege tu progreso).
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
    const hint = document.createElement("div");
    hint.textContent = "Con nombre nuevo se crea tu cuenta. Con uno existente, entrás con tu contraseña.";
    hint.style.cssText = `font-size:11px;color:${COLORS.textDim};max-width:300px;text-align:center;line-height:1.3;`;
    this.errorDiv = document.createElement("div");
    this.errorDiv.style.cssText = `min-height:16px;font-size:13px;color:#ff6b6b;font-weight:600;text-align:center;`;
    nameWrap.append(nameLabel, this.nameInput, passLabel, this.passwordInput, hint, this.errorDiv);

    const pickLabel = document.createElement("div");
    pickLabel.textContent = "ELEGÍ TU CLASE";
    pickLabel.style.cssText = `font-family:${FONT_DISPLAY};font-size:11px;letter-spacing:3px;color:${COLORS.textDim};margin-top:8px;`;

    const cardContainer = document.createElement("div");
    cardContainer.style.cssText =
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

      card.addEventListener("mouseenter", () => {
        if (this.selected !== classId) card.style.transform = "translateY(-3px)";
      });
      card.addEventListener("mouseleave", () => {
        if (this.selected !== classId) card.style.transform = "translateY(0)";
      });
      card.addEventListener("click", () => this.selectCard(classId, st.accent));

      this.cards.set(classId, card);
      cardContainer.appendChild(card);
    }

    this.enterBtn = document.createElement("button");
    this.enterBtn.textContent = "Entrar a Aden";
    applyButton(this.enterBtn);
    this.enterBtn.style.marginTop = "8px";
    this.enterBtn.style.padding = "12px 34px";
    this.enterBtn.style.fontSize = "18px";
    this.enterBtn.disabled = true;
    this.enterBtn.style.opacity = "0.5";
    this.enterBtn.style.cursor = "not-allowed";
    this.enterBtn.addEventListener("click", () => this.confirm());
    const onEnter = (e: KeyboardEvent) => { if (e.key === "Enter" && this.selected) this.confirm(); };
    this.nameInput.addEventListener("keydown", onEnter);
    this.passwordInput.addEventListener("keydown", onEnter);

    this.root.append(eyebrow, title, rule, subtitle, nameWrap, pickLabel, cardContainer, this.enterBtn);
    parent.appendChild(this.root);
  }

  private selectCard(classId: string, accent: string): void {
    this.selected = classId;
    for (const [id, card] of this.cards) {
      const active = id === classId;
      card.style.transform = active ? "translateY(-4px) scale(1.02)" : "translateY(0)";
      card.style.boxShadow = active
        ? `0 10px 34px rgba(0,0,0,0.66), 0 0 0 2px ${accent}, 0 0 22px ${accent}66`
        : "";
    }
    this.enterBtn.disabled = false;
    this.enterBtn.style.opacity = "1";
    this.enterBtn.style.cursor = "pointer";
  }

  private confirm(): void {
    if (!this.selected || !this.resolver) return;
    const name = this.nameInput.value.trim() || "Adventurer";
    const password = this.passwordInput.value;
    if (password.length < 4) {
      this.errorDiv.textContent = "La contraseña necesita al menos 4 caracteres.";
      this.passwordInput.focus();
      return;
    }
    this.resolver({ name, className: this.selected, password });
    this.hide();
  }

  /**
   * Muestra la pantalla y resuelve con nombre + clase + contraseña. `errorMsg`
   * muestra un error arriba del botón (p.ej. "Contraseña incorrecta") al reintentar.
   */
  async create(errorMsg = ""): Promise<{ name: string; className: string; password: string }> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.errorDiv.textContent = errorMsg;
      this.passwordInput.value = "";
      this.root.style.display = "flex";
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
