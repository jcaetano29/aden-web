// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputController } from "./InputController.js";
import { SkillBar } from "../render/SkillBar.js";
import { AdventureTracker } from "../render/AdventureTracker.js";
import * as THREE from 'three';
import { Renderer } from '../render/Renderer.js';

afterEach(() => { document.body.innerHTML = ""; });

function setup() {
  const onMove = vi.fn();
  const renderer = {
    raycaster: new THREE.Raycaster(),
    camera: new THREE.PerspectiveCamera(),
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
  it("lets players read the adventure panel without moving into the world behind it", () => {
    const { renderer, onMove } = setup();
    const tracker = new AdventureTracker();
    tracker.update({ questId: "q_crypt", questProgress: 0, mapId: "cripta", dungeonStage: 2 });
    document.querySelector<HTMLElement>("[data-adventure-tracker] div")!.click();
    expect(renderer.pickGround).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });
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

it('activates an anchor in front of a boss instead of selecting the boss behind it', () => {
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 100);
  camera.position.set(0, 4, 10); camera.lookAt(0, 1, 0); camera.updateMatrixWorld(true);
  const anchor = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 2), new THREE.MeshBasicMaterial());
  anchor.position.y = 1; anchor.updateMatrixWorld(true);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 1), new THREE.MeshBasicMaterial());
  boss.position.set(0, 2.5, -2); boss.updateMatrixWorld(true);
  const targets = (mesh: THREE.Mesh, id: string) => ({ objects: [mesh], idOf: (o: THREE.Object3D) => o === mesh ? id : null });
  const renderer = { camera, raycaster: new THREE.Raycaster(), pickMobs: Renderer.prototype.pickMobs, pickGround: () => null };
  const views = { raycastTargets: () => targets(boss, 'prior'), raycastPlayerTargets: () => ({ objects: [], idOf: () => null }) };
  const interactions: string[] = [];
  new InputController(renderer as any, views as any, () => {}, id => interactions.push(`mob:${id}`), () => {},
    id => interactions.push(`object:${id}`), () => targets(anchor, 'monastery_anchor_1')).attach(document.body);
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: innerWidth / 2, clientY: innerHeight / 2 }));
  expect(interactions).toEqual(['object:monastery_anchor_1']);
});
