/** Minas de Hierro Negro (Acto II · cap. 2, niveles 15–20). Lugares de referencia del mapa. */
export const MINES_CAMP = { x: 1500, z: 196 } as const;
/** Pozos del tajo abierto: obstáculos de navegación a los lados del camino principal. */
export const MINES_PITS = [
  { x: 1482, z: 152, width: 8, depth: 10 },
  { x: 1518, z: 152, width: 8, depth: 10 },
] as const;
export const MINES_LIFT = { x: 1500, z: 136 } as const;
/** Puerta de la Fragua: arena de Halden al fondo de la mina. */
export const MINES_GATE = { x: 1500, z: 88 } as const;
