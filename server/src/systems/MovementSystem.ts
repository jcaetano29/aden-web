import { stepTowards, MOVE_SPEED } from "@aden/shared";

export interface Movable {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export function advanceMovable(m: Movable, dtSeconds: number, speed = MOVE_SPEED): void {
  if (!m.moving) return;
  const maxDist = speed * dtSeconds;
  const next = stepTowards(m.x, m.z, m.targetX, m.targetZ, maxDist);
  m.x = next.x;
  m.z = next.z;
  if (next.arrived) m.moving = false;
}
