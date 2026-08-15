export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

export function clampToBounds(
  x: number,
  z: number,
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
): { x: number; z: number } {
  return {
    x: Math.min(b.maxX, Math.max(b.minX, x)),
    z: Math.min(b.maxZ, Math.max(b.minZ, z)),
  };
}

export function stepTowards(
  cx: number,
  cz: number,
  tx: number,
  tz: number,
  maxDist: number,
): { x: number; z: number; arrived: boolean } {
  const dist = distance2D(cx, cz, tx, tz);
  if (dist <= maxDist || dist === 0) {
    return { x: tx, z: tz, arrived: true };
  }
  const ratio = maxDist / dist;
  return { x: cx + (tx - cx) * ratio, z: cz + (tz - cz) * ratio, arrived: false };
}
