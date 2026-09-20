// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ClassSelect } from "./ClassSelect.js";

afterEach(() => { document.body.innerHTML = ""; });

describe("ClassSelect", () => {
  it("presenta Explorador como clase arquera al crear personaje", () => {
    const select = new ClassSelect(document.body);
    [...document.querySelectorAll("button")].find((button) => button.textContent === "Crear personaje")!.click();

    expect(document.body.textContent).toContain("Explorador");
    expect(document.body.textContent).toContain("Ataque a distancia");
    select.remove();
  });
});
