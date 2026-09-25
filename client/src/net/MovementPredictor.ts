import { advanceMovable, clampToBounds, getZone, MOVE_SPEED, type Movable } from "@aden/shared";
import type { PlayerSnapshot } from "./NetworkClient.js";

/** Subconjunto replicado del PlayerState propio que necesita la predicción. */
export interface PredictorServerState {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  mapId: string;
  dead: boolean;
  stunMs: number;
  rootMs: number;
  moveSpeed: number;
}

export interface PredictedMotion {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

/** Divergencia (unidades) a partir de la cual se corrige a la posición del server: ~300 ms de RTT a velocidad máxima. */
const DEFAULT_TOLERANCE = 3;
/** Dos destinos a menos de esta distancia son el mismo (el server usa el mismo umbral al replanificar). */
const SAME_TARGET = 0.05;
/** Destinos enviados pendientes de confirmación que se recuerdan como máximo. */
const MAX_KNOWN_TARGETS = 16;

const canMove = (s: PredictorServerState) => !s.dead && s.stunMs <= 0 && s.rootMs <= 0;

export function predictorStateFromSnapshot(snap: PlayerSnapshot): PredictorServerState {
  return {
    x: snap.x, z: snap.z, targetX: snap.targetX, targetZ: snap.targetZ, moving: snap.moving, dead: snap.dead,
    mapId: snap.mapId ?? "pueblo", stunMs: snap.stunMs ?? 0, rootMs: snap.rootMs ?? 0, moveSpeed: snap.moveSpeed ?? MOVE_SPEED,
  };
}

/**
 * Predicción del movimiento propio (click-to-move). Corre la MISMA simulación que
 * el server (`advanceMovable` de @aden/shared) desde el instante del click y se
 * reconcilia con el estado autoritativo, que llega con la latencia de la red.
 */
export class MovementPredictor {
  private readonly body: Movable = { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, mapId: "" };
  private server: PredictorServerState | null = null;
  /** Destinos que el server ya tiene o está por recibir; uno que no esté acá lo puso el server (warp, respawn). */
  private knownTargets: { x: number; z: number }[] = [];

  constructor(private readonly tolerance = DEFAULT_TOLERANCE) {}

  get state(): PredictedMotion {
    const { x, z, targetX, targetZ, moving } = this.body;
    return { x, z, targetX, targetZ, moving };
  }

  /** Empieza a caminar ya mismo. Devuelve el destino (clampeado igual que en el server) a enviar, o null si no puede moverse. */
  request(x: number, z: number): { x: number; z: number } | null {
    const s = this.server;
    if (!s || !canMove(s)) return null;
    const target = clampToBounds(x, z, getZone(s.mapId).bounds);
    this.body.targetX = target.x;
    this.body.targetZ = target.z;
    this.body.moving = true;
    this.knownTargets.push(target);
    if (this.knownTargets.length > MAX_KNOWN_TARGETS) this.knownTargets.shift();
    return target;
  }

  update(dt: number): void {
    const s = this.server;
    if (!s) return;
    if (!canMove(s)) { this.body.moving = false; return; }
    advanceMovable(this.body, dt, s.moveSpeed);
  }

  reconcile(s: PredictorServerState): void {
    const prev = this.server;
    this.server = s;
    if (!prev || prev.mapId !== s.mapId || s.dead) { this.adopt(s); return; }
    const known = this.knownTargets.findIndex((t) => Math.hypot(t.x - s.targetX, t.z - s.targetZ) <= SAME_TARGET);
    if (known < 0) { this.adopt(s); return; }
    // El server ya procesó ese destino: los anteriores no van a volver.
    this.knownTargets.splice(0, known);
    const current = Math.hypot(this.body.targetX - s.targetX, this.body.targetZ - s.targetZ) <= SAME_TARGET;
    // El server terminó (o abortó por stun) el mismo destino que predecimos: su posición es la final.
    if (!s.moving && current) { this.adopt(s); return; }
    if (Math.hypot(s.x - this.body.x, s.z - this.body.z) > this.tolerance) {
      // Divergencia real: se toma la posición del server y se conserva la intención del jugador.
      this.body.x = s.x;
      this.body.z = s.z;
    }
  }

  private adopt(s: PredictorServerState): void {
    this.body.x = s.x;
    this.body.z = s.z;
    this.body.targetX = s.targetX;
    this.body.targetZ = s.targetZ;
    this.body.moving = s.moving;
    this.body.mapId = s.mapId;
    this.knownTargets = [{ x: s.targetX, z: s.targetZ }];
  }
}
