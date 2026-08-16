import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";
import { Nameplates } from "./Nameplates.js";

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private selfId: string | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly factory: CharacterFactory,
    private readonly nameplates: Nameplates,
  ) {}

  add(id: string, isSelf: boolean, modelName: string, name: string, x: number, z: number) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(x, z);
    this.scene.add(view.object);
    this.views.set(id, view);
    this.nameplates.add(id, name, view.object);
    if (isSelf) {
      this.selfId = id;
      view.addSelfRing();
    }
  }

  update(id: string, state: ServerState) {
    this.views.get(id)?.setServerState(state);
  }

  remove(id: string) {
    const view = this.views.get(id);
    if (view) {
      this.nameplates.remove(id);
      this.scene.remove(view.object);
      view.dispose();
      this.views.delete(id);
    }
  }

  updateAll(dt: number) {
    this.views.forEach((v) => v.update(dt));
  }

  selfPosition(): { x: number; z: number } | null {
    if (!this.selfId) return null;
    return this.views.get(this.selfId)?.position ?? null;
  }

  entries(): Array<[string, CharacterView]> {
    return [...this.views.entries()];
  }
}
