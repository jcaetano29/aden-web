// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ClassSelect } from "./ClassSelect.js";

afterEach(() => { document.body.innerHTML = ""; });

describe("ClassSelect", () => {
  it.each(['knight', 'mage', 'barbarian', 'rogue', 'ranger'])("envía la apariencia femenina al crear %s", async (classId) => {
    const select = new ClassSelect(document.body);
    const result = select.create();
    [...document.querySelectorAll('button')].find(b => b.textContent === 'Crear personaje')!.click();
    const female = document.querySelector<HTMLInputElement>('input[value="female"]');
    expect(female).not.toBeNull();
    female!.click();
    document.querySelector<HTMLElement>(`[data-class="${classId}"]`)!.click();
    const name = document.querySelector<HTMLInputElement>('input[type="text"]')!;
    const pass = document.querySelector<HTMLInputElement>('input[type="password"]')!;
    name.value = 'Aela'; pass.value = 'clave123';
    name.dispatchEvent(new Event('input')); pass.dispatchEvent(new Event('input'));
    [...document.querySelectorAll('button')].filter(b => b.textContent === 'Crear personaje').at(-1)!.click();
    expect(await result).toMatchObject({ className: classId, gender: 'female', mode: 'create' });
    select.remove();
  });
  it("presenta Explorador como clase arquera al crear personaje", () => {
    const select = new ClassSelect(document.body);
    [...document.querySelectorAll("button")].find((button) => button.textContent === "Crear personaje")!.click();

    expect(document.body.textContent).toContain("Explorador");
    expect(document.body.textContent).toContain("Ataque a distancia");
    select.remove();
  });
});
