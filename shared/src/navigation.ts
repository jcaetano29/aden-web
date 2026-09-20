import { getZone, type MapBounds } from "./world.js";
import { obstaclesForMap, type StructureObstacle, type Point2 } from "./structures.js";

export type { Point2 } from "./structures.js";
const EPS = 1e-5;
const finite = (p: Point2) => Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);
const validRadius = (r: number) => Number.isFinite(r) && r >= 0;
interface Grid { points: Point2[]; walkable: Uint8Array; columns: number; rows: number }

/** Conservative body clearance: expand each oriented footprint by the body radius.
 * This deliberately keeps a small square clearance at building corners. */
export class NavigationMap {
  private readonly grids = new Map<number, Grid>();
  private readonly boxes: Array<StructureObstacle & { c: number; s: number }>;
  constructor(readonly bounds: MapBounds, obstacles: readonly StructureObstacle[], readonly resolution = 1) {
    if (!(resolution > 0) || !Number.isFinite(resolution)) throw new Error("Invalid navigation resolution");
    this.boxes = obstacles.map(o => ({ ...o, c: Math.cos(o.rotation), s: Math.sin(o.rotation) }));
  }

  isWalkable(p: Point2, radius = 0.4): boolean {
    if (!finite(p) || !validRadius(radius)) return false;
    const b = this.bounds;
    if (p.x < b.minX + radius || p.x > b.maxX - radius || p.z < b.minZ + radius || p.z > b.maxZ - radius) return false;
    return !this.boxes.some(o => {
      const dx = p.x - o.x, dz = p.z - o.z;
      return Math.abs(o.c * dx - o.s * dz) <= o.width / 2 + radius
        && Math.abs(o.s * dx + o.c * dz) <= o.depth / 2 + radius;
    });
  }

  private grid(radius: number): Grid {
    if (!validRadius(radius)) throw new Error("Invalid navigation radius");
    const cached = this.grids.get(radius);
    if (cached) return cached;
    const b = this.bounds;
    const columns = Math.floor((b.maxX - b.minX - radius * 2) / this.resolution) + 1;
    const rows = Math.floor((b.maxZ - b.minZ - radius * 2) / this.resolution) + 1;
    if (columns <= 0 || rows <= 0 || columns * rows > 250000) throw new Error("Navigation grid outside supported bounds");
    const points: Point2[] = [], walkable = new Uint8Array(columns * rows);
    for (let z = 0; z < rows; z++) for (let x = 0; x < columns; x++) {
      const p = { x: b.minX + radius + x * this.resolution, z: b.minZ + radius + z * this.resolution };
      walkable[points.length] = +this.isWalkable(p, radius);
      points.push(p);
    }
    const grid = { points, walkable, columns, rows };
    // Actor sizes are normally fixed; cap arbitrary caller-created size caches.
    if (this.grids.size >= 8) this.grids.delete(this.grids.keys().next().value!);
    this.grids.set(radius, grid);
    return grid;
  }

  nearestWalkable(p: Point2, radius = 0.4): Point2 {
    if (!validRadius(radius)) throw new Error("Invalid navigation radius");
    const b = this.bounds;
    const target = {
      x: Math.max(b.minX + radius, Math.min(b.maxX - radius, Number.isFinite(p.x) ? p.x : (b.minX + b.maxX) / 2)),
      z: Math.max(b.minZ + radius, Math.min(b.maxZ - radius, Number.isFinite(p.z) ? p.z : (b.minZ + b.maxZ) / 2)),
    };
    if (this.isWalkable(target, radius)) return target;
    let best: Point2 | undefined, score = Infinity;
    const consider = (candidate: Point2) => {
      const d = distance(candidate, target);
      if (d < score && this.isWalkable(candidate, radius)) { best = candidate; score = d; }
    };
    // Exact face projections avoid moving a blocked click a whole grid cell.
    for (const o of this.boxes) {
      const dx = target.x - o.x, dz = target.z - o.z;
      const x = o.c * dx - o.s * dz, z = o.s * dx + o.c * dz;
      const hx = o.width / 2 + radius + EPS, hz = o.depth / 2 + radius + EPS;
      for (const [lx, lz] of [[-hx, Math.max(-hz, Math.min(hz, z))], [hx, Math.max(-hz, Math.min(hz, z))], [Math.max(-hx, Math.min(hx, x)), -hz], [Math.max(-hx, Math.min(hx, x)), hz]]) {
        consider({ x: o.x + o.c * lx + o.s * lz, z: o.z - o.s * lx + o.c * lz });
      }
    }
    const grid = this.grid(radius);
    for (let i = 0; i < grid.points.length; i++) if (grid.walkable[i]) consider(grid.points[i]);
    if (!best) throw new Error("Map has no walkable position for actor radius");
    return { ...best };
  }

  /** Earliest continuous segment hit against inflated OBBs and map bounds. */
  private fraction(from: Point2, to: Point2, radius: number): number {
    const dx = to.x - from.x, dz = to.z - from.z, b = this.bounds;
    let hit = 1;
    if (dx > 0) hit = Math.min(hit, (b.maxX - radius - from.x) / dx);
    if (dx < 0) hit = Math.min(hit, (b.minX + radius - from.x) / dx);
    if (dz > 0) hit = Math.min(hit, (b.maxZ - radius - from.z) / dz);
    if (dz < 0) hit = Math.min(hit, (b.minZ + radius - from.z) / dz);
    for (const o of this.boxes) {
      const ox = from.x - o.x, oz = from.z - o.z;
      const origins = [o.c * ox - o.s * oz, o.s * ox + o.c * oz];
      const deltas = [o.c * dx - o.s * dz, o.s * dx + o.c * dz];
      const halves = [o.width / 2 + radius, o.depth / 2 + radius];
      let enter = 0, leave = hit;
      for (let axis = 0; axis < 2; axis++) {
        if (Math.abs(deltas[axis]) < 1e-12) {
          if (Math.abs(origins[axis]) > halves[axis]) { enter = Infinity; break; }
        } else {
          const a = (-halves[axis] - origins[axis]) / deltas[axis];
          const c = (halves[axis] - origins[axis]) / deltas[axis];
          enter = Math.max(enter, Math.min(a, c));
          leave = Math.min(leave, Math.max(a, c));
        }
      }
      if (enter <= leave && leave >= 0) hit = Math.min(hit, enter);
    }
    return Math.max(0, hit);
  }

  clipMovement(from: Point2, to: Point2, radius = 0.4): Point2 {
    const start = this.isWalkable(from, radius) ? from : this.nearestWalkable(from, radius);
    if (!finite(to)) return { ...start };
    const fraction = this.fraction(start, to, radius);
    if (fraction >= 1 && this.isWalkable(to, radius)) return { ...to };
    const t = Math.max(0, fraction - EPS / Math.max(EPS, distance(start, to)));
    return { x: start.x + (to.x - start.x) * t, z: start.z + (to.z - start.z) * t };
  }

  private clear(a: Point2, b: Point2, radius: number): boolean {
    return this.isWalkable(b, radius) && this.fraction(a, b, radius) >= 1;
  }

  findPath(from: Point2, to: Point2, radius = 0.4): Point2[] {
    if (!finite(from) || !finite(to) || !this.isWalkable(from, radius)) return [];
    const target = this.nearestWalkable(to, radius);
    if (distance(from, target) < EPS) return [];
    if (this.clear(from, target, radius)) return [target];
    const grid = this.grid(radius), n = grid.points.length;
    const costs = new Float64Array(n).fill(Infinity), parents = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
    const heap = new MinHeap();
    // Start attaches to nearby visible cells, never across a sub-cell wall.
    let seeds = 0;
    for (let i = 0; i < n; i++) if (grid.walkable[i] && distance(from, grid.points[i]) <= this.resolution * 2 && this.clear(from, grid.points[i], radius)) {
      costs[i] = distance(from, grid.points[i]); heap.push(i, costs[i] + distance(grid.points[i], target)); seeds++;
    }
    if (!seeds) return []; // An isolated sub-cell pocket cannot safely enter this grid.
    let best = -1, bestDistance = distance(from, target), reached = false;
    while (heap.length) {
      const index = heap.pop();
      if (closed[index]) continue;
      closed[index] = 1;
      const p = grid.points[index], d = distance(p, target);
      if (d < bestDistance) { best = index; bestDistance = d; }
      if (this.clear(p, target, radius)) { best = index; reached = true; break; }
      const x = index % grid.columns, z = Math.floor(index / grid.columns);
      for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
        if ((!ox && !oz) || x + ox < 0 || x + ox >= grid.columns || z + oz < 0 || z + oz >= grid.rows) continue;
        const next = index + oz * grid.columns + ox;
        if (!grid.walkable[next] || closed[next]) continue;
        const cost = costs[index] + Math.hypot(ox, oz) * this.resolution;
        if (cost >= costs[next] || !this.clear(p, grid.points[next], radius)) continue;
        costs[next] = cost; parents[next] = index;
        heap.push(next, cost + distance(grid.points[next], target));
      }
    }
    if (best < 0) return [];
    const path: Point2[] = [];
    for (let i = best; i >= 0; i = parents[i]) path.push(grid.points[i]);
    path.reverse();
    if (reached) path.push(target);
    else {
      const endpoint = this.clipMovement(path[path.length - 1], target, radius);
      if (distance(endpoint, target) < bestDistance) path.push(endpoint);
    }
    const smooth: Point2[] = [];
    let anchor = from, cursor = 0;
    while (cursor < path.length) {
      let end = path.length - 1;
      while (end > cursor && !this.clear(anchor, path[end], radius)) end--;
      if (distance(anchor, path[end]) > EPS) smooth.push({ ...path[end] });
      anchor = path[end]; cursor = end + 1;
    }
    return smooth;
  }
}

class MinHeap {
  private items: Array<{ index: number; score: number }> = [];
  get length() { return this.items.length; }
  push(index: number, score: number) {
    const item = { index, score }; let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].score <= score) break;
      this.items[i] = this.items[parent]; i = parent;
    }
    this.items[i] = item;
  }
  pop(): number {
    const result = this.items[0].index, last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++;
        if (last.score <= this.items[child].score) break;
        this.items[i] = this.items[child]; i = child;
      }
      this.items[i] = last;
    }
    return result;
  }
}

const maps = new Map<string, NavigationMap>();
function navigation(mapId: string): NavigationMap {
  let map = maps.get(mapId);
  if (!map) { map = new NavigationMap(getZone(mapId).bounds, obstaclesForMap(mapId)); maps.set(mapId, map); }
  return map;
}
export const isWalkable = (mapId: string, p: Point2, radius = 0.4) => navigation(mapId).isWalkable(p, radius);
export const nearestWalkable = (mapId: string, p: Point2, radius = 0.4) => navigation(mapId).nearestWalkable(p, radius);
export const clipMovement = (mapId: string, from: Point2, to: Point2, radius = 0.4) => navigation(mapId).clipMovement(from, to, radius);
export const findPath = (mapId: string, from: Point2, to: Point2, radius = 0.4) => navigation(mapId).findPath(from, to, radius);
