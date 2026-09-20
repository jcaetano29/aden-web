import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CharacterView } from "./CharacterView.js";

function setup() {
  const root = new THREE.Group();
  const character = { root, mixer: new THREE.AnimationMixer(root), clipNames: ["Idle", "Walking", "Death", "Hit", "Attack"], play: vi.fn(), playOnce: vi.fn() };
  return { character, view: new CharacterView(character) };
}
const standing = { x: 12, z: 4, targetX: 12, targetZ: 4, moving: false };

describe("character death and respawn", () => {
  it("does not interrupt death when the server stops a moving monster", () => {
    const {character,view}=setup();
    view.setServerState({...standing,moving:true});view.update(0.016);
    view.playOnce("death");character.play.mockClear();
    view.setServerState(standing);view.update(0.1);
    expect(character.play).not.toHaveBeenCalled();
  });
  it("ignores late hits and duplicate death events while dead", () => {
    const {character,view}=setup();view.playOnce("death");
    view.playOnce("hit");view.playOnce("attack");view.playOnce("death");
    expect(character.playOnce).toHaveBeenCalledTimes(1);
  });
  it("respawns immediately at home without sliding or blending a corpse pose", () => {
    const {character,view}=setup();view.snapTo(0,0);view.playOnce("death");view.update(4);
    view.respawn(standing);
    expect(view.object.position.toArray()).toEqual([12,0,4]);
    expect(character.play).toHaveBeenLastCalledWith("Idle",true);
    view.update(0.016);expect(view.object.position.x).toBe(12);
  });
  it("keeps a death pose until respawn, then accepts combat animations again", () => {
    const {character,view}=setup();view.playOnce("death");
    view.update(4);expect(view.object.position.y).toBeLessThan(-2);
    view.respawn(standing);view.playOnce("hit");
    expect(character.playOnce).toHaveBeenCalledTimes(2);
  });
});
