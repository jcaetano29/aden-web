import { LORE } from "@aden/shared";

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
      "position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;flex-direction:column;" +
      "justify-content:center;align-items:center;pointer-events:auto;z-index:2000;" +
      "padding:40px;font:16px sans-serif;color:#fff;";

    // Panel de contenido (fondo oscuro/parchment)
    const panel = document.createElement("div");
    panel.style.cssText =
      "background:rgba(30,20,10,0.95);border:3px solid #8b7355;border-radius:12px;" +
      "padding:40px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;" +
      "box-shadow:0 0 30px rgba(0,0,0,0.8);";

    // Título
    const title = document.createElement("h1");
    title.textContent = LORE.title;
    title.style.cssText =
      "margin:0 0 24px 0;font-size:32px;font-weight:bold;text-align:center;" +
      "color:#ffd98a;text-shadow:0 2px 6px rgba(0,0,0,0.8);";
    panel.appendChild(title);

    // Cuerpo: dividir por párrafos "\n\n"
    const bodyContainer = document.createElement("div");
    bodyContainer.style.cssText =
      "margin-bottom:24px;line-height:1.6;color:#e0d5c8;";

    const paragraphs = LORE.body.split("\n\n");
    for (const text of paragraphs) {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.cssText =
        "margin:0 0 12px 0;font-size:15px;text-align:justify;white-space:pre-wrap;";
      bodyContainer.appendChild(p);
    }
    panel.appendChild(bodyContainer);

    // Botón "Comenzar"
    const button = document.createElement("button");
    button.textContent = "Comenzar";
    button.style.cssText =
      "width:100%;padding:12px 24px;background:#ffd98a;color:#1a1410;border:none;" +
      "border-radius:6px;font:bold 16px sans-serif;cursor:pointer;pointer-events:auto;" +
      "transition:all 0.2s;box-shadow:0 4px 12px rgba(255,217,138,0.3);";

    button.addEventListener("mouseenter", () => {
      button.style.background = "#ffe4b3";
      button.style.transform = "scale(1.05)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = "#ffd98a";
      button.style.transform = "scale(1)";
    });

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
