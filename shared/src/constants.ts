export const TICK_RATE = 15; // Hz
export const MOVE_SPEED = 5; // unidades por segundo

// Etapa 11 (El Mundo de Aden): el mapa deja de ser un cuadrado chico y se estira
// hacia el norte (-Z) para alojar las zonas encadenadas (pueblo al sur → trono al
// norte). Ver shared/src/world.ts para el layout de zonas.
export const MAP_BOUNDS = {
  minX: -70,
  maxX: 70,
  minZ: -140,
  maxZ: 55,
} as const;
