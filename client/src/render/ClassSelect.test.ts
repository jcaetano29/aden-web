// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ClassSelect } from "./ClassSelect.js";

afterEach(() => { document.body.innerHTML = ""; });

function fields() {
  return {
    name: document.querySelector<HTMLInputElement>('input[type="text"]')!,
    password: document.querySelector<HTMLInputElement>('input[type="password"]')!,
    enter: document.querySelector<HTMLButtonElement>('.character-enter')!,
    error: document.querySelector<HTMLElement>('.character-error')!,
    root: document.querySelector<HTMLElement>('.character-select')!,
  };
}

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

  it("confirma login con los valores actuales aunque autofill no emita input", async () => {
    const select = new ClassSelect(document.body);
    const result = select.create();
    const { name, password, enter, root } = fields();

    name.value = '  AutofillTemporal  ';
    password.value = 'prueba123';
    expect(enter.disabled).toBe(false);
    expect(enter.hasAttribute('aria-disabled')).toBe(false);
    enter.click();

    expect(root.hidden).toBe(true);
    expect(await result).toMatchObject({ name: 'AutofillTemporal', password: 'prueba123', mode: 'login', className: '' });
    select.remove();
  });

  it("confirma creación con los valores actuales y conserva clase y apariencia", async () => {
    const select = new ClassSelect(document.body);
    const result = select.create();
    [...document.querySelectorAll('button')].find(button => button.textContent === 'Crear personaje')!.click();
    document.querySelector<HTMLInputElement>('input[value="female"]')!.click();
    document.querySelector<HTMLElement>('[data-class="ranger"]')!.click();
    const { name, password, enter } = fields();

    name.value = 'Lira';
    password.value = 'arco1234';
    enter.click();

    expect(await result).toMatchObject({ name: 'Lira', mode: 'create', className: 'ranger', gender: 'female' });
    select.remove();
  });

  it.each([
    ['   ', 'prueba123', 'nombre'],
    ['Aela', '123', '4 caracteres'],
  ])("mantiene el formulario abierto para nombre %j y contraseña %j", (nameValue, passwordValue, feedback) => {
    const select = new ClassSelect(document.body);
    void select.create();
    const { name, password, enter, error, root } = fields();

    name.value = nameValue;
    password.value = passwordValue;
    enter.click();

    expect(root.hidden).toBe(false);
    expect(error.textContent).toContain(feedback);
    select.remove();
  });

  it.each([
    ['change', (name: HTMLInputElement) => name.dispatchEvent(new Event('change'))],
    ['pageshow', () => window.dispatchEvent(new Event('pageshow'))],
    ['focus', () => window.dispatchEvent(new Event('focus'))],
  ])("%s refresca el feedback con los valores actuales", (_eventName, refresh) => {
    const select = new ClassSelect(document.body);
    void select.create();
    const { name, password, enter, error } = fields();
    enter.click();
    expect(error.textContent).toContain('nombre');

    name.value = 'AutofillTemporal';
    password.value = 'prueba123';
    refresh(name);

    expect(error.textContent).toBe('');
    select.remove();
  });

  it("ignora un segundo submit después de resolver", async () => {
    const select = new ClassSelect(document.body);
    let resolutions = 0;
    const result = select.create().then(value => { resolutions += 1; return value; });
    const { name, password, enter } = fields();
    name.value = 'Primero'; password.value = 'prueba123';

    enter.click();
    name.value = 'Segundo';
    enter.click();

    expect((await result).name).toBe('Primero');
    await Promise.resolve();
    expect(resolutions).toBe(1);
    select.remove();
  });

  it("remove retira los refrescos globales de pageshow y focus", () => {
    const select = new ClassSelect(document.body);
    void select.create();
    const { name, password, enter, error } = fields();
    enter.click();
    expect(error.textContent).toContain('nombre');

    select.remove();
    name.value = 'AutofillTemporal';
    password.value = 'prueba123';
    window.dispatchEvent(new Event('pageshow'));
    window.dispatchEvent(new Event('focus'));

    expect(error.textContent).toContain('nombre');
  });
});
