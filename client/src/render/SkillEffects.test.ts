import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SkillEffects } from "./SkillEffects.js";

describe("SkillEffects", () => {
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
