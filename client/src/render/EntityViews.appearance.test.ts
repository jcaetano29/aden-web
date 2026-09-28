// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { EntityViews } from "./EntityViews.js";

function snapshot(appearanceModel = "") {
  return {
    name: "Aela", x: 2, z: 3, targetX: 2, targetZ: 3, moving: false, dead: false,
    className: "ranger", appearanceModel, guildTag: "", title: "", mapId: "pueblo",
  };
}

describe("EntityViews appearance override", () => {
  it.each(['Ranger', 'Ranger_Female'])("recrea el visual transformado y restaura %s", (base) => {
    const created: string[] = [];
    const factory = {
      create(model: string) {
        created.push(model);
        return {
          root: new THREE.Group(), mixer: { update() {}, stopAllAction() {} }, clipNames: [],
          play() {}, playOnce(_name: string, done: () => void) { done(); },
        };
      },
    };
    (factory as any).createHero=(cls:string,a:any)=>factory.create(cls[0].toUpperCase()+cls.slice(1)+(a.gender==='female'?'_Female':''));
    const nameplates = { add: vi.fn(), remove: vi.fn(), setText: vi.fn(), setTitle: vi.fn() };
    const views = new EntityViews(new THREE.Scene(), factory as any, nameplates as any);

    const state=(override='')=>({...snapshot(override),gender:base.endsWith('_Female')?'female' as const:'male' as const});
    views.add("self", true, base, state());
    views.update("self", state("DeathWraith"));
    views.update("self", state(""));

    expect(created).toEqual([base, "DeathWraith", base]);
    expect(views.selfPosition()).toEqual({ x: 2, z: 3 });
  });
});
