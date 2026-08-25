export const TICK_RATE = 15; // Hz
export const MOVE_SPEED = 5; // unidades por segundo

// Etapa 15 (Mundo de mapas estilo Mu): MAP_BOUNDS es el plano GLOBAL que aloja todas
// las regiones de los mapas discretos (ver shared/src/world.ts). El movimiento real se
// clampea a los bounds del MAPA ACTUAL del jugador, no a esto; esto sólo dimensiona el
// suelo base y sirve de fallback.
export const MAP_BOUNDS = {
  minX: -80,
  maxX: 690,
  minZ: -80,
  maxZ: 390,
} as const;
