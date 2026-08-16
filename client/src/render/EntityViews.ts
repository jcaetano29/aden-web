import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";
import { Nameplates } from "./Nameplates.js";
import type { PlayerSnapshot } from "../net/NetworkClient.js";

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private readonly mobViews = new Map<string, CharacterView>();
  /** root Object3D del mob -> mobId, para resolver hits de raycast (R-E2b1-5). */
  private readonly mobRootToId = new Map<THREE.Object3D, string>();
  private currentTargetId: string | null = null;
  private selfId: string | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly factory: CharacterFactory,
    private readonly nameplates: Nameplates,
  ) {}

  add(id: string, isSelf: boolean, modelName: string, snap: PlayerSnapshot) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(snap.x, snap.z);
    view.setServerState(snap);
    this.scene.add(view.object);
    this.views.set(id, view);
    this.nameplates.add(id, snap.name, view.object);
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

  addMob(id: string, modelName: string, snap: PlayerSnapshot) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(snap.x, snap.z);
    view.setServerState(snap);
    this.scene.add(view.object);
    this.mobViews.set(id, view);
    this.mobRootToId.set(view.object, id);
  }

  updateMob(id: string, state: ServerState) {
    this.mobViews.get(id)?.setServerState(state);
  }

  removeMob(id: string) {
    const view = this.mobViews.get(id);
    if (view) {
      this.scene.remove(view.object);
      this.mobRootToId.delete(view.object);
      view.dispose();
      this.mobViews.delete(id);
    }
    if (this.currentTargetId === id) this.currentTargetId = null;
  }

  /**
   * Objetos raycasteables de mobs (roots) y resolutor hit->mobId. `idOf` sube
   * por `.parent` desde el objeto golpeado (p.ej. una SkinnedMesh hija) hasta
   * encontrar el root registrado en `mobRootToId` (ver R-E2b1-5).
   */
  raycastTargets(): { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null } {
    const objects = [...this.mobViews.values()].map((v) => v.object);
    const idOf = (o: THREE.Object3D): string | null => {
      let cur: THREE.Object3D | null = o;
      while (cur) {
        const id = this.mobRootToId.get(cur);
        if (id) return id;
        cur = cur.parent;
      }
      return null;
    };
    return { objects, idOf };
  }

  /** Resalta (anillo rojo) el mob objetivo actual; quita el resaltado del anterior. */
  setTargetHighlight(mobId: string | null) {
    if (this.currentTargetId && this.currentTargetId !== mobId) {
      this.mobViews.get(this.currentTargetId)?.removeTargetRing();
    }
    this.currentTargetId = mobId;
    if (mobId) {
      this.mobViews.get(mobId)?.addTargetRing();
    }
  }

  updateAll(dt: number) {
    this.views.forEach((v) => v.update(dt));
    this.mobViews.forEach((v) => v.update(dt));
  }

  selfPosition(): { x: number; z: number } | null {
    if (!this.selfId) return null;
    return this.views.get(this.selfId)?.position ?? null;
  }

  entries(): Array<[string, CharacterView]> {
    return [...this.views.entries()];
  }
}
