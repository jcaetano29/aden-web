import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView } from "./CharacterView.js";
import { Nameplates } from "./Nameplates.js";
import { HealthBar } from "./HealthBar.js";
import { isBoss, scaleForTemplate, getTemplate, ATTACK_RANGE } from "@aden/shared";
import type { PlayerSnapshot, MobSnapshot } from "../net/NetworkClient.js";

const MOB_HP_BAR_Y = 2.2; // altura aprox. de la cabeza, para posicionar los damage numbers
const PLAYER_HP_BAR_Y = 2.2; // misma altura aprox. (modelos KayKit de escala similar)

// Shared RingGeometry para los telegraphs: reutilizado entre todos los mobs
const TELEGRAPH_RING_GEOMETRY = new THREE.RingGeometry(ATTACK_RANGE * 0.82, ATTACK_RANGE, 32);

/** Mantiene sincronizadas las vistas de personajes con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private readonly mobViews = new Map<string, CharacterView>();
  /** root Object3D del mob -> mobId, para resolver hits de raycast (R-E2b1-5). */
  private readonly mobRootToId = new Map<THREE.Object3D, string>();
  /** root Object3D del jugador -> sessionId, para resolver hits de raycast al targetear otro jugador (PvP). */
  private readonly playerRootToId = new Map<THREE.Object3D, string>();
  /** mobId -> ¿muerto? (del snapshot sincronizado); usado para excluir corpses del targeting. */
  private readonly mobDead = new Map<string, boolean>();
  /** mobId -> barra de HP (CSS2D) flotando sobre el mob. */
  private readonly mobHealthBars = new Map<string, HealthBar>();
  /** mobId -> anillo de telegraph (viento-up). */
  private readonly mobTelegraphRings = new Map<string, THREE.Mesh>();
  /** playerId -> ¿muerto? (del snapshot sincronizado); detecta la transición dead->false (respawn) para salir de la pose de muerte. */
  private readonly playerDead = new Map<string, boolean>();
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
    this.playerRootToId.set(view.object, id);
    this.nameplates.add(id, snap.name, view.object);
    this.playerDead.set(id, snap.dead);
    if (isSelf) {
      this.selfId = id;
      view.addSelfRing();
    }
  }

  update(id: string, state: PlayerSnapshot) {
    this.views.get(id)?.setServerState(state);
    // Respawn (dead vuelve a false): restaurar la pose de idle/walk clavada
    // por playOnce("death") (mismo enfoque que updateMob para los mobs).
    const wasDead = this.playerDead.get(id) ?? false;
    this.playerDead.set(id, state.dead);
    if (wasDead && !state.dead) {
      this.views.get(id)?.resetAnimation();
    }
  }

  remove(id: string) {
    const view = this.views.get(id);
    if (view) {
      this.nameplates.remove(id);
      this.scene.remove(view.object);
      this.playerRootToId.delete(view.object);
      view.dispose();
      this.views.delete(id);
    }
    this.playerDead.delete(id);
    if (this.currentTargetId === id) this.currentTargetId = null;
  }

  addMob(id: string, modelName: string, templateId: string, snap: MobSnapshot) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(snap.x, snap.z);
    view.setServerState(snap);
    view.object.scale.setScalar(scaleForTemplate(templateId));
    this.scene.add(view.object);
    this.mobViews.set(id, view);
    this.mobRootToId.set(view.object, id);
    this.mobDead.set(id, snap.dead);

    // Boss nameplate en rojo
    if (isBoss(templateId)) {
      this.nameplates.add(id, getTemplate(templateId).name, view.object, "#ff5252");
    }

    const bar = new HealthBar();
    bar.attach(view.object);
    bar.update(snap.hp, snap.maxHp);
    bar.setVisible(!snap.dead);
    this.mobHealthBars.set(id, bar);

    // Telegraph ring (wind-up visual)
    const ring = new THREE.Mesh(
      TELEGRAPH_RING_GEOMETRY,
      new THREE.MeshBasicMaterial({
        color: 0xff2a2a,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.visible = false;
    view.object.add(ring);
    this.mobTelegraphRings.set(id, ring);
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
    // Telegraph ring: mostrar si hay wind-up activo
    const ring = this.mobTelegraphRings.get(id);
    if (ring) {
      ring.visible = snap.windupMs > 0;
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
    this.nameplates.remove(id);
    this.mobHealthBars.get(id)?.remove();
    this.mobHealthBars.delete(id);
    // Telegraph ring cleanup (dispose material only; geometry is shared)
    const ring = this.mobTelegraphRings.get(id);
    if (ring) {
      const material = ring.material;
      if (material instanceof THREE.Material) {
        material.dispose();
      }
      ring.removeFromParent();
      this.mobTelegraphRings.delete(id);
    }
    this.mobDead.delete(id);
    if (this.currentTargetId === id) this.currentTargetId = null;
  }

  /** Feedback visual de un hit de daño sobre un mob: animación "hit" en el mob. */
  onMobDamage(mobId: string) {
    this.mobViews.get(mobId)?.playOnce("hit");
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

  /** ¿Existe una vista de mob con este id? (para rutear Damage/Death: mob vs. jugador). */
  hasMob(id: string): boolean {
    return this.mobViews.has(id);
  }

  /** ¿Existe una vista de jugador con este id? (para rutear Damage/Death: mob vs. jugador). */
  hasPlayer(id: string): boolean {
    return this.views.has(id);
  }

  /** Feedback visual de un hit de daño sobre un jugador (propio u otro): animación "hit". */
  onPlayerDamage(playerId: string) {
    this.views.get(playerId)?.playOnce("hit");
  }

  /** Animación de muerte de un jugador (propio u otro). El respawn (dead->false) restaura idle en `update`. */
  onPlayerDeath(playerId: string) {
    this.views.get(playerId)?.playOnce("death");
    if (this.currentTargetId === playerId) this.setTargetHighlight(null);
  }

  /** Posición de mundo aprox. de la cabeza del jugador, para anclar damage numbers. */
  playerWorldPosition(playerId: string): THREE.Vector3 | null {
    const view = this.views.get(playerId);
    if (!view) return null;
    const p = view.object.position;
    return new THREE.Vector3(p.x, PLAYER_HP_BAR_Y, p.z);
  }

  /**
   * Reproduce la animación "attack" en la vista del atacante de un evento
   * Damage, resolviendo `attackerId` contra mobs y jugadores (puede ser
   * cualquiera de los dos: un mob atacando al jugador, o el jugador/otro
   * jugador atacando a un mob). No-op si falta el id o no hay vista.
   */
  playAttackerAnim(attackerId?: string) {
    if (!attackerId) return;
    const mobView = this.mobViews.get(attackerId);
    if (mobView) {
      mobView.playOnce("attack");
      return;
    }
    this.views.get(attackerId)?.playOnce("attack");
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

  /**
   * Objetos raycasteables de OTROS jugadores (root) y resolutor hit->sessionId,
   * para permitir targetear jugadores en PvP (mismo patrón que raycastTargets()
   * para mobs). Excluye al propio jugador (self) y a jugadores muertos: el
   * server rechaza SetTarget contra sí mismo o contra un jugador muerto
   * (`msg.targetId !== client.sessionId && !!other && !other.dead`), así que
   * un click sobre uno de esos casos no debe ni intentarlo.
   */
  raycastPlayerTargets(): { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null } {
    const objects = [...this.views.entries()]
      .filter(([id]) => id !== this.selfId && !this.playerDead.get(id))
      .map(([, v]) => v.object);
    const idOf = (o: THREE.Object3D): string | null => {
      let cur: THREE.Object3D | null = o;
      while (cur) {
        const id = this.playerRootToId.get(cur);
        if (id) return id === this.selfId || this.playerDead.get(id) ? null : id;
        cur = cur.parent;
      }
      return null;
    };
    return { objects, idOf };
  }

  /**
   * Resalta (anillo rojo) el objetivo actual —mob o jugador (PvP)— y quita el
   * resaltado del anterior. El id puede resolver en `mobViews` o en `views`
   * (namespaces distintos: mobId vs. sessionId nunca colisionan), así que se
   * intenta en ambos mapas sin necesidad de que el llamador distinga el tipo.
   */
  setTargetHighlight(id: string | null) {
    if (this.currentTargetId && this.currentTargetId !== id) {
      this.mobViews.get(this.currentTargetId)?.removeTargetRing();
      this.views.get(this.currentTargetId)?.removeTargetRing();
    }
    this.currentTargetId = id;
    if (id) {
      this.mobViews.get(id)?.addTargetRing();
      this.views.get(id)?.addTargetRing();
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
