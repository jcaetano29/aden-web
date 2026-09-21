import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { StatusEffects } from "./StatusEffects.js";

describe("StatusEffects", () => {
  it("sigue al objetivo y desaparece al limpiar el estado o morir", () => {
    const scene = new THREE.Scene();
    const fx = new StatusEffects(scene);
    const pos = new THREE.Vector3(1, 2.2, 3);
    fx.sync("mob", { stunMs: 900, rootMs: 800 }, () => pos);
    fx.update(.1);
    expect(scene.children).toHaveLength(2);
    pos.x = 8;
    fx.update(.1);
    expect(scene.children.every(o => o.position.x === 8)).toBe(true);
    fx.sync("mob", { stunMs: 0, rootMs: 800 }, () => pos);
    expect(scene.children).toHaveLength(1);
    fx.sync("mob", { dead: true, rootMs: 800 }, () => pos);
    expect(scene.children).toHaveLength(0);
  });
  it("oculta estados fuera del mapa y limpia entidades eliminadas", () => {
    const scene = new THREE.Scene();
    const fx = new StatusEffects(scene);
    fx.sync("p", { poisonMs: 5000, atkBuffMs: 4000, defBuffMs: 3000 }, () => null);
    fx.update(.1);
    expect(scene.children.every(o => !o.visible)).toBe(true);
    fx.remove("p");
    expect(scene.children).toHaveLength(0);
  });
});
