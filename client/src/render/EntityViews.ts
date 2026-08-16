import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private selfId: string | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly factory: CharacterFactory,
  ) {}

  add(id: string, isSelf: boolean, modelName: string, x: number, z: number) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(x, z);
    this.scene.add(view.object);
    this.views.set(id, view);
    if (isSelf) this.selfId = id;
  }

  update(id: string, state: ServerState) {
    this.views.get(id)?.setServerState(state);
  }

  remove(id: string) {
    const view = this.views.get(id);
    if (view) {
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
