// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputController } from "./InputController.js";
import { SkillBar } from "../render/SkillBar.js";

afterEach(() => { document.body.innerHTML = ""; });

function setup() {
  const onMove = vi.fn();
  const renderer = {
    pickMobs: vi.fn(() => null),
    pickGround: vi.fn(() => ({ x: 4, y: 0, z: 7 })),
  };
  const views = {
    raycastTargets: vi.fn(() => ({ objects: [], idOf: () => null })),
    raycastPlayerTargets: vi.fn(() => ({ objects: [], idOf: () => null })),
  };
  const input = new InputController(renderer as any, views as any, onMove, vi.fn(), vi.fn());
  input.attach(document.body);
  return { renderer, onMove };
}

describe("InputController UI boundary", () => {
  it("usa una skill al hacer click sin raycastear el mundo debajo", () => {
    const { renderer, onMove } = setup();
    const onUseSkill = vi.fn();
    const bar = new SkillBar(onUseSkill);
    bar.setSkills(["fireball"]);

    document.querySelector<HTMLButtonElement>("[data-skill-id=fireball]")!.click();

    expect(onUseSkill).toHaveBeenCalledWith("fireball");
    expect(renderer.pickGround).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignora el fondo de un panel pero conserva clicks del área de juego", () => {
    const { renderer, onMove } = setup();
    const panel = document.createElement("div");
    panel.className = "aden-panel";
    const panelChild = document.createElement("span");
    panel.appendChild(panelChild);
    document.body.appendChild(panel);
    panelChild.click();
    expect(renderer.pickGround).not.toHaveBeenCalled();

    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.click();
    expect(renderer.pickGround).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith({ x: 4, z: 7 });
  });
});
