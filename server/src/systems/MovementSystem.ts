import { stepTowards, MOVE_SPEED, findPath, clipMovement, nearestWalkable, type Point2 } from "@aden/shared";

export interface Movable {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  mapId?: string;
  aiState?: string;
}

interface Route {
  mapId: string;
  targetX: number;
  targetZ: number;
  points: Point2[];
  age: number;
  x: number;
  z: number;
}

// Routes are server-only and disappear with the entity, never replicated.
const routes = new WeakMap<Movable, Route>();

export function advanceMovable(m: Movable, dtSeconds: number, speed = MOVE_SPEED): void {
  if (!m.moving) { routes.delete(m); return; }
  if (!Number.isFinite(m.targetX) || !Number.isFinite(m.targetZ)) {
    m.moving = false;
    routes.delete(m);
    return;
  }
  if (!Number.isFinite(dtSeconds) || !Number.isFinite(speed) || dtSeconds <= 0 || speed <= 0) return;
  let remaining = speed * dtSeconds;
  if (!m.mapId) {
    const next = stepTowards(m.x, m.z, m.targetX, m.targetZ, remaining);
    m.x = next.x; m.z = next.z;
    if (next.arrived) m.moving = false;
    return;
  }
  const safe = nearestWalkable(m.mapId, m);
  m.x = safe.x; m.z = safe.z;
  let route = routes.get(m);
  if (route) route.age += dtSeconds;
  const changedTarget = route && Math.hypot(route.targetX - m.targetX, route.targetZ - m.targetZ) > 0.05;
  // Moving chase targets replan at most four times per second; map changes and
  // teleports invalidate immediately. Every segment is still collision checked.
  if (!route || route.mapId !== m.mapId || Math.hypot(route.x - m.x, route.z - m.z) > 0.01 ||
      (changedTarget && (route.age >= (m.aiState ? 0.25 : 0) || route.points.length === 0))) {
    route = {
      mapId: m.mapId, targetX: m.targetX, targetZ: m.targetZ,
      points: findPath(m.mapId, m, { x: m.targetX, z: m.targetZ }),
      age: 0, x: m.x, z: m.z,
    };
    routes.set(m, route);
  }
  while (remaining > 0 && route.points.length > 0) {
    const target = route.points[0];
    const step = stepTowards(m.x, m.z, target.x, target.z, remaining);
    const next = clipMovement(m.mapId, m, step);
    remaining -= Math.hypot(next.x - m.x, next.z - m.z);
    m.x = next.x; m.z = next.z;
    if (Math.hypot(next.x - step.x, next.z - step.z) > 0.0001) {
      // A route must never force its final position through a solid.
      route.points.length = 0;
      break;
    }
    if (step.arrived) route.points.shift();
    else break;
  }
  route.x = m.x; route.z = m.z;
  if (route.points.length === 0) {
    m.moving = Math.hypot(route.targetX - m.targetX, route.targetZ - m.targetZ) > 0.05;
    routes.delete(m);
  }
}
