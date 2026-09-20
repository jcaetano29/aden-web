/** Shared authored layout: rendering, navigation, guidance and encounters use one source. */
export const CRYPT_BOUNDS = { minX: 815, maxX: 985, minZ: -180, maxZ: 100 } as const;
export const CRYPT_SPAWN = { x: 900, z: 90 } as const;
export const CRYPT_BOSS = { x: 900, z: -140 } as const;
export const CRYPT_ROOMS = [
  { id: 'entrance', x: 900, z: 75, width: 42, depth: 30 },
  { id: 'awakening', x: 860, z: 25, width: 62, depth: 52 },
  { id: 'forge', x: 940, z: -55, width: 66, depth: 58 },
  { id: 'heart', x: 900, z: -140, width: 78, depth: 62 },
] as const;
export const CRYPT_ROUTE = [CRYPT_SPAWN, { x: 900, z: 58 }, { x: 860, z: 25 },
  { x: 860, z: -10 }, { x: 940, z: -20 }, { x: 940, z: -55 },
  { x: 940, z: -95 }, CRYPT_BOSS] as const;
export const CRYPT_SEALS = [
  { id: 'crypt_seal_1', x: 845, z: 8 },
  { id: 'crypt_seal_2', x: 960, z: -72 },
] as const;
export const CRYPT_WAVE_TEMPLATES: Record<number, string[]> = {
  0: ['crypt_acolyte', 'crypt_stalker'],
  2: ['crypt_flameguard', 'crypt_emberbeast', 'crypt_behemoth'],
};
export const CRYPT_WAVE_SIZE = 6;
