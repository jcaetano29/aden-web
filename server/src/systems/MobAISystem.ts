import { distance2D, type AIConfig } from "@aden/shared";

export interface AIMob {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  aiState: string;
  homeX: number;
  homeZ: number;
  wanderCooldownMs: number;
  aggroTargetId: string;
}

export interface PlayerPos {
  id: string;
  x: number;
  z: number;
}

export interface PlayerAggroCandidate {
  id: string;
  x: number;
  z: number;
  dead: boolean;
}

/**
 * Filtra los jugadores elegibles como objetivo de aggro: excluye a los
 * muertos y a los que están dentro del radio seguro (pueblo). Puro —
 * el llamador (GameRoom) arma la lista con el estado real antes de pasarla
 * a stepMobAI, así un mob que perseguía a alguien que sale de la lista
 * (muere o entra al pueblo) suelta el aggro en el siguiente tick.
 */
export function eligiblePlayersForAggro(
  players: PlayerAggroCandidate[],
  town: { x: number; z: number },
  safeRadius: number,
): PlayerPos[] {
  return players
    .filter((p) => !p.dead && distance2D(p.x, p.z, town.x, town.z) > safeRadius)
    .map((p) => ({ id: p.id, x: p.x, z: p.z }));
}

export function stepMobAI(
  mob: AIMob,
  players: PlayerPos[],
  cfg: AIConfig,
  rng: () => number,
  dtMs: number,
): void {
  // 1) ¿Hay jugador dentro de aggroRadius? (el más cercano)
  let nearest: PlayerPos | null = null;
  let nearestD = Infinity;
  for (const p of players) {
    const d = distance2D(mob.x, mob.z, p.x, p.z);
    if (d < nearestD) { nearestD = d; nearest = p; }
  }

  const leashedOut = distance2D(mob.x, mob.z, mob.homeX, mob.homeZ) > cfg.leashRadius;

  if (nearest && nearestD <= cfg.aggroRadius && !leashedOut) {
    mob.aiState = "chase";
    mob.aggroTargetId = nearest.id;
    mob.targetX = nearest.x;
    mob.targetZ = nearest.z;
    mob.moving = true;
    return;
  }

  if (mob.aiState === "chase") {
    // seguir persiguiendo si el objetivo existe y no nos pasamos del leash
    const target = players.find((p) => p.id === mob.aggroTargetId);
    if (target && !leashedOut) {
      mob.targetX = target.x;
      mob.targetZ = target.z;
      mob.moving = true;
      return;
    }
    // soltar aggro → volver al home
    mob.aiState = "wander";
    mob.aggroTargetId = "";
    mob.targetX = mob.homeX;
    mob.targetZ = mob.homeZ;
    mob.moving = true;
    mob.wanderCooldownMs = 0;
    return;
  }

  // wander
  if (mob.moving) return; // sigue yendo hacia su punto de wander (advanceMovable apagará moving al llegar)
  if (mob.wanderCooldownMs > 0) {
    mob.wanderCooldownMs -= dtMs;
    return;
  }
  const angle = rng() * Math.PI * 2;
  const dist = Math.sqrt(rng()) * cfg.wanderRadius;
  mob.targetX = mob.homeX + Math.cos(angle) * dist;
  mob.targetZ = mob.homeZ + Math.sin(angle) * dist;
  mob.moving = true;
  mob.wanderCooldownMs = cfg.wanderPauseMs;
}
