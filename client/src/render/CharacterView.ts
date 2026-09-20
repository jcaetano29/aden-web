import * as THREE from "three";
import type { Character } from "./CharacterFactory.js";
import { selectClip } from "./animation.js";
import { smoothTowards, headingFromDelta, smoothAngle } from "./motion.js";

const SMOOTH_K = 12; // rapidez de convergencia de la interpolación
const TURN_K = 12;

// R-E1-1: el frente del modelo KayKit vs la convención de headingFromDelta (atan2(dx,dz),
// "adelante" = +Z). Ajuste de yaw calibrado VISUALMENTE con el usuario:
//   0 = el modelo mira a +Z (sin corrección)   |  Math.PI = mira a -Z (de espaldas)
//   Math.PI/2 o -Math.PI/2 = mira de costado
const YAW_OFFSET = 0;

/** Anillo plano suave (más segmentos → borde limpio) para los indicadores de suelo. */
function makeRingGeometry(inner: number, outer: number): THREE.RingGeometry {
  return new THREE.RingGeometry(inner, outer, 48);
}

export interface ServerState {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export class CharacterView {
  private state: ServerState = { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false };
  private desiredYaw: number | null = null;
  private lastMoving: boolean | null = null;
  private readonly idleClip: string | null;
  private readonly walkClip: string | null;
  private targetRing: THREE.Mesh | null = null;
  private selfRing: THREE.Mesh | null = null;
  private ringT = 0;
  private dead = false;
  private deathTime = 0;

  constructor(private readonly character: Character) {
    this.idleClip = selectClip(character.clipNames, "idle");
    this.walkClip = selectClip(character.clipNames, "walk");
  }

  get object(): THREE.Object3D {
    return this.character.root;
  }

  get position(): { x: number; z: number } {
    return { x: this.character.root.position.x, z: this.character.root.position.z };
  }

  /** Coloca el mesh en la posición inicial exacta (sin interpolar). */
  snapTo(x: number, z: number) {
    this.character.root.position.set(x, 0, z);
    this.state.x = x;
    this.state.z = z;
  }

  setServerState(s: ServerState) {
    this.state = s;
    const heading = headingFromDelta(s.targetX - s.x, s.targetZ - s.z);
    if (heading !== null && s.moving) this.desiredYaw = heading + YAW_OFFSET;
  }

  update(dt: number) {
    const root = this.character.root;
    if (this.dead) {
      this.character.mixer.update(dt);
      this.deathTime += dt;
      // Let the fall finish, then remove the corpse below the ground. Keep the
      // root's visibility reserved for map filtering in EntityViews.
      const sink = Math.min(1, Math.max(0, (this.deathTime - 2.5) / 1.2));
      root.position.y = -(root.userData.visualHeight ?? 3) * 1.2 * root.scale.y * sink * sink * (3 - 2 * sink);
      return;
    }
    // Etapa 15: si el salto es enorme (warp entre mapas / respawn a otro mapa),
    // teletransportar en vez de deslizar por el vacío entre regiones.
    const jump = Math.hypot(this.state.x - root.position.x, this.state.z - root.position.z);
    if (jump > 40) {
      root.position.x = this.state.x;
      root.position.z = this.state.z;
    }
    // Interpolación de posición en el render loop (frame-rate independiente).
    root.position.x = smoothTowards(root.position.x, this.state.x, SMOOTH_K, dt);
    root.position.z = smoothTowards(root.position.z, this.state.z, SMOOTH_K, dt);

    // Orientación hacia la dirección de movimiento.
    if (this.desiredYaw !== null) {
      root.rotation.y = smoothAngle(root.rotation.y, this.desiredYaw, TURN_K, dt);
    }

    // Animación según moving.
    if (this.state.moving !== this.lastMoving) {
      const clip = this.state.moving ? this.walkClip : this.idleClip;
      if (clip) this.character.play(clip);
      this.lastMoving = this.state.moving;
    }

    this.character.mixer.update(dt);

    // Anillos: pulso suave (self) + pulso + giro (objetivo) para que "respiren".
    this.ringT += dt;
    if (this.selfRing) {
      const m = this.selfRing.material as THREE.MeshBasicMaterial;
      m.opacity = 0.5 + Math.sin(this.ringT * 2.4) * 0.22;
      this.selfRing.rotation.z += dt * 0.4;
    }
    if (this.targetRing) {
      const m = this.targetRing.material as THREE.MeshBasicMaterial;
      m.opacity = 0.6 + Math.sin(this.ringT * 5) * 0.3;
      this.targetRing.rotation.z -= dt * 1.6;
      const s = 1 + Math.sin(this.ringT * 5) * 0.05;
      this.targetRing.scale.set(s, s, s);
    }
  }

  /** Adjunta un anillo arcano (glow dorado-azulado) bajo los pies del self. */
  addSelfRing() {
    if (this.selfRing) return;
    const ring = new THREE.Mesh(
      makeRingGeometry(0.58, 0.86),
      new THREE.MeshBasicMaterial({
        color: 0x6fb6ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.renderOrder = 2;
    this.selfRing = ring;
    this.character.root.add(ring);
  }

  /** Adjunta un anillo rojo brillante bajo los pies como indicador de "objetivo". */
  addTargetRing() {
    if (this.targetRing) return;
    const ring = new THREE.Mesh(
      makeRingGeometry(0.72, 1.02),
      new THREE.MeshBasicMaterial({
        color: 0xff4433, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.renderOrder = 2;
    this.targetRing = ring;
    this.character.root.add(ring);
  }

  /** Quita el anillo de objetivo, si estaba presente. */
  removeTargetRing() {
    if (!this.targetRing) return;
    this.character.root.remove(this.targetRing);
    this.targetRing.geometry.dispose();
    (this.targetRing.material as THREE.Material).dispose();
    this.targetRing = null;
  }

  /**
   * Reproduce una animación no-loop de combate ("attack" | "hit" | "death"),
   * resuelta por substring sobre el pool de clips (ver `selectClip`). Si no hay
   * match, no hace nada (no-op gracioso). "death" queda clavado en el último
   * frame (clampWhenFinished) — no vuelve a idle/walk solo; ver `resetAnimation`
   * para restaurarlo tras un respawn. "attack"/"hit" vuelven a idle/walk según
   * `moving` al terminar.
   */
  playOnce(kind: "attack" | "hit" | "death") {
    if (this.dead) return;
    if (kind === "death") {
      this.dead = true;
      this.deathTime = 0;
      this.removeTargetRing();
    }
    const clip = selectClip(this.character.clipNames, kind);
    if (!clip) return;
    this.lastMoving = this.state.moving;
    if (kind === "death") {
      this.character.playOnce(clip, () => {});
      return;
    }
    this.character.playOnce(clip, () => {
      if (this.dead) return;
      const back = this.state.moving ? this.walkClip : this.idleClip;
      if (back) this.character.play(back);
      this.lastMoving = this.state.moving;
    });
  }

  /**
   * Fuerza la vuelta a idle/walk (según `moving` actual). Usado tras un
   * respawn para salir de la pose de muerte clavada por `playOnce("death")`.
   */
  resetAnimation() {
    this.dead = false;
    this.deathTime = 0;
    this.character.root.position.y = 0;
    const clip = this.state.moving ? this.walkClip : this.idleClip;
    if (clip) this.character.play(clip, true);
    this.lastMoving = this.state.moving;
  }

  /** A respawn is a discontinuity, even when the spawn is only a few metres away. */
  respawn(state: ServerState): void {
    this.snapTo(state.x, state.z);
    this.setServerState(state);
    this.desiredYaw = null;
    this.resetAnimation();
  }

  dispose() {
    this.removeTargetRing();
    this.character.mixer.stopAllAction();
  }
}
