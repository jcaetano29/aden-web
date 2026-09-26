import { CATALOG_ITEMS } from './catalog.js';
import { createItemInstance } from './itemOptions.js';
import type { Quest } from './quests.js';
import { CRYPT_SEALS, CRYPT_WAVE_SIZE } from './dungeon.js';

const CLASS_WEAPONS: Record<string, string> = {
  knight: 'aden_punal_del_umbral', barbarian: 'aden_destral_del_lenador_gris', rogue: 'aden_punal_del_umbral',
  mage: 'aden_baston_del_huesero', ranger: 'aden_arco_de_la_senda',
};

/** Base de la recompensa: el servidor agrega calidad/mejora y un nonce único por recorrido. */
export function dungeonReward(className: string): string { return CLASS_WEAPONS[className] ?? CLASS_WEAPONS.knight; }

export function questReward(q: Quest, className: string): string | undefined {
  const id = q.rewardByClass?.[className] ?? q.rewardItemId;
  if (q.id === 'q2' && id && CATALOG_ITEMS[id]) {
    return createItemInstance(CATALOG_ITEMS[id], { quality: 'magic', level: 2 }, `q2_${className}`);
  }
  return id;
}

export function dungeonObjective(stage: number, kills: number): string {
  const count = Math.max(0, Math.min(CRYPT_WAVE_SIZE, Math.floor(kills)));
  return [
    `Despejá la Sala del Despertar: ${count}/${CRYPT_WAVE_SIZE} criaturas`,
    `Activá el primer sello (oeste, ${CRYPT_SEALS[0].x} / ${CRYPT_SEALS[0].z})`,
    `Despejá la Fragua: ${count}/${CRYPT_WAVE_SIZE} criaturas. ¡Esquivá el golpe del Behemoth!`,
    `Activá el segundo sello (este, ${CRYPT_SEALS[1].x} / ${CRYPT_SEALS[1].z})`,
    'Derrotá al Custodio al norte. ¡Salí del círculo anunciado!',
    'Cripta completada. Volvé al pueblo; la expedición reinicia cuando salgan todos.',
  ][stage] ?? 'Entrá en la Cripta para comenzar.';
}

// Pools editoriales: una actividad tiene identidad, sin sortear todo el catálogo.
// Las bases fuera de esta selección siguen válidas para inventarios existentes y contenido futuro.
const POOLS: Record<string, Record<string, string[]>> = {
  bosque: {
    skeleton_minion: ['aden_guantes_de_la_senda_del_alba', 'aden_guantes_de_el_acolito_del_velo', 'aden_guantes_de_la_raiz_errante'],
    skeleton_warrior: ['aden_botas_de_la_senda_del_alba', 'aden_botas_de_el_acolito_del_velo', 'aden_botas_de_la_raiz_errante'],
    umbra_orc: ['aden_rodela_del_recluta', 'aden_maza_del_peregrino'],
    forest_troll: ['aden_grebas_de_la_senda_del_alba', 'aden_grebas_de_el_acolito_del_velo', 'aden_grebas_de_la_raiz_errante'],
    umbra_alpha: ['aden_sello_del_veneno_antiguo', 'aden_anillo_del_vendaval'],
    chest_bosque: ['aden_yelmo_de_la_senda_del_alba', 'aden_yelmo_de_el_acolito_del_velo', 'aden_yelmo_de_la_raiz_errante'],
  },
  ruinas: {
    crypt_minion: ['aden_coraza_de_la_senda_del_alba', 'aden_coraza_de_el_acolito_del_velo', 'aden_coraza_de_la_raiz_errante'],
    crypt_warrior: ['aden_hoja_del_primer_juramento', 'aden_hacha_del_puno_rojo'],
    crypt_wraith: ['aden_tomo_del_orbe_arcano'],
    bone_warden: ['aden_broquel_de_la_guardia_gris', 'aden_lanza_del_camino_largo'],
    crypt_sentinel: ['aden_anillo_de_escarcha_silente', 'aden_colgante_del_trueno_gris'],
    chest_ruinas: ['aden_sello_del_eter', 'aden_medallon_de_la_voluntad'],
  },
  cripta: {
    crypt_acolyte: ['aden_tomo_de_la_esfera_ignea', 'aden_sello_del_eter'],
    crypt_stalker: ['aden_anillo_del_vendaval'],
    crypt_flameguard: ['aden_aguja_de_la_frontera', 'aden_lanza_del_camino_largo'],
    crypt_emberbeast: ['aden_sortija_de_brasa'],
    crypt_behemoth: ['aden_medallon_de_la_pira'],
    crypt_warden: ['aden_gema_del_pacto', 'aden_medallon_de_la_pira', 'aden_sortija_de_brasa'],
  },
  yermo: {
    ash_minion: ['aden_yelmo_de_el_juramento_de_aden', 'aden_guantes_de_el_juramento_de_aden'],
    ash_warrior: ['aden_grebas_de_el_juramento_de_aden', 'aden_botas_de_el_juramento_de_aden'],
    infernal_demon: ['aden_arco_del_fresno_gris', 'aden_cayado_del_heraldo', 'aden_escudo_del_astado'],
    chest_yermo: ['aden_amuleto_del_invierno', 'aden_colgante_del_cefiro'],
  },
  fragua: {
    ember_imp: ['aden_guantes_de_el_bastion_de_ceniza', 'aden_guantes_de_el_enigma_de_umbra', 'aden_guantes_de_el_vendaval_gris'],
    young_drake: ['aden_botas_de_el_bastion_de_ceniza', 'aden_botas_de_el_enigma_de_umbra', 'aden_botas_de_el_vendaval_gris'],
    forge_construct: ['aden_yelmo_de_el_bastion_de_ceniza', 'aden_yelmo_de_el_enigma_de_umbra', 'aden_yelmo_de_el_vendaval_gris'],
    primal_smelter: ['aden_filo_de_brasa_viva', 'aden_hacha_de_guerra_de_aden', 'aden_vara_de_la_mirada_petrea', 'aden_paves_de_la_muralla'],
    vharzul: ['aden_sable_del_astronomo', 'aden_asta_de_doble_luna', 'aden_egida_de_la_sierpe', 'aden_ballesta_del_rayo_blanco'],
    magma_wyrm: ['aden_egida_de_la_sierpe'],
    chest_fragua: ['aden_grebas_de_el_bastion_de_ceniza', 'aden_grebas_de_el_enigma_de_umbra', 'aden_grebas_de_el_vendaval_gris'],
  },
  minas: {
    mine_digger: ['aden_guantes_de_la_escama_de_brasa', 'aden_botas_de_la_escama_de_brasa'],
    mine_armor: ['aden_yelmo_de_la_escama_de_brasa', 'aden_grebas_de_la_escama_de_brasa'],
    cave_troll: ['aden_escudo_de_los_sepultados', 'aden_rodela_del_circulo_de_aden'],
    mine_foreman: ['aden_corvo_de_la_marca_gris', 'aden_pica_de_la_sierpe', 'aden_destral_silvano', 'aden_baculo_de_la_tormenta'],
    halden: ['aden_coraza_de_el_bastion_de_ceniza', 'aden_coraza_de_el_enigma_de_umbra', 'aden_coraza_de_el_vendaval_gris'],
    iron_colossus: ['aden_hoja_de_la_sierpe_palida', 'aden_escudo_del_cerco_espinado'],
    chest_minas: ['aden_yelmo_de_la_escama_de_brasa', 'aden_escudo_de_los_sepultados'],
  },
  trono: {
    ancient_drake: ['aden_coraza_de_el_juramento_de_aden', 'aden_ballesta_del_sol_bajo'],
    skeleton_king: ['aden_filo_del_verdugo', 'aden_bifaz_del_bastion', 'aden_lanza_de_sangre_antigua', 'aden_escudo_de_la_cometa_negra', 'aden_gema_del_azar'],
  },
};

export function catalogDropPool(mapId: string, lootId: string): string[] {
  return [...(POOLS[mapId]?.[lootId] ?? [])];
}
