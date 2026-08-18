import { CLASSES, CLASS_ORDER } from "@aden/shared";

/**
 * Selector de clase: overlay fullscreen con 4 cards (una por clase).
 * Cada card muestra el nombre, un hint de rol, y es clickeable.
 * `select()` devuelve una Promise que resuelve al className elegido.
 */
export class ClassSelect {
  private readonly root: HTMLDivElement;
  private resolver: ((className: string) => void) | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;" +
      "justify-content:center;align-items:center;pointer-events:auto;z-index:2000;" +
      "gap:20px;padding:40px;font:16px sans-serif;color:#fff;text-shadow:0 0 3px #000;";

    const title = document.createElement("h1");
    title.textContent = "Elige tu clase";
    title.style.cssText = "margin:0;font-size:32px;margin-bottom:20px;text-align:center;";
    this.root.appendChild(title);

    const cardContainer = document.createElement("div");
    cardContainer.style.cssText =
      "display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:900px;width:100%;";

    // Crear una card por clase
    for (const classId of CLASS_ORDER) {
      const classDef = CLASSES[classId];
      if (!classDef) continue;

      const card = document.createElement("div");
      card.style.cssText =
        "background:rgba(40,40,50,0.95);border:2px solid #555;border-radius:8px;" +
        "padding:20px;cursor:pointer;transition:all 0.2s;text-align:center;" +
        "min-height:140px;display:flex;flex-direction:column;justify-content:center;";

      const cardTitle = document.createElement("div");
      cardTitle.textContent = classDef.name;
      cardTitle.style.cssText = "font-size:20px;font-weight:bold;margin-bottom:8px;";

      const cardDesc = document.createElement("div");
      cardDesc.style.cssText = "font-size:14px;color:#aaa;";

      // Hint de rol
      if (classId === "knight") {
        cardDesc.textContent = "Tanque — mucha vida y defensa";
      } else if (classId === "mage") {
        cardDesc.textContent = "Daño mágico — mucho MP, frágil";
      } else if (classId === "barbarian") {
        cardDesc.textContent = "Daño físico bruto";
      } else if (classId === "rogue") {
        cardDesc.textContent = "Rápido — ataca seguido";
      }

      card.appendChild(cardTitle);
      card.appendChild(cardDesc);

      card.addEventListener("mouseenter", () => {
        card.style.background = "rgba(60,60,80,0.95)";
        card.style.borderColor = "#fff";
        card.style.transform = "scale(1.05)";
      });

      card.addEventListener("mouseleave", () => {
        card.style.background = "rgba(40,40,50,0.95)";
        card.style.borderColor = "#555";
        card.style.transform = "scale(1)";
      });

      card.addEventListener("click", () => {
        if (this.resolver) {
          this.resolver(classId);
          this.hide();
        }
      });

      cardContainer.appendChild(card);
    }

    this.root.appendChild(cardContainer);
    parent.appendChild(this.root);
  }

  /**
   * Muestra el selector y devuelve una Promise que resuelve al className elegido.
   */
  async select(): Promise<string> {
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
