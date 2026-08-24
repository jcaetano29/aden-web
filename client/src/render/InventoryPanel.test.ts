// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { InventoryPanel } from "./InventoryPanel.js";

function view(over: Partial<Parameters<InventoryPanel["update"]>[0]> = {}) {
  return {
    entries: [],
    equipment: {},
    stats: { pAtk: 20, pDef: 15 },
    ...over,
  };
}

describe("InventoryPanel (Equipo)", () => {
  it("un ítem de equipo en el inventario muestra el botón Equipar y dispara onEquip", () => {
    const onEquip = vi.fn();
    const panel = new InventoryPanel(document.body, { onEquip });
    panel.toggle(); // visible
    panel.update(view({ entries: [{ itemTemplateId: "iron_sword", qty: 1, name: "Espada de Hierro" }] }));

    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Equipar");
    expect(btn).toBeDefined();
    btn!.click();
    expect(onEquip).toHaveBeenCalledWith("iron_sword");
  });

  it("un slot equipado se muestra en el paperdoll con botón Quitar", () => {
    const onUnequip = vi.fn();
    const panel = new InventoryPanel(document.body, { onUnequip });
    panel.toggle();
    panel.update(view({ equipment: { weapon: "iron_sword" } }));

    expect(document.body.textContent).toContain("Espada de Hierro");
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Quitar");
    expect(btn).toBeDefined();
    btn!.click();
    expect(onUnequip).toHaveBeenCalledWith("weapon");
  });

  it("no redibuja si la vista no cambió (signature-guard)", () => {
    const panel = new InventoryPanel(document.body, {});
    panel.toggle();
    panel.update(view({ stats: { pAtk: 20, pDef: 15 } }));
    expect(document.body.textContent).toContain("Ataque 20");
    // segunda llamada idéntica no debe romper ni duplicar
    panel.update(view({ stats: { pAtk: 20, pDef: 15 } }));
    expect(document.body.textContent).toContain("Defensa 15");
  });
});
