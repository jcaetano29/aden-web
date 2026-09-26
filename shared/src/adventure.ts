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

