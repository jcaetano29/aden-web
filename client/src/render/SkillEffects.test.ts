import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SkillEffects } from "./SkillEffects.js";
import { SKILLS } from "@aden/shared";

describe("SkillEffects", () => {
  it.each(Object.keys(SKILLS))("%s tiene animación y libera sus recursos", (id) => {
    const scene = new THREE.Scene();
    const fx = new SkillEffects(scene);
    fx.cast(id, { x: 0, z: 0 }, { x: 3, z: 0 }, { x: 4, z: 0 });
    expect(scene.children.length).toBeGreaterThan(1);
    for (let i = 0; i < 100; i++) fx.update(.1);
    expect(scene.children).toHaveLength(0);
  });

  it("el meteoro cae desde arriba del objetivo", () => {
    const scene = new THREE.Scene();
    new SkillEffects(scene).cast("meteor", { x: 0, z: 0 }, { x: 8, z: 0 });
    expect(scene.children.some(o => o.position.y > 5 && o.position.x === 8)).toBe(true);
  });
  it("lanzar un proyectil agrega efectos a la escena y se limpian con el tiempo", () => {
    const scene = new THREE.Scene();
    const fx = new SkillEffects(scene);
    fx.cast("fireball", { x: 0, z: 0 }, { x: 6, z: 0 });
    expect(scene.children.length).toBeGreaterThan(0);
    // Avanzar bastante tiempo → todos los efectos terminan y se remueven.
    for (let i = 0; i < 60; i++) fx.update(0.1);
    expect(scene.children.length).toBe(0);
  });

  it("una skill desconocida no rompe", () => {
    const scene = new THREE.Scene();
    const fx = new SkillEffects(scene);
    expect(() => fx.cast("no_existe", { x: 0, z: 0 }, null)).not.toThrow();
  });

  it("heal/buff se castean sobre uno mismo sin objetivo", () => {
    const scene = new THREE.Scene();
    const fx = new SkillEffects(scene);
    fx.cast("second_wind", { x: 0, z: 0 }, null);
    expect(scene.children.length).toBeGreaterThan(0);
  });
});
