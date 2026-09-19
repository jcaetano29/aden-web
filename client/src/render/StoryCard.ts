import { LORE } from "@aden/shared";
import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

/**
 * StoryCard: overlay fullscreen con la premisa narrativa (LORE).
 * Muestra un panel centrado con título, cuerpo narrativo y botón "Comenzar".
 * `show()` devuelve una Promise que resuelve cuando el jugador hace clic.
 */
export class StoryCard {
  private readonly root: HTMLDivElement;
  private resolver: (() => void) | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;inset:0;display:none;flex-direction:column;" +
      "justify-content:center;align-items:center;pointer-events:auto;z-index:2000;padding:40px;" +
      "background:radial-gradient(120% 90% at 50% -10%, #201406 0%, rgba(6,5,3,0.94) 60%, rgba(3,2,1,0.97) 100%);" +
      `font-family:${FONT_BODY};color:${COLORS.text};`;

    // Panel de contenido (pergamino de piedra).
    const panel = document.createElement("div");
    panel.className = "aden-panel aden-scroll aden-fadein";
    panel.style.cssText =
      "padding:44px 40px;max-width:600px;width:100%;max-height:82vh;overflow-y:auto;";

    // Título
    const title = document.createElement("h1");
    title.textContent = LORE.title;
    title.className = "aden-title";
    title.style.cssText += "margin:0 0 6px 0;font-size:34px;text-align:center;";

    const rule = document.createElement("div");
    rule.style.cssText = `height:2px;width:180px;margin:0 auto 24px;background:linear-gradient(90deg,transparent,${COLORS.gold},transparent);`;
    panel.append(title, rule);

    // Cuerpo: dividir por párrafos "\n\n"
    const bodyContainer = document.createElement("div");
    bodyContainer.style.cssText = `margin-bottom:28px;line-height:1.7;color:${COLORS.parchment};`;

    const paragraphs = LORE.body.split("\n\n");
    for (const text of paragraphs) {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.cssText =
        "margin:0 0 14px 0;font-size:17px;text-align:justify;white-space:pre-wrap;";
      bodyContainer.appendChild(p);
    }
    panel.appendChild(bodyContainer);

    // Botón "Comenzar"
    const button = document.createElement("button");
    button.textContent = "Comenzar la travesía";
    applyButton(button);
    button.style.width = "100%";
    button.style.padding = "13px 24px";
    button.style.fontSize = "17px";

    button.addEventListener("click", () => {
      if (this.resolver) {
        this.resolver();
        this.hide();
      }
    });

    panel.appendChild(button);
    this.root.appendChild(panel);
    parent.appendChild(this.root);
  }

  /**
   * Muestra la StoryCard y devuelve una Promise que resuelve al hacer clic en "Comenzar".
   */
  async show(): Promise<void> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.root.style.display = "flex";
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
