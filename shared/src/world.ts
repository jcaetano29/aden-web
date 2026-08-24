import { distance2D } from "./math.js";

/**
 * El Mundo de Aden (Etapa 11): en lugar de un único plano genérico, el mundo se
 * divide en ZONAS encadenadas de sur (seguro) a norte (peligro creciente). Cada
 * zona tiene identidad visual (bioma), rango de nivel recomendado y un centro/radio
 * que define su "footprint" en el mapa. Este módulo es la fuente de verdad
 * compartida: el server la usa para organizar spawns y el cliente para pintar los
 * biomas, la niebla, el minimapa y el cartel de zona.
 *
 * Norte = -Z (más profundo, más peligroso), encaja con el lore ("las Ruinas del
 * Norte"). El pueblo está al sur (+Z).
 */

/** Paleta visual de un bioma (colores en hex 0xRRGGBB). Puramente presentación. */
export interface ZoneBiome {
  /** Color base del suelo de la zona. */
  ground: number;
  /** Color de la niebla ambiental cuando el jugador está en la zona. */
  fog: number;
  /** Distancia a la que arranca la niebla (más chico = más cerrado/opresivo). */
  fogNear: number;
  /** Distancia a la que la niebla es total. */
  fogFar: number;
  /** Color de acento (partículas, luz, props) que define el mood de la zona. */
  accent: number;
}

export interface Zone {
  id: string;
  /** Nombre para el cartel de zona y el minimapa. */
  name: string;
  /** Subtítulo del cartel (una línea de flavor). */
  subtitle: string;
  center: { x: number; z: number };
  /** Radio del footprint de la zona (para pintar el bioma y detectar entrada). */
  radius: number;
  /** Nivel recomendado (para señalizar peligro). 0/0 = zona segura sin combate. */
  levelMin: number;
  levelMax: number;
  /** Zona segura del pueblo (sin combate/PvP). */
  safe: boolean;
  biome: ZoneBiome;
}

export const ZONES: Zone[] = [
  {
    id: "pueblo",
    name: "Pueblo de Aden",
    subtitle: "Refugio de los vivos",
    center: { x: 0, z: 30 },
    radius: 18,
    levelMin: 0,
    levelMax: 0,
    safe: true,
    biome: { ground: 0x4a7c3a, fog: 0xbcd9f0, fogNear: 45, fogFar: 170, accent: 0xffd54f },
  },
  {
    id: "bosque",
    name: "Bosque de Umbra",
    subtitle: "Los huesos despiertan bajo los árboles",
    center: { x: 0, z: -14 },
    radius: 30,
    levelMin: 1,
    levelMax: 3,
    safe: false,
    biome: { ground: 0x2f5a2c, fog: 0x8fae86, fogNear: 30, fogFar: 125, accent: 0x6fae57 },
  },
  {
    id: "ruinas",
    name: "Ruinas de Nihil",
    subtitle: "Piedra caída, guardianes que no descansan",
    center: { x: -34, z: -64 },
    radius: 26,
    levelMin: 3,
    levelMax: 6,
    safe: false,
    biome: { ground: 0x474459, fog: 0x6a5f80, fogNear: 24, fogFar: 105, accent: 0x9b7fd4 },
  },
  {
    id: "yermo",
    name: "Yermo Ceniciento",
    subtitle: "Donde la tierra misma arde",
    center: { x: 30, z: -82 },
    radius: 26,
    levelMin: 6,
    levelMax: 9,
    safe: false,
    biome: { ground: 0x53433c, fog: 0x7a5148, fogNear: 22, fogFar: 98, accent: 0xff7a3c },
  },
  {
    id: "trono",
    name: "Trono del Rey Nihil",
    subtitle: "El corazón de la maldición",
    center: { x: 0, z: -120 },
    radius: 18,
    levelMin: 9,
    levelMax: 10,
    safe: false,
    biome: { ground: 0x2b2733, fog: 0x3a2f45, fogNear: 20, fogFar: 92, accent: 0xff3b3b },
  },
];

export function getZone(id: string): Zone {
  const z = ZONES.find((zn) => zn.id === id);
  if (!z) throw new Error(`getZone: zona desconocida ${id}`);
  return z;
}

/**
 * Devuelve la zona a la que pertenece una posición del mundo. Partición por
 * "centro más cercano" (Voronoi): garantiza que TODA posición cae en exactamente
 * una zona (sin huecos ni ambigüedad), así el bioma/niebla siempre está definido.
 */
export function zoneAt(x: number, z: number): Zone {
  let best = ZONES[0];
  let bestD = Infinity;
  for (const zn of ZONES) {
    const d = distance2D(x, z, zn.center.x, zn.center.z);
    if (d < bestD) {
      bestD = d;
      best = zn;
    }
  }
  return best;
}
