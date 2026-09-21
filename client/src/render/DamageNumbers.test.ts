// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { DamageNumbers } from "./DamageNumbers.js";

describe("DamageNumbers", () => {
  it("separa golpes simultáneos y elimina números vencidos", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const scene = new THREE.Scene(), numbers = new DamageNumbers(scene);
    const pos = new THREE.Vector3(1, 2, 3);
    numbers.spawn(pos, 12); numbers.spawn(pos, 18);
    expect(scene.children[0].position.equals(scene.children[1].position)).toBe(false);
    expect((scene.children[0] as any).element.textContent).toBe('12');
    expect((scene.children[1] as any).element.textContent).toBe('18');
    now.mockReturnValue(1200); numbers.update(.1);
    expect(scene.children).toHaveLength(0);
    now.mockRestore();
  });
});
