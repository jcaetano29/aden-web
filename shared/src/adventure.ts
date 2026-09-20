import { CATALOG_ITEMS } from './catalog.js';
import { createItemInstance } from './itemOptions.js';
import type { Quest } from './quests.js';

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
  const count = Math.max(0, Math.min(3, Math.floor(kills)));
  return [
    `Derrotá a los acólitos de la sala sur: ${count}/3`,
    'Activá el primer sello (oeste, 890 / 15)',
    `Derrotá a los guardias de la sala central: ${count}/3`,
    'Activá el segundo sello (este, 910 / -12)',
    'Derrotá al Custodio al norte. ¡Salí del círculo anunciado!',
    'Cripta completada. Recibiste tu arma; volvé con Rowan.',
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
    crypt_flameguard: ['aden_aguja_de_la_frontera', 'aden_lanza_del_camino_largo'],
    crypt_warden: ['aden_gema_del_pacto', 'aden_medallon_de_la_pira', 'aden_sortija_de_brasa'],
  },
  yermo: {
    ash_minion: ['aden_yelmo_de_el_juramento_de_aden', 'aden_guantes_de_el_juramento_de_aden'],
    ash_warrior: ['aden_grebas_de_el_juramento_de_aden', 'aden_botas_de_el_juramento_de_aden'],
    infernal_demon: ['aden_arco_del_fresno_gris', 'aden_cayado_del_heraldo', 'aden_escudo_del_astado'],
    chest_yermo: ['aden_amuleto_del_invierno', 'aden_colgante_del_cefiro'],
  },
  trono: {
    ancient_drake: ['aden_coraza_de_el_juramento_de_aden', 'aden_ballesta_del_sol_bajo'],
    skeleton_king: ['aden_filo_del_verdugo', 'aden_bifaz_del_bastion', 'aden_lanza_de_sangre_antigua', 'aden_escudo_de_la_cometa_negra', 'aden_gema_del_azar'],
  },
};

export function catalogDropPool(mapId: string, lootId: string): string[] {
  return [...(POOLS[mapId]?.[lootId] ?? [])];
}
