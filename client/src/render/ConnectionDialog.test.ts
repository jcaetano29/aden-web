// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionDialog } from "./ConnectionDialog.js";

const dialogs: ConnectionDialog[] = [];

function createDialog(onReturn = vi.fn(), parent?: HTMLElement): ConnectionDialog {
  const dialog = new ConnectionDialog(onReturn, parent);
  dialogs.push(dialog);
  return dialog;
}

afterEach(() => {
  for (const dialog of dialogs.splice(0)) dialog.dispose();
  document.body.innerHTML = "";
});

describe("ConnectionDialog", () => {
  it("shows the persistent disconnected message as an accessible focused modal", () => {
    const dialog = createDialog();

    dialog.show("disconnected");

    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const title = document.querySelector<HTMLElement>("#connection-dialog-title")!;
    const button = document.querySelector<HTMLButtonElement>("button")!;
    expect(dialog.isOpen).toBe(true);
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(modal.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.textContent).toBe("Se perdió la conexión");
    expect(modal.textContent).toContain("La partida dejó de recibir datos del servidor. Volvé a entrar para continuar con el progreso disponible.");
    expect(button.textContent).toBe("Volver al acceso");
    expect(document.activeElement).toBe(button);

    button.blur();
    const backdropPointer = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    modal.dispatchEvent(backdropPointer);
    expect(backdropPointer.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(dialog.isOpen).toBe(true);
  });

  it("uses the unavailable copy and invokes the return callback only once", () => {
    const onReturn = vi.fn();
    const parent = document.createElement("section");
    document.body.appendChild(parent);
    const dialog = createDialog(onReturn, parent);

    dialog.show("unavailable");
    const modal = parent.querySelector<HTMLElement>('[role="dialog"]')!;
    const button = parent.querySelector<HTMLButtonElement>("button")!;
    expect(modal.textContent).toContain("Servidor no disponible");
    expect(modal.textContent).toContain("No se pudo conectar al servidor del juego. Reintentá cuando vuelva a estar disponible.");
    expect(button.textContent).toBe("Reintentar");

    button.click();
    button.click();
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it.each(["Enter", " "])("activates the focused action with %j", (key) => {
    const onReturn = vi.fn();
    const dialog = createDialog(onReturn);
    dialog.show("disconnected");

    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("dispose removes the modal and its document keyboard guard", () => {
    const dialog = createDialog();
    dialog.show("disconnected");
    dialog.dispose();

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(dialog.isOpen).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(tab.defaultPrevented).toBe(false);
  });
});
