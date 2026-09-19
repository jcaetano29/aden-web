import { COLORS, FONT_DISPLAY, FONT_BODY, applyButton } from "./theme.js";

/**
 * DialogPanel: caja de diálogo RPG estilo, fija en la parte inferior-centro.
 * Muestra nombre del hablante, texto, y botón de acción.
 */
export class DialogPanel {
  private readonly root: HTMLDivElement;
  private readonly speakerName: HTMLDivElement;
  private readonly textBody: HTMLDivElement;
  private readonly actionButton: HTMLButtonElement;
  private currentAction: (() => void) | null = null;
  private visible = false;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.style.cssText =
      "position:fixed;bottom:150px;left:50%;transform:translateX(-50%);" +
      "display:none;pointer-events:none;z-index:1100;max-width:600px;width:100%;padding:0 20px;";

    // Panel principal
    const panel = document.createElement("div");
    panel.className = "aden-panel aden-fadein";
    panel.style.cssText = "padding:18px 20px;border-left:3px solid " + COLORS.gold + ";";

    // Header con el nombre del hablante
    this.speakerName = document.createElement("div");
    this.speakerName.style.cssText =
      `color:${COLORS.goldBright};font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;` +
      "letter-spacing:0.5px;margin-bottom:9px;text-shadow:0 1px 3px rgba(0,0,0,0.9);";
    panel.appendChild(this.speakerName);

    // Cuerpo del texto
    this.textBody = document.createElement("div");
    this.textBody.style.cssText =
      `color:${COLORS.parchment};font-family:${FONT_BODY};font-size:16px;line-height:1.55;margin-bottom:14px;` +
      "white-space:pre-wrap;text-align:left;";
    panel.appendChild(this.textBody);

    // Botón de acción
    this.actionButton = document.createElement("button");
    applyButton(this.actionButton);
    this.actionButton.style.fontSize = "14px";

    this.actionButton.addEventListener("click", () => {
      if (this.currentAction) {
        this.currentAction();
      }
      this.close();
    });

    panel.appendChild(this.actionButton);
    this.root.appendChild(panel);
    parent.appendChild(this.root);
  }

  /**
   * Abre el diálogo con el contenido especificado.
   */
  open(opts: {
    speaker: string;
    text: string;
    actionLabel: string;
    onAction: () => void;
  }): void {
    if (this.visible) return;

    this.speakerName.textContent = opts.speaker;
    this.textBody.textContent = opts.text;
    this.actionButton.textContent = opts.actionLabel;
    this.currentAction = opts.onAction;

    this.visible = true;
    this.root.style.display = "";
    this.root.style.pointerEvents = "auto";
  }

  /**
   * Cierra el diálogo.
   */
  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.root.style.display = "none";
    this.root.style.pointerEvents = "none";
    this.currentAction = null;
  }

  /**
   * Devuelve si el diálogo está abierto.
   */
  isOpen(): boolean {
    return this.visible;
  }

  remove() {
    this.root.remove();
  }
}
