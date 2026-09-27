// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { MapPanel } from "./MapPanel.js";

describe("MapPanel (viaje entre mapas)", () => {
  it("un mapa habilitado muestra 'Viajar' y dispara onWarp; el actual muestra 'Aquí'", () => {
    const onWarp = vi.fn();
    const panel = new MapPanel(onWarp);
    panel.mount(document.body);
    panel.toggle(3, "pueblo"); // nivel 3, en el pueblo
    expect(document.body.textContent).toContain("Bosque de Umbra");
    // Bosque (req 1) está habilitado a nivel 3 → botón "Viajar".
    const viajar = [...document.querySelectorAll("button")].find((b) => b.textContent === "Viajar");
    expect(viajar).toBeDefined();
    viajar!.click();
    expect(onWarp).toHaveBeenCalled();
    // El pueblo (actual) muestra "Aquí".
    expect([...document.querySelectorAll("button")].some((b) => b.textContent === "Aquí")).toBe(true);
  });

  it("marca el mapa donde hay una invasión", () => {
    document.body.innerHTML = "";
    const panel = new MapPanel(() => {});
    panel.mount(document.body);
    panel.toggle(25, "pueblo", "marismas");
    const rows = [...document.querySelectorAll("div")].filter((d) => (d.textContent ?? "").startsWith("Marismas del Velo"));
    expect(rows.some((r) => (r.textContent ?? "").includes("⚔ Invasión"))).toBe(true);
    expect(document.body.textContent?.match(/⚔ Invasión/g)).toHaveLength(1);
    expect(document.body.textContent).not.toContain("Castillo del Caos"); // se entra sólo por el evento
  });

  it("un mapa por encima del nivel aparece bloqueado", () => {
    const panel = new MapPanel(() => {});
    panel.mount(document.body);
    panel.toggle(1, "pueblo"); // nivel 1: trono (req 9) bloqueado
    const locked = [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("🔒"));
    expect(locked).toBe(true);
  });
});
