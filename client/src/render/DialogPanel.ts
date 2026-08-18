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
    panel.style.cssText =
      "background:rgba(20,15,10,0.95);border:2px solid #8b7355;border-radius:8px;" +
      "padding:16px;box-shadow:0 4px 16px rgba(0,0,0,0.8);";

    // Header con el nombre del hablante
    this.speakerName = document.createElement("div");
    this.speakerName.style.cssText =
      "color:#ffd98a;font-weight:bold;font-size:14px;margin-bottom:8px;" +
      "text-shadow:0 1px 3px rgba(0,0,0,0.8);";
    panel.appendChild(this.speakerName);

    // Cuerpo del texto
    this.textBody = document.createElement("div");
    this.textBody.style.cssText =
      "color:#e0d5c8;font-size:14px;line-height:1.5;margin-bottom:12px;" +
      "white-space:pre-wrap;text-align:left;";
    panel.appendChild(this.textBody);

    // Botón de acción
    this.actionButton = document.createElement("button");
    this.actionButton.style.cssText =
      "padding:8px 16px;background:#ffd98a;color:#1a1410;border:none;" +
      "border-radius:4px;font:bold 13px sans-serif;cursor:pointer;pointer-events:auto;" +
      "transition:all 0.2s;";

    this.actionButton.addEventListener("mouseenter", () => {
      this.actionButton.style.background = "#ffe4b3";
    });
    this.actionButton.addEventListener("mouseleave", () => {
      this.actionButton.style.background = "#ffd98a";
    });

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
