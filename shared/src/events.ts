/** Eventos de servidor: invasiones de jefes (reglas puras; el servidor aporta reloj y azar). */
export const INVASION_WARNING_MS = 300_000;
export const INVASION_DURATION_MS = 1_200_000;
export const INVASION_RADIUS = 30;
export const INVASION_RESERVE_MS = 60_000;
export const INVASION_MIN_LEVEL = 10;
export const MINOR_MIN_PLAYERS = 2;
export const PARTICIPATION_MIN_SHARE = 0.01;
export const PARTICIPATION_GEM_CHANCE = 0.15;
export const UPGRADE_GEMS: readonly string[] = ['aden_gema_del_pacto', 'aden_gema_del_azar', 'aden_prisma_del_caos', 'aden_gema_del_pulso'];
const HOUR = 3_600_000, DAY = 24 * HOUR, DAILY_UTC_HOUR = 0; // 21:00 Argentina (UTC−3, sin horario de verano)

export interface InvaderDef {
  id: string;
  templateId: string;
  kind: 'daily' | 'minor';
  maps: readonly string[];
  /** Piezas únicas del catálogo que sólo caen en invasiones. */
  uniqueLoot: readonly string[];
  uniqueChance: number;
  guaranteedGem: boolean;
  rewardGold: number;
  rewardExp: number;
  /** `{map}` se reemplaza por el nombre del mapa. */
  arrival: string;
  retreat: string;
}

const WINGS = ['aden_alas_de_la_vigilia', 'aden_alas_del_firmamento_roto', 'aden_alas_del_exiliado'];
const PETS = ['aden_lumen_custodio', 'aden_diablillo_de_ceniza', 'aden_cuerno_del_corcel_umbrio'];

export const INVADERS: Record<string, InvaderDef> = {
  crimson_dragon: {
    id: 'crimson_dragon', templateId: 'crimson_dragon', kind: 'daily', maps: ['pueblo', 'marismas', 'minas', 'fragua'],
    uniqueLoot: [...WINGS, ...PETS], uniqueChance: 1, guaranteedGem: true, rewardGold: 800, rewardExp: 20000,
    arrival: 'Se avistan dragones sobre {map}', retreat: 'El Dragón Carmesí se retira hacia las montañas.',
  },
  waste_herald: {
    id: 'waste_herald', templateId: 'waste_herald', kind: 'minor', maps: ['bosque', 'ruinas', 'yermo'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 200, rewardExp: 1500,
    arrival: 'Un Heraldo del Yermo abre una grieta en {map}', retreat: 'El Heraldo del Yermo vuelve a su grieta.',
  },
  veil_specter: {
    id: 'veil_specter', templateId: 'veil_specter', kind: 'minor', maps: ['marismas', 'monasterio'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 350, rewardExp: 5000,
    arrival: 'Un Espectro del Velo se alza en {map}', retreat: 'El Espectro del Velo se disuelve en la niebla.',
  },
  ember_colossus: {
    id: 'ember_colossus', templateId: 'ember_colossus', kind: 'minor', maps: ['minas', 'fragua'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 700, rewardExp: 15000,
    arrival: 'Un Coloso de Brasa emerge de la roca en {map}', retreat: 'El Coloso de Brasa se hunde en la lava.',
  },
};

/** Claros abiertos por mapa, a más de 30 unidades del punto de reaparición. */
export const INVASION_SPOTS: Record<string, { x: number; z: number }> = {
  pueblo: { x: 0, z: -24 }, bosque: { x: 300, z: 0 }, ruinas: { x: 0, z: 300 }, yermo: { x: 300, z: 300 },
  marismas: { x: 1200, z: 150 }, monasterio: { x: 1200, z: 450 }, minas: { x: 1500, z: 150 }, fragua: { x: 1500, z: 450 },
};

export function getInvader(id: string): InvaderDef {
  const inv = INVADERS[id];
  if (!inv) throw new Error(`Invasor desconocido: ${id}`);
  return inv;
}

/** Invasor al que pertenece una plantilla de mob (undefined si no es invasor). */
export function invaderForTemplate(templateId: string): InvaderDef | undefined {
  return Object.values(INVADERS).find(i => i.templateId === templateId);
}

/** Inicio de la próxima gran invasión (21:00 Argentina) estrictamente después de `now`. */
export function nextDailyInvasion(now: number): number {
  const day = Math.floor(now / DAY) * DAY + DAILY_UTC_HOUR * HOUR;
  return day > now ? day : day + DAY;
}

/** Inicio de la próxima invasión chica: 2–4 h después de `from`, sin pisar la gran invasión. */
export function nextMinorInvasion(from: number, rng: () => number): number {
  const at = from + 2 * HOUR + Math.floor(rng() * 2 * HOUR);
  const daily = nextDailyInvasion(from);
  const clash = at > daily - HOUR / 2 && at < daily + INVASION_DURATION_MS + HOUR / 2;
  return clash ? daily + INVASION_DURATION_MS + HOUR / 2 : at;
}

export function inInvasionArea(ev: { phase: string; mapId: string; x: number; z: number; radius: number }, mapId: string, x: number, z: number): boolean {
  return ev.phase === 'active' && ev.mapId === mapId && Math.hypot(x - ev.x, z - ev.z) <= ev.radius;
}

/** Los menores de nivel 10 no pelean en el área de invasión ni son blanco del invasor. */
export function invasionProtected(level: number): boolean {
  return level < INVASION_MIN_LEVEL;
}
