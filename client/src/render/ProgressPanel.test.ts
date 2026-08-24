// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { ProgressPanel } from "./ProgressPanel.js";

function view(over: Partial<Parameters<ProgressPanel["update"]>[0]> = {}) {
  return {
    loginStreak: 3,
    dailyQuestId: "d_hunt",
    dailyProgress: 4,
    dailyDone: false,
    totalKills: 12,
    title: "",
    achievements: [] as string[],
    ...over,
  };
}

describe("ProgressPanel", () => {
  it("muestra la racha y la misión diaria cuando está visible", () => {
    const panel = new ProgressPanel(() => {});
    panel.mount(document.body);
    panel.setVisible(true);
    panel.update(view());
    expect(document.body.textContent).toContain("Racha de login");
    expect(document.body.textContent).toContain("3");
    expect(document.body.textContent).toContain("Caza del día"); // desc de d_hunt
  });

  it("un logro desbloqueado con título ofrece 'Lucir' y dispara onSetTitle", () => {
    const onSetTitle = vi.fn();
    const panel = new ProgressPanel(onSetTitle);
    panel.mount(document.body);
    panel.setVisible(true);
    panel.update(view({ achievements: ["first_blood"], title: "" }));

    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Lucir");
    expect(btn).toBeDefined();
    btn!.click();
    expect(onSetTitle).toHaveBeenCalledWith("Novato");
  });

  it("oculto no renderiza (update es no-op)", () => {
    const panel = new ProgressPanel(() => {});
    panel.mount(document.body);
    // sin setVisible(true): no debe volcar contenido dinámico
    panel.update(view({ loginStreak: 99 }));
    expect(document.body.textContent).not.toContain("99");
  });
});
