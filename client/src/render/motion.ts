export function smoothTowards(current: number, target: number, k: number, dt: number): number {
  if (dt <= 0) return current;
  const alpha = 1 - Math.exp(-k * dt); // ∈ [0,1)
  return current + (target - current) * alpha;
}

export function headingFromDelta(dx: number, dz: number): number | null {
  if (dx === 0 && dz === 0) return null;
  return Math.atan2(dx, dz);
}
