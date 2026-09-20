import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CharacterMaterial } from "./CharacterMaterial.js";

describe("CharacterMaterial", () => {
  it("retains the finish when enemy variants clone and tint a material", () => {
    const original = new CharacterMaterial();
    original.name = "skeleton_texture";
    original.map = new THREE.Texture();
    const variant = original.clone();
    variant.color.multiply(new THREE.Color(0x8866cc));
    expect(variant).toBeInstanceOf(CharacterMaterial);
    expect(variant.map).toBe(original.map);
    expect(variant.name).toBe(original.name);
    expect(variant.onBeforeCompile).toBe(original.onBeforeCompile);
    expect(original.color.getHex()).toBe(0xffffff);
    expect(variant.customProgramCacheKey()).toBe(original.customProgramCacheKey());
  });
});
