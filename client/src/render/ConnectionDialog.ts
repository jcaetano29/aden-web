import "./ConnectionDialog.css";

export type ConnectionDialogKind = "disconnected" | "unavailable";

const COPY: Record<ConnectionDialogKind, { title: string; message: string; action: string }> = {
  disconnected: {
    title: "Se perdió la conexión",
    message: "La partida dejó de recibir datos del servidor. Volvé a entrar para continuar con el progreso disponible.",
    action: "Volver al acceso",
  },
  unavailable: {
    title: "Servidor no disponible",
    message: "No se pudo conectar al servidor del juego. Reintentá cuando vuelva a estar disponible.",
    action: "Reintentar",
  },
};

export class ConnectionDialog {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly message: HTMLParagraphElement;
  private readonly button: HTMLButtonElement;
  private open = false;
  private activated = false;
  private disposed = false;

  constructor(
    private readonly onReturn: () => void,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement("div");
    this.root.className = "connection-dialog";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-labelledby", "connection-dialog-title");
    this.root.hidden = true;

    const panel = document.createElement("div");
    panel.className = "connection-dialog__panel aden-panel";

    this.title = document.createElement("h1");
    this.title.id = "connection-dialog-title";
    this.title.className = "connection-dialog__title aden-title";

    this.message = document.createElement("p");
    this.message.className = "connection-dialog__message";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "connection-dialog__action aden-btn";
    this.button.addEventListener("click", this.activate);
    this.root.addEventListener("pointerdown", this.keepBackdropFocus);

    panel.append(this.title, this.message, this.button);
    this.root.appendChild(panel);
    parent.appendChild(this.root);
    document.addEventListener("keydown", this.guardKeyboard, true);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(kind: ConnectionDialogKind): void {
    if (this.disposed) return;
    const copy = COPY[kind];
    this.title.textContent = copy.title;
    this.message.textContent = copy.message;
    this.button.textContent = copy.action;
    this.button.disabled = false;
    this.activated = false;
    this.root.hidden = false;
    this.open = true;
    this.button.focus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.open = false;
    document.removeEventListener("keydown", this.guardKeyboard, true);
    this.button.removeEventListener("click", this.activate);
    this.root.removeEventListener("pointerdown", this.keepBackdropFocus);
    this.root.remove();
  }

  private readonly activate = (): void => {
    if (!this.open || this.activated) return;
    this.activated = true;
    this.button.disabled = true;
    this.onReturn();
  };

  private readonly keepBackdropFocus = (event: PointerEvent): void => {
    if (!this.open || event.target !== this.root) return;
    event.preventDefault();
    this.button.focus();
  };

  private readonly guardKeyboard = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.button.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (document.activeElement === this.button) this.activate();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };
}
