import * as THREE from "three";
import type { Character } from "./CharacterFactory.js";
import { selectClip } from "./animation.js";
import { smoothTowards, headingFromDelta } from "./motion.js";

const SMOOTH_K = 12; // rapidez de convergencia de la interpolación
const TURN_K = 12;

// R-E1-1: los modelos KayKit miran hacia -Z en su pose de reposo; headingFromDelta
// asume "adelante" = +Z, así que sumamos PI para que el frente visual del modelo
// coincida con la dirección de movimiento. Calibrado durante el smoke test.
const YAW_OFFSET = Math.PI;

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
    // Interpolación de posición en el render loop (frame-rate independiente).
    root.position.x = smoothTowards(root.position.x, this.state.x, SMOOTH_K, dt);
    root.position.z = smoothTowards(root.position.z, this.state.z, SMOOTH_K, dt);

    // Orientación hacia la dirección de movimiento.
    if (this.desiredYaw !== null) {
      root.rotation.y = smoothTowards(root.rotation.y, this.desiredYaw, TURN_K, dt);
    }

    // Animación según moving.
    if (this.state.moving !== this.lastMoving) {
      const clip = this.state.moving ? this.walkClip : this.idleClip;
      if (clip) this.character.play(clip);
      this.lastMoving = this.state.moving;
    }

    this.character.mixer.update(dt);
  }

  /** Adjunta un anillo azul bajo los pies del self como indicador visual. */
  addSelfRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4fa3ff, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.character.root.add(ring);
  }

  dispose() {
    this.character.mixer.stopAllAction();
  }
}
