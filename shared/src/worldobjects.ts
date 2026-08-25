/**
 * Objetos de mundo interactivos (Etapa 16): lo que llena los mapas y da cosas que
 * HACER. Tres tipos, todos se clickean estando cerca:
 *  - "chest" (cofre): se abre una vez → botín acorde al mapa; reaparece por timer.
 *  - "breakable" (barril/urna): se rompe → botín menor; reaparece rápido (piñata de loot).
 *  - "shrine" (santuario): otorga una bendición temporal (+ataque o +defensa); cooldown.
 * Puramente data-driven: el server los instancia y resuelve, el cliente los rinde.
 */

export type WorldObjectKind = "chest" | "breakable" | "shrine";

export interface WorldObjectDef {
  id: string;
  mapId: string;
  kind: WorldObjectKind;
  x: number;
  z: number;
  /** id de tabla de loot (chest/breakable) — ver DROP_TABLES en items.ts. */
  lootId?: string;
  /** stat que potencia el santuario. */
  buff?: "atk" | "def";
}

export const OBJECT_INTERACT_RANGE = 3.5;
export const CHEST_RESPAWN_MS = 60000;
export const BREAKABLE_RESPAWN_MS = 20000;
export const SHRINE_COOLDOWN_MS = 60000;
export const SHRINE_BUFF_MS = 30000;
export const SHRINE_BUFF_MULT = 1.4;

/** Reaparición según el tipo (el santuario usa su cooldown). */
export function objectRespawnMs(kind: WorldObjectKind): number {
  switch (kind) {
    case "chest": return CHEST_RESPAWN_MS;
    case "breakable": return BREAKABLE_RESPAWN_MS;
    case "shrine": return SHRINE_COOLDOWN_MS;
  }
}

/** Genera una grilla de barriles rompibles dispersos por un mapa (relleno de loot). */
function breakables(mapId: string, pts: Array<[number, number]>): WorldObjectDef[] {
  return pts.map(([x, z], i) => ({
    id: `${mapId}_barrel_${i}`, mapId, kind: "breakable" as const, x, z, lootId: "breakable",
  }));
}

export const WORLD_OBJECTS: WorldObjectDef[] = [
  // ── Pueblo (center 0,0) — cofres de inicio + santuario ──
  { id: "pueblo_chest_1", mapId: "pueblo", kind: "chest", x: -20, z: -14, lootId: "chest_pueblo" },
  { id: "pueblo_chest_2", mapId: "pueblo", kind: "chest", x: 22, z: -18, lootId: "chest_pueblo" },
  { id: "pueblo_shrine", mapId: "pueblo", kind: "shrine", x: -12, z: 8, buff: "def" },
  ...breakables("pueblo", [[16, 10], [-24, 6], [8, -26], [-6, -30]]),

  // ── Bosque (center 300,0) ──
  { id: "bosque_chest_1", mapId: "bosque", kind: "chest", x: 250, z: 40, lootId: "chest_bosque" },
  { id: "bosque_chest_2", mapId: "bosque", kind: "chest", x: 350, z: -35, lootId: "chest_bosque" },
  { id: "bosque_shrine", mapId: "bosque", kind: "shrine", x: 300, z: 30, buff: "atk" },
  ...breakables("bosque", [[270, -10], [330, 10], [255, -40], [345, 40], [300, -50], [285, 25], [320, -25]]),

  // ── Ruinas (center 0,300) ──
  { id: "ruinas_chest_1", mapId: "ruinas", kind: "chest", x: -45, z: 320, lootId: "chest_ruinas" },
  { id: "ruinas_chest_2", mapId: "ruinas", kind: "chest", x: 45, z: 280, lootId: "chest_ruinas" },
  { id: "ruinas_shrine", mapId: "ruinas", kind: "shrine", x: 0, z: 335, buff: "def" },
  ...breakables("ruinas", [[-20, 290], [20, 330], [-40, 340], [40, 320], [0, 300], [-30, 315], [30, 285]]),

  // ── Yermo (center 300,300) ──
  { id: "yermo_chest_1", mapId: "yermo", kind: "chest", x: 255, z: 320, lootId: "chest_yermo" },
  { id: "yermo_chest_2", mapId: "yermo", kind: "chest", x: 345, z: 280, lootId: "chest_yermo" },
  { id: "yermo_shrine", mapId: "yermo", kind: "shrine", x: 300, z: 335, buff: "atk" },
  ...breakables("yermo", [[270, 290], [330, 330], [280, 340], [320, 285], [300, 305], [255, 310]]),

  // ── Trono (center 600,150) — cofres del jefe ──
  { id: "trono_chest_1", mapId: "trono", kind: "chest", x: 575, z: 175, lootId: "chest_trono" },
  { id: "trono_chest_2", mapId: "trono", kind: "chest", x: 625, z: 175, lootId: "chest_trono" },
];

export function getWorldObject(id: string): WorldObjectDef {
  const o = WORLD_OBJECTS.find((w) => w.id === id);
  if (!o) throw new Error(`getWorldObject: objeto desconocido ${id}`);
  return o;
}
