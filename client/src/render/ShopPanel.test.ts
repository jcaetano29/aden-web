// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ShopPanel } from "./ShopPanel.js";

afterEach(() => { document.body.innerHTML = ""; });

describe("ShopPanel catalog", () => {
  it("filtra un catálogo grande y muestra clase, nivel y descripción accesible", () => {
    const panel = new ShopPanel(() => {}, {
      parent: document.body,
      stock: ["aden_punal_del_umbral", "aden_baston_del_huesero", "aden_tomo_del_orbe_arcano"],
    });
    panel.open();

    const search = document.querySelector<HTMLInputElement>("input[type=search]")!;
    search.value = "huesero";
    search.dispatchEvent(new Event("input"));

    expect(document.body.textContent).toContain("Bastón del Huesero");
    expect(document.body.textContent).not.toContain("Puñal del Umbral");
    expect(document.body.textContent).toContain("Mago");
    const item = document.querySelector<HTMLElement>("[data-shop-item]")!;
    expect(item.title).toContain("magos");
    const list = document.querySelector<HTMLElement>("[data-shop-list]")!;
    expect(list.style.overflowY).toBe("auto");
    search.value = "orbe";
    search.dispatchEvent(new Event("input"));
    expect(document.body.textContent).not.toContain("Tomo del Orbe Arcano"); // Earned by adventuring, not sold.
  });
});
