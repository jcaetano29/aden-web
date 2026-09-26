import { getTemplate } from './mobs.js';
import { getItem } from './items.js';
import type { Rarity } from './equipment.js';
import type { QualityOdds } from './itemOptions.js';

/**
 * Botín del catálogo. Cada enemigo o cofre tiene una selección editorial corta (identidad por
 * actividad). La fuente decide cuán seguido cae una pieza y cuán buena sale (Excelente, +N);
 * dentro de la lista, lo más valioso (gemas, tomos fuertes) cae menos. Las alas y mascotas
 * quedan fuera: son botín de eventos.
 */
export type LootSource = 'normal' | 'elite' | 'boss' | 'chest';

/** Probabilidad de soltar una pieza del catálogo por muerte o cofre. */
export const CATALOG_DROP_CHANCE: Record<LootSource, number> = { normal: 0.25, elite: 0.4, boss: 0.9, chest: 0.5 };

/** Calidad según la fuente: los jefes y élites dan el botín valioso. */
export const LOOT_QUALITY_ODDS: Record<LootSource, QualityOdds> = {
  normal: { excellent: 0.04, upgrade: 0.2 }, chest: { excellent: 0.08, upgrade: 0.35 },
  elite: { excellent: 0.1, upgrade: 0.35 }, boss: { excellent: 0.25, upgrade: 0.8 },
};

/** Peso de cada pieza dentro de su lista según su rareza visible. */
export const RARITY_WEIGHT: Partial<Record<Rarity, number>> = { common: 10, uncommon: 4, rare: 1 };

// Sets por pieza (yelmo, coraza, grebas, guantes, botas).
const set = (piece: string, ...names: string[]) => names.map(n => `aden_${piece}_${n}`);
const ACT1_SETS = ['de_la_senda_del_alba', 'de_el_acolito_del_velo', 'de_la_raiz_errante'];
const OATH = 'de_el_juramento_de_aden', EMBER_SCALE = 'de_la_escama_de_brasa';
const FORGE_SETS = ['de_el_bastion_de_ceniza', 'de_el_enigma_de_umbra', 'de_el_vendaval_gris'];
const MIST = ['yelmo', 'coraza', 'grebas', 'guantes', 'botas'].map(p => `aden_${p}_de_la_bruma_silvana`);
const BONE = ['yelmo', 'coraza', 'grebas', 'guantes', 'botas'].map(p => `aden_${p}_de_el_oraculo_de_hueso`);

const TIERED: Record<string, Record<string, { rare?: readonly string[]; uncommon?: readonly string[]; common?: readonly string[] }>> = {
  bosque: {
    skeleton_minion: { common: set('guantes', ...ACT1_SETS) },
    skeleton_warrior: { common: set('botas', ...ACT1_SETS) },
    umbra_orc: { uncommon: ['aden_rodela_del_recluta', 'aden_maza_del_peregrino', 'aden_pica_de_la_guardia'] },
    forest_troll: { common: set('grebas', ...ACT1_SETS), uncommon: ['aden_ballesta_del_vigia'] },
    umbra_alpha: { uncommon: ['aden_sello_del_veneno_antiguo', 'aden_anillo_del_vendaval', 'aden_sortija_de_la_otra_faz'] },
    chest_bosque: { common: [...set('yelmo', ...ACT1_SETS), 'aden_fruto_carmesi', 'aden_frasco_de_savia_menor'] },
  },
  ruinas: {
    crypt_minion: { common: set('coraza', ...ACT1_SETS) },
    crypt_warrior: { uncommon: ['aden_hoja_del_primer_juramento', 'aden_hacha_del_puno_rojo'] },
    crypt_wraith: { uncommon: ['aden_tomo_del_orbe_arcano', 'aden_tomo_del_tosigo'] },
    bone_warden: { uncommon: ['aden_broquel_de_la_guardia_gris', 'aden_lanza_del_camino_largo'] },
    crypt_sentinel: { rare: ['aden_anillo_de_escarcha_silente', 'aden_colgante_del_trueno_gris'] },
    chest_ruinas: { uncommon: ['aden_sello_del_eter', 'aden_medallon_de_la_voluntad'], common: ['aden_frasco_de_savia_menor'] },
  },
  cripta: {
    crypt_acolyte: { uncommon: ['aden_tomo_de_la_esfera_ignea', 'aden_sello_del_eter'] },
    crypt_stalker: { uncommon: ['aden_anillo_del_vendaval'] },
    crypt_flameguard: { uncommon: ['aden_aguja_de_la_frontera', 'aden_lanza_del_camino_largo'] },
    crypt_emberbeast: { uncommon: ['aden_sortija_de_brasa'] },
    crypt_behemoth: { rare: ['aden_medallon_de_la_pira'] },
    crypt_warden: { rare: ['aden_gema_del_pacto'], uncommon: ['aden_medallon_de_la_pira', 'aden_sortija_de_brasa'], common: ['aden_tonico_de_sangre'] },
  },
  yermo: {
    ash_minion: { common: set('yelmo', OATH).concat(set('guantes', OATH)) },
    ash_warrior: { common: set('grebas', OATH).concat(set('botas', OATH)), uncommon: ['aden_tomo_de_la_onda_astral'] },
    infernal_demon: { uncommon: ['aden_arco_del_fresno_gris', 'aden_cayado_del_heraldo', 'aden_escudo_del_astado', 'aden_tomo_de_escarcha'] },
    chest_yermo: { uncommon: ['aden_amuleto_del_invierno', 'aden_colgante_del_cefiro'], common: ['aden_tonico_de_sangre'] },
  },
  trono: {
    ancient_drake: { common: set('coraza', OATH), uncommon: ['aden_ballesta_del_sol_bajo'] },
    skeleton_king: {
      rare: ['aden_gema_del_azar'],
      uncommon: ['aden_filo_del_verdugo', 'aden_bifaz_del_bastion', 'aden_lanza_de_sangre_antigua', 'aden_escudo_de_la_cometa_negra'],
      common: ['aden_tonico_de_sangre', 'aden_tonico_de_eter'],
    },
  },
  marismas: {
    veil_raider: { common: [...MIST, 'aden_malta_del_caminante'], uncommon: ['aden_espada_del_vigia', 'aden_estrella_del_alba_muerta'] },
    veil_guardian: { common: BONE, uncommon: ['aden_egida_de_la_arboleda'], rare: ['aden_tomo_del_torbellino', 'aden_tomo_del_paso_etereo'] },
  },
  monasterio: {
    memory_guard: { common: ['aden_coraza_de_la_escama_de_brasa', 'aden_tonico_de_sangre'], uncommon: ['aden_vara_de_la_sierpe_sabia', 'aden_gladio_de_las_cenizas', 'aden_hacha_de_la_estepa'] },
    memory_jailer: { uncommon: ['aden_tridente_del_coloso_hundido', 'aden_arco_de_la_arboleda_velada', 'aden_tonico_de_eter'], rare: ['aden_tomo_del_relampago'] },
    memory_prior: {
      rare: ['aden_gema_del_pulso', 'aden_tomo_de_la_llama'],
      uncommon: ['aden_arco_de_la_arboleda_velada', 'aden_vara_de_la_sierpe_sabia'],
      common: ['aden_tonico_de_sangre', 'aden_tonico_de_eter'],
    },
  },
  minas: {
    mine_digger: { common: set('guantes', EMBER_SCALE).concat(set('botas', EMBER_SCALE)) },
    mine_armor: { common: set('yelmo', EMBER_SCALE).concat(set('grebas', EMBER_SCALE)) },
    cave_troll: { uncommon: ['aden_escudo_de_los_sepultados', 'aden_rodela_del_circulo_de_aden'] },
    mine_foreman: { uncommon: ['aden_corvo_de_la_marca_gris', 'aden_pica_de_la_sierpe', 'aden_destral_silvano', 'aden_baculo_de_la_tormenta'], common: ['aden_tonico_de_sangre'] },
    halden: {
      rare: ['aden_prisma_del_caos', 'aden_tomo_del_espectro_hostil', 'aden_tomo_del_meteoro'],
      uncommon: ['aden_elixir_de_vida_plena', 'aden_elixir_de_mana_pleno'],
      common: set('coraza', ...FORGE_SETS),
    },
    iron_colossus: { uncommon: ['aden_hoja_de_la_sierpe_palida', 'aden_escudo_del_cerco_espinado'], rare: ['aden_tomo_del_meteoro'] },
    chest_minas: { common: [...set('yelmo', EMBER_SCALE), 'aden_tonico_de_sangre'], uncommon: ['aden_escudo_de_los_sepultados', 'aden_elixir_de_mana_pleno'] },
  },
  fragua: {
    ember_imp: { common: set('guantes', ...FORGE_SETS) },
    young_drake: { common: set('botas', ...FORGE_SETS) },
    forge_construct: { common: set('yelmo', ...FORGE_SETS) },
    primal_smelter: { uncommon: ['aden_filo_de_brasa_viva', 'aden_hacha_de_guerra_de_aden', 'aden_vara_de_la_mirada_petrea', 'aden_paves_de_la_muralla'], common: ['aden_elixir_de_vida_plena'] },
    vharzul: {
      rare: ['aden_tomo_del_fuego_abisal', 'aden_prisma_del_caos'],
      uncommon: ['aden_sable_del_astronomo', 'aden_asta_de_doble_luna', 'aden_egida_de_la_sierpe', 'aden_ballesta_del_rayo_blanco'],
      common: ['aden_elixir_de_vida_plena', 'aden_elixir_de_mana_pleno'],
    },
    magma_wyrm: { rare: ['aden_egida_de_la_sierpe', 'aden_tomo_del_fuego_abisal'], uncommon: ['aden_elixir_de_mana_pleno'] },
    chest_fragua: { common: set('grebas', ...FORGE_SETS), uncommon: ['aden_elixir_de_vida_plena', 'aden_elixir_de_mana_pleno'] },
  },
};

// La agrupación sólo ordena la lectura; la rareza visible de cada pieza decide su peso.
const LOOT_POOLS: Record<string, Record<string, readonly string[]>> = Object.fromEntries(Object.entries(TIERED).map(([mapId, sources]) =>
  [mapId, Object.fromEntries(Object.entries(sources).map(([lootId, t]) => [lootId, [...(t.rare ?? []), ...(t.uncommon ?? []), ...(t.common ?? [])]]))]));

/** Todas las piezas posibles de una fuente. */
export function catalogDropPool(mapId: string, lootId: string): string[] {
  return [...(LOOT_POOLS[mapId]?.[lootId] ?? [])];
}

export function lootSourceFor(lootId: string): LootSource {
  if (lootId.startsWith('chest_')) return 'chest';
  try { return getTemplate(lootId).rank; } catch { return 'normal'; }
}

/** Decide si la fuente suelta una pieza y cuál, ponderando por valor (undefined si no suelta). */
export function rollCatalogDrop(mapId: string, lootId: string, rng: () => number): string | undefined {
  const pool = LOOT_POOLS[mapId]?.[lootId];
  if (!pool?.length || rng() >= CATALOG_DROP_CHANCE[lootSourceFor(lootId)]) return undefined;
  const weights = pool.map(id => RARITY_WEIGHT[getItem(id).rarity ?? 'common'] ?? 1);
  let pick = rng() * weights.reduce((a, b) => a + b, 0);
  for (const [i, id] of pool.entries()) { pick -= weights[i]; if (pick < 0) return id; }
  return pool[pool.length - 1];
}
