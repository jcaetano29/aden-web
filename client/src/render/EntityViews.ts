import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";
import { Nameplates } from "./Nameplates.js";
import type { PlayerSnapshot, MobSnapshot } from "../net/NetworkClient.js";

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private readonly mobViews = new Map<string, CharacterView>();
  /** root Object3D del mob -> mobId, para resolver hits de raycast (R-E2b1-5). */
  private readonly mobRootToId = new Map<THREE.Object3D, string>();
  /** mobId -> ¿muerto? (del snapshot sincronizado); usado para excluir corpses del targeting. */
  private readonly mobDead = new Map<string, boolean>();
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

  addMob(id: string, modelName: string, snap: MobSnapshot) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(snap.x, snap.z);
    view.setServerState(snap);
    this.scene.add(view.object);
    this.mobViews.set(id, view);
    this.mobRootToId.set(view.object, id);
    this.mobDead.set(id, snap.dead);
  }

  updateMob(id: string, snap: MobSnapshot) {
    this.mobViews.get(id)?.setServerState(snap);
    const wasDead = this.mobDead.get(id) ?? false;
    this.mobDead.set(id, snap.dead);
    // Si el mob objetivo acaba de morir, el server ya no aceptará/mantendrá
    // este target: limpiamos el resaltado de inmediato en vez de esperar al
    // evento Death (que además puede no estar cableado aún, ver Task 6).
    if (!wasDead && snap.dead && this.currentTargetId === id) {
      this.setTargetHighlight(null);
    }
  }

  removeMob(id: string) {
    const view = this.mobViews.get(id);
    if (view) {
      this.scene.remove(view.object);
      this.mobRootToId.delete(view.object);
      view.dispose();
      this.mobViews.delete(id);
    }
    this.mobDead.delete(id);
    if (this.currentTargetId === id) this.currentTargetId = null;
  }

  /**
   * Objetos raycasteables de mobs (roots) y resolutor hit->mobId. Excluye
   * mobs muertos: quedan en `mobViews` durante toda la ventana de respawn
   * (el server no los borra del estado, sólo pone `dead=true`), así que sin
   * este filtro un click sobre un cadáver dispararía `onPickMob` con un id
   * que el server va a rechazar (su handler exige `!mob.dead`), dejando el
   * resaltado del cliente desincronizado del `targetId` real del server.
   * `idOf` sube por `.parent` desde el objeto golpeado (p.ej. una SkinnedMesh
   * hija) hasta encontrar el root registrado en `mobRootToId` (ver R-E2b1-5),
   * y también descarta el id si resulta estar muerto (defensa adicional).
   */
  raycastTargets(): { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null } {
    const objects = [...this.mobViews.entries()]
      .filter(([id]) => !this.mobDead.get(id))
      .map(([, v]) => v.object);
    const idOf = (o: THREE.Object3D): string | null => {
      let cur: THREE.Object3D | null = o;
      while (cur) {
        const id = this.mobRootToId.get(cur);
        if (id) return this.mobDead.get(id) ? null : id;
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
