import { distance2D } from "./math.js";

/**
 * El Mundo de Aden como MAPAS DISCRETOS (Etapa 15, estilo Mu Online). En vez de
 * un único plano con zonas contiguas, el mundo son mapas separados y grandes a los
 * que se VIAJA con el menú de mapas (tecla M), no caminando. Cada mapa ocupa su
 * propia región (bounds) de un plano global, muy espaciada de las demás para que la
 * niebla oculte a las vecinas: el jugador nunca ve más de un mapa a la vez. El
 * movimiento está clampeado a los bounds del mapa actual → no se puede caminar
 * afuera; para cambiar de mapa hay que warpear (gateado por nivel).
 */

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Paleta visual de un bioma (colores en hex 0xRRGGBB). Puramente presentación. */
export interface ZoneBiome {
  ground: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  accent: number;
}

/** Un "Zone" ES un mapa (se mantiene el nombre del tipo por compatibilidad). */
export interface Zone {
  id: string;
  name: string;
  subtitle: string;
  /** Centro del mapa (para el minimapa y referencia). */
  center: { x: number; z: number };
  /** Región caminable del mapa (coords globales). El movimiento se clampea acá. */
  bounds: MapBounds;
  /** Punto de llegada al warpear/respawnear a este mapa. */
  spawn: { x: number; z: number };
  /** Nivel mínimo para poder viajar a este mapa (gate estilo Mu). */
  levelReq: number;
  /** Rango recomendado (para mostrar). */
  levelMin: number;
  levelMax: number;
  /** Mapa seguro (pueblo): sin combate ni PvP, los mobs no aparecen acá. */
  safe: boolean;
  biome: ZoneBiome;
}

const HALF = 65; // semilado de cada mapa (mapas de 130x130, ~8x el área anterior)
function boundsAround(cx: number, cz: number): MapBounds {
  return { minX: cx - HALF, maxX: cx + HALF, minZ: cz - HALF, maxZ: cz + HALF };
}

export const ZONES: Zone[] = [
  {
    id: "pueblo",
    name: "Pueblo de Aden",
    subtitle: "Refugio de los vivos",
    center: { x: 0, z: 0 },
    bounds: boundsAround(0, 0),
    spawn: { x: 0, z: 14 },
    levelReq: 0,
    levelMin: 0,
    levelMax: 0,
    safe: true,
    biome: { ground: 0x4a7c3a, fog: 0xbcd9f0, fogNear: 55, fogFar: 190, accent: 0xffd54f },
  },
  {
    id: "bosque",
    name: "Bosque de Umbra",
    subtitle: "Los huesos despiertan bajo los árboles",
    center: { x: 300, z: 0 },
    bounds: boundsAround(300, 0),
    spawn: { x: 300, z: 50 },
    levelReq: 1,
    levelMin: 1,
    levelMax: 3,
    safe: false,
    biome: { ground: 0x2f5a2c, fog: 0x8fae86, fogNear: 34, fogFar: 140, accent: 0x6fae57 },
  },
  {
    id: "ruinas",
    name: "Ruinas de Nihil",
    subtitle: "Piedra caída, guardianes que no descansan",
    center: { x: 0, z: 300 },
    bounds: boundsAround(0, 300),
    spawn: { x: 0, z: 350 },
    levelReq: 3,
    levelMin: 3,
    levelMax: 6,
    safe: false,
    biome: { ground: 0x474459, fog: 0x6a5f80, fogNear: 30, fogFar: 120, accent: 0x9b7fd4 },
  },
  {
    id: "yermo",
    name: "Yermo Ceniciento",
    subtitle: "Donde la tierra misma arde",
    center: { x: 300, z: 300 },
    bounds: boundsAround(300, 300),
    spawn: { x: 300, z: 350 },
    levelReq: 6,
    levelMin: 6,
    levelMax: 9,
    safe: false,
    biome: { ground: 0x53433c, fog: 0x7a5148, fogNear: 28, fogFar: 115, accent: 0xff7a3c },
  },
  {
    id: "trono",
    name: "Trono del Rey Nihil",
    subtitle: "El corazón de la maldición",
    center: { x: 600, z: 150 },
    bounds: boundsAround(600, 150),
    spawn: { x: 600, z: 200 },
    levelReq: 9,
    levelMin: 9,
    levelMax: 10,
    safe: false,
    biome: { ground: 0x2b2733, fog: 0x3a2f45, fogNear: 26, fogFar: 108, accent: 0xff3b3b },
  },
];

/** id del mapa seguro / punto de partida. */
export const TOWN_ZONE_ID = "pueblo";

export function getZone(id: string): Zone {
  const z = ZONES.find((zn) => zn.id === id);
  if (!z) throw new Error(`getZone: mapa desconocido ${id}`);
  return z;
}

export function firstZone(): Zone {
  return getZone(TOWN_ZONE_ID);
}

/** ¿El jugador de nivel `level` puede viajar a este mapa? (gate por nivel). */
export function canEnterZone(z: Zone, level: number): boolean {
  return level >= z.levelReq;
}

/**
 * Mapa al que pertenece una posición global: el mapa cuyos bounds la contienen
 * (los mapas no se solapan). Si ninguno la contiene (en un hueco), devuelve el de
 * centro más cercano como fallback, así el bioma/niebla siempre está definido.
 */
export function zoneAt(x: number, z: number): Zone {
  for (const zn of ZONES) {
    if (x >= zn.bounds.minX && x <= zn.bounds.maxX && z >= zn.bounds.minZ && z <= zn.bounds.maxZ) {
      return zn;
    }
  }
  let best = ZONES[0];
  let bestD = Infinity;
  for (const zn of ZONES) {
    const d = distance2D(x, z, zn.center.x, zn.center.z);
    if (d < bestD) { bestD = d; best = zn; }
  }
  return best;
}
