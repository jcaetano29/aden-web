// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillBar } from "./SkillBar.js";

afterEach(() => { document.body.innerHTML = ""; });

describe("SkillBar", () => {
  it("permite usar por click skills posteriores al sexto slot", () => {
    const onUse = vi.fn();
    const bar = new SkillBar(onUse);
    const ids = ["fireball", "ice_lance", "arcane_mend", "blink", "frost_nova", "meteor", "tome_energy_ball"];
    bar.setSkills(ids);

    const slots = document.querySelectorAll<HTMLButtonElement>("[data-skill-id]");
    expect(slots).toHaveLength(7);
    slots[6].click();
    expect(onUse).toHaveBeenCalledWith("tome_energy_ball");
    expect(slots[6].textContent).not.toContain("7");
  });

  it("limita la barra al viewport y habilita desplazamiento horizontal", () => {
    const bar = new SkillBar();
    bar.setSkills(["fireball", "ice_lance", "arcane_mend", "blink", "frost_nova", "meteor", "tome_energy_ball"]);
    const root = document.querySelector<HTMLElement>("[data-skill-bar]")!;
    expect(root.style.maxWidth).toBe("calc(100vw - 24px)");
    expect(root.style.overflowX).toBe("auto");
  });
});
