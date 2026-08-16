import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";
import { Nameplates } from "./Nameplates.js";
import { HealthBar } from "./HealthBar.js";
import type { PlayerSnapshot, MobSnapshot } from "../net/NetworkClient.js";

const MOB_HP_BAR_Y = 2.2; // altura aprox. de la cabeza, para posicionar los damage numbers

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private readonly mobViews = new Map<string, CharacterView>();
  /** root Object3D del mob -> mobId, para resolver hits de raycast (R-E2b1-5). */
  private readonly mobRootToId = new Map<THREE.Object3D, string>();
  /** mobId -> ¿muerto? (del snapshot sincronizado); usado para excluir corpses del targeting. */
  private readonly mobDead = new Map<string, boolean>();
  /** mobId -> barra de HP (CSS2D) flotando sobre el mob. */
  private readonly mobHealthBars = new Map<string, HealthBar>();
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

    const bar = new HealthBar();
    bar.attach(view.object);
    bar.update(snap.hp, snap.maxHp);
    bar.setVisible(!snap.dead);
    this.mobHealthBars.set(id, bar);
  }

  updateMob(id: string, snap: MobSnapshot) {
    this.mobViews.get(id)?.setServerState(snap);
    this.mobHealthBars.get(id)?.update(snap.hp, snap.maxHp);
    const wasDead = this.mobDead.get(id) ?? false;
    this.mobDead.set(id, snap.dead);
    // Si el mob objetivo acaba de morir, el server ya no aceptará/mantendrá
    // este target: limpiamos el resaltado de inmediato en vez de esperar al
    // evento Death (que además puede no estar cableado aún, ver Task 6).
    if (!wasDead && snap.dead && this.currentTargetId === id) {
      this.setTargetHighlight(null);
    }
    // Respawn (hp vuelve, dead pasa a false): restaurar barra y salir de la
    // pose de muerte clavada por playOnce("death").
    if (wasDead && !snap.dead) {
      this.mobHealthBars.get(id)?.setVisible(true);
      this.mobViews.get(id)?.resetAnimation();
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
    this.mobHealthBars.get(id)?.remove();
    this.mobHealthBars.delete(id);
    this.mobDead.delete(id);
    if (this.currentTargetId === id) this.currentTargetId = null;
  }

  /**
   * Feedback visual de un hit de daño sobre un mob: animación "hit" en el mob
   * y, si el mob golpeado es el target actual del self, animación "attack" en
   * el propio jugador (el evento Damage no trae el id del atacante — ver
   * Task 6 brief: se infiere así, es una simplificación aceptada).
   */
  onMobDamage(mobId: string) {
    this.mobViews.get(mobId)?.playOnce("hit");
    if (mobId === this.currentTargetId && this.selfId) {
      this.views.get(this.selfId)?.playOnce("attack");
    }
  }

  /** Animación de muerte + ocultar la barra de HP (el mob sigue en `mobViews` hasta el respawn). */
  onMobDeath(mobId: string) {
    this.mobViews.get(mobId)?.playOnce("death");
    this.mobHealthBars.get(mobId)?.setVisible(false);
    this.mobDead.set(mobId, true);
    if (this.currentTargetId === mobId) this.setTargetHighlight(null);
  }

  /** Posición de mundo aprox. de la cabeza del mob, para anclar damage numbers. */
  mobWorldPosition(mobId: string): THREE.Vector3 | null {
    const view = this.mobViews.get(mobId);
    if (!view) return null;
    const p = view.object.position;
    return new THREE.Vector3(p.x, MOB_HP_BAR_Y, p.z);
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
