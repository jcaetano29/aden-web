// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { createItemInstance, getItem } from "@aden/shared";
import { InventoryPanel } from "./InventoryPanel.js";

afterEach(() => { document.body.innerHTML = ""; });

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

  it("describe requisitos y opciones de un ejemplar excelente", () => {
    const base = getItem("aden_punal_del_umbral");
    const id = createItemInstance(base, {
      quality: "excellent", level: 3, luck: true, skill: true, additional: 4, excellent: [0],
    }, "ui-test");
    const panel = new InventoryPanel(document.body);
    panel.toggle();
    panel.update(view({
      className: "knight",
      level: 20,
      entries: [{ itemTemplateId: id, qty: 1, name: getItem(id).name }],
    }));

    const text = document.body.textContent ?? "";
    expect(text).toContain("Excelente");
    expect(text).toContain("1 mano");
    expect(text).toContain("Caballero");
    expect(text).toContain("Suerte");
    expect(text).toContain("Habilidad");
    expect(text).toContain("Adicional +4");
    expect(text).toContain("Golpe excelente +10%");
    expect(text).toContain(base.description);
  });

  it("deshabilita equipo incompatible y explica el requisito", () => {
    const panel = new InventoryPanel(document.body);
    panel.toggle();
    panel.update(view({
      className: "mage",
      level: 2,
      entries: [{ itemTemplateId: "aden_aguja_de_la_frontera", qty: 1, name: "Aguja de la Frontera" }],
    }));

    const button = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Equipar"));
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain("Mago");
  });

  it("usa una joya sobre un ejemplar elegido del inventario o equipo", () => {
    const onUseItem = vi.fn();
    const panel = new InventoryPanel(document.body, { onUseItem });
    panel.toggle();
    panel.update(view({
      className: "knight",
      level: 20,
      equipment: { weapon: "iron_sword" },
      entries: [
        { itemTemplateId: "aden_gema_del_pacto", qty: 1, name: "Gema del Pacto" },
        { itemTemplateId: "aden_punal_del_umbral", qty: 1, name: "Puñal del Umbral" },
      ],
    }));

    const select = document.querySelector<HTMLSelectElement>("select[data-jewel-target]")!;
    expect(select.style.pointerEvents).toBe("auto");
    expect([...select.options].map((option) => option.value)).toEqual([
      "aden_punal_del_umbral", "iron_sword",
    ]);
    select.value = "iron_sword";
    [...document.querySelectorAll("button")].find((b) => b.textContent === "Usar")!.click();
    expect(onUseItem).toHaveBeenCalledWith("aden_gema_del_pacto", "iron_sword");
  });

  it("no ofrece usar materiales ni munición", () => {
    const panel = new InventoryPanel(document.body);
    panel.toggle();
    panel.update(view({
      entries: [{ itemTemplateId: "aden_astiles_del_bosque_gris", qty: 20, name: "Astiles del Bosque Gris" }],
    }));
    expect([...document.querySelectorAll("button")].some((button) => button.textContent === "Usar")).toBe(false);
  });

  it("muestra cuántas piezas del conjunto están equipadas", () => {
    const panel = new InventoryPanel(document.body);
    panel.toggle();
    panel.update(view({
      equipment: {
        helmet: "aden_yelmo_de_la_senda_del_alba",
        armor: "aden_coraza_de_la_senda_del_alba",
      },
    }));
    expect(document.body.textContent).toContain("Conjunto aden la senda del alba: 2 piezas");
  });
});
