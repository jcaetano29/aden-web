// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { BossBar } from "./BossBar.js";

/** El root es el primer hijo que agrega BossBar al montar en document.body. */
function rootOf(): HTMLElement {
  return document.body.lastElementChild as HTMLElement;
}

describe("BossBar", () => {
  it("oculta si no hay jefe o si está intacto (idle)", () => {
    const bar = new BossBar(document.body);
    const root = rootOf();
    bar.update(null, 60000);
    expect(root.style.display).toBe("none");
    bar.update({ name: "Rey Nihil", hp: 100, maxHp: 100, dead: false }, 60000);
    expect(root.style.display).toBe("none"); // intacto → oculto
  });

  it("muestra la barra cuando el jefe está siendo peleado (HP < máx)", () => {
    const bar = new BossBar(document.body);
    const root = rootOf();
    bar.update({ name: "Rey Nihil", hp: 400, maxHp: 1000, dead: false }, 60000);
    expect(root.style.display).toBe("");
    expect(root.textContent).toContain("Rey Nihil");
    expect(root.textContent).toContain("400 / 1000");
  });

  it("muestra un contador de reaparición cuando el jefe está muerto", () => {
    const bar = new BossBar(document.body);
    const root = rootOf();
    bar.update({ name: "Rey Nihil", hp: 0, maxHp: 1000, dead: true }, 60000);
    expect(root.style.display).toBe("");
    expect(root.textContent).toContain("Renace en");
  });
});
