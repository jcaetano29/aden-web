import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { NpcAppearance } from "./NpcAppearance.js";
import type { Character } from "./CharacterFactory.js";

function fixture() {
  const root = new THREE.Group(); root.userData.visualHeight = 2.5;
  for (const [name, y] of [["Head", 2], ["Torso", 1.4], ["Abdomen", 1], ["FistR", 1.2]] as const) {
    const bone = new THREE.Bone(); bone.name = name; bone.position.y = y; root.add(bone);
  }
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  const mixer = new THREE.AnimationMixer(root);
  const clip = new THREE.AnimationClip("Idle", 2, [new THREE.NumberKeyframeTrack("Torso.position[x]", [0, 1, 2], [0, .1, 0])]);
  const character: Character = { root, mixer, clipNames: ["Idle"], play() { mixer.clipAction(clip).play(); }, playOnce(_name, done) { done(); } };
  return { material, character, factory: { create: () => character } };
}

describe("NPC appearances", () => {
  it("isolates finishes from shared player and NPC materials", () => {
    const { factory, material, character } = fixture();
    new NpcAppearance(factory, "elder");
    const body = character.root.children.find(o => o instanceof THREE.Mesh) as THREE.Mesh;
    expect(body.material).not.toBe(material);
    expect(material.color.getHex()).toBe(0xffffff);
  });

  it.each([ ["elder", "beard", "Head"], ["merchant", "satchel", "Abdomen"], ["healer", "stole", "Torso"], ["smith", "hammer", "FistR"], ["captain", "cape", "Torso"] ] as const)("gives %s equipment that follows its animated bone", (role, item, bone) => {
    const { factory, character } = fixture();
    const npc = new NpcAppearance(factory, role);
    const accessory = npc.root.getObjectByName(`npc_${item}`)!;
    expect(accessory).toBeTruthy();
    expect(accessory.parent?.name).toBe(bone);
    const before = accessory.getWorldPosition(new THREE.Vector3());
    character.root.getObjectByName(bone)!.position.x += .5;
    expect(accessory.getWorldPosition(new THREE.Vector3()).x - before.x).toBeCloseTo(.5);
  });

  it("advances the rig while preserving the interaction root position", () => {
    const { factory, character } = fixture();
    const npc = new NpcAppearance(factory, "merchant");
    npc.root.position.set(10, 0, 15); npc.update(.5);
    expect(character.root.getObjectByName("Torso")!.position.x).toBeGreaterThan(0);
    expect(npc.root.position.toArray()).toEqual([10, 0, 15]);
  });
});
