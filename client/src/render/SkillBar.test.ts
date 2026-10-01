// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillBar } from "./SkillBar.js";
import { getSkill } from "@aden/shared";

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

  it('explains companion support and skill effects without changing skill slots', () => {
    const bar = new SkillBar();
    bar.setSkills(['fireball', 'ice_lance', 'arcane_mend', 'blink', 'frost_nova', 'meteor']);
    const heal = document.querySelector<HTMLButtonElement>('[data-skill-id="arcane_mend"]')!;
    expect(heal.title).toContain('compañero');
    expect(heal.title).toContain('10 m');
    expect(heal.title).toContain('Sobre mí');
    expect(heal.textContent).toContain('3');
    expect(heal.title).toContain(getSkill('arcane_mend').description);
    expect(document.querySelector<HTMLButtonElement>('[data-skill-id="fireball"]')!.title).not.toContain('Sobre mí');
    bar.setSkills(['shield_bash', 'guard']);
    const guard = document.querySelector<HTMLButtonElement>('[data-skill-id="guard"]')!;
    expect(guard.title).toContain('compañero');
    expect(guard.title).toContain('10 m');
    expect(guard.title).toContain(getSkill('guard').description);
  });
});
