import type { Quest } from './quests.js';

/** Fragua de los Primeros (Acto II · cap. 2, niveles 20–25). Lugares de referencia del mapa. */
export const FORGE_LAVA = [
  { x: 1468, z: 462, width: 10, depth: 24 },
  { x: 1532, z: 462, width: 10, depth: 24 },
  { x: 1473, z: 432, width: 24, depth: 5 },
  { x: 1527, z: 432, width: 24, depth: 5 },
] as const;
/** Centro de la arena de Vharzul. */
export const FORGE_ARENA = { x: 1500, z: 396 } as const;
export const FORGE_ANVILS: readonly string[] = ['forge_anvil_1', 'forge_anvil_2', 'forge_anvil_3'];
export const FORGE_RUNES: readonly string[] = ['forge_rune_1', 'forge_rune_2', 'forge_rune_3'];

export const FORGE_COMPLETE = 'forge_complete';
export const FORGE_QUEST_ORDER = ['f_caldera', 'f_rune_1', 'f_rune_2', 'f_rune_3', 'f_imps', 'f_drakes', 'f_constructs', 'f_smelter', 'f_anvil_1', 'f_anvil_2', 'f_anvil_3', 'f_vharzul'];

function mission(id: string, title: string, objective: Quest['objective'], targetId: string, amount: number, rewardExp: number, rewardGold: number, intro: string, done: string, autoAdvance = false, returnNpcId = 'ysolde'): Quest {
  const back = returnNpcId === 'smith' ? ' Después llevale la noticia a Dorne en Aden.' : ' Volvé con Ysolde en el campamento de la caldera al completar el objetivo.';
  return { id, title, objective, targetId, amount, rewardExp, rewardGold, intro, done, autoAdvance, returnNpcId, mapId: 'fragua',
    mobTemplateId: objective === 'kill' ? targetId : '', hint: `${intro}${autoAdvance ? ' Después seguí el siguiente marcador.' : back}` };
}

export const FORGE_QUESTS: Record<string, Quest> = {
  f_caldera: mission('f_caldera', 'La guardiana de las runas', 'visit', 'fragua', 1, 2500, 300,
    'Halden confesó que despertó a Vharzul, el dragón del que nacieron las dos llamas, para encender la Fragua de los Primeros. Viajá con M a la caldera y buscá a Ysolde, guardiana de las runas, en el campamento del sur.',
    'Soy Ysolde. Mi linaje custodió estas runas desde antes de Aden. Halden está bajo mi custodia: quiere reparar lo que hizo. La Fragua late otra vez, y con ella late el dragón.'),
  f_rune_1: mission('f_rune_1', 'Los pilares de los primeros · oeste', 'interact', 'forge_rune_1', 1, 0, 0,
    'Activá el pilar rúnico del oeste (1480, 484). Las runas de los primeros herreros guardan la forma de contener la llama.', '', true),
  f_rune_2: mission('f_rune_2', 'Los pilares de los primeros · este', 'interact', 'forge_rune_2', 1, 0, 0,
    'Activá el pilar rúnico del este (1520, 484).', '', true),
  f_rune_3: { ...mission('f_rune_3', 'Los pilares de los primeros', 'interact', 'forge_rune_3', 1, 3500, 300,
    'Activá el pilar central, junto al paso de lava (1500, 446).',
    'Los pilares responden: la llama todavía obedece a quien conoce su nombre. Pero cada vez que Vharzul respira, los yunques forjan un guardián nuevo.'), rewardItemId: 'greater_potion', rewardItemQty: 5 },
  f_imps: mission('f_imps', 'Chispas con hambre', 'kill', 'ember_imp', 10, 4000, 350,
    'Los Imps de Brasa se alimentan de las chispas de la caldera, al oeste y al este del campamento. Derrotá a 10 antes de que avisen al dragón.',
    'Menos chispas, menos ojos. Halden dice que los imps nacieron del primer fuego que encendió.'),
  f_drakes: { ...mission('f_drakes', 'La cría del dragón', 'kill', 'young_drake', 6, 4500, 400,
    'Los Dracos Jóvenes anidan junto a los canales de lava, en los extremos oeste y este. Derrotá a 6: son la cría de Vharzul.',
    'La cría duerme otra vez. Tomá esta coraza de las reservas de la Hermandad; Halden la templó para quien tuviera que llegar hasta aquí.'),
    rewardByClass: { knight: 'aden_coraza_de_el_bastion_de_ceniza', barbarian: 'aden_coraza_de_el_bastion_de_ceniza', mage: 'aden_coraza_de_el_enigma_de_umbra', rogue: 'aden_coraza_de_el_vendaval_gris', ranger: 'aden_coraza_de_el_vendaval_gris' } },
  f_constructs: mission('f_constructs', 'Nombres en el hierro', 'kill', 'forge_construct', 6, 2500, 400,
    'Los Guardianes Forjados patrullan al norte del paso de lava. Cada uno lleva el nombre de alguien que no pidió volver. Derrotá a 6 y dejalos descansar.',
    'Los nombres grabados en su hierro vuelven a ser solo nombres. Brenna los va a anotar, uno por uno.'),
  f_smelter: { ...mission('f_smelter', 'El fundidor primordial', 'kill', 'primal_smelter', 1, 1500, 500,
    'El Fundidor Primordial, nivel 24, alimenta la Fragua desde el paso norte (1500, 420). Marca el suelo con metal fundido: no te quedes dentro del círculo.',
    'Sin el fundidor, la Fragua se enfría un poco. Tomá esta arma: el metal todavía guarda el calor de la caldera.'),
    rewardByClass: { knight: 'aden_filo_de_brasa_viva', barbarian: 'aden_asta_de_doble_luna', ranger: 'aden_ballesta_del_rayo_blanco', mage: 'aden_sable_del_astronomo', rogue: 'ember_dagger' } },
  f_anvil_1: mission('f_anvil_1', 'Los tres yunques · oeste', 'interact', 'forge_anvil_1', 1, 0, 0,
    'Examiná el yunque oeste de la arena (1489, 400). Cuando Vharzul despierte, cada yunque forjará un guardián.', '', true),
  f_anvil_2: mission('f_anvil_2', 'Los tres yunques · este', 'interact', 'forge_anvil_2', 1, 0, 0,
    'Examiná el yunque este (1511, 400).', '', true),
  f_anvil_3: mission('f_anvil_3', 'Los tres yunques', 'interact', 'forge_anvil_3', 1, 6000, 500,
    'Examiná el yunque del centro (1500, 408).',
    'Escuchame bien. Mientras Vharzul pelee, los yunques forjan guardianes: enfriá uno y deja de forjar. Pero cuando el dragón encienda la Fragua entera, solo un yunque todavía caliente puede cortar su aliento. No los enfríes todos antes de tiempo. Ya estás listo: la llama te reconoce.'),
  f_vharzul: { ...mission('f_vharzul', 'El corazón de la Fragua', 'kill', 'vharzul', 1, 8000, 1000,
    'Vharzul, nivel 25, duerme en la arena norte (1500, 396). Esquivá su aliento frontal y las brasas; cuando encienda la Fragua, escapá del círculo o enfriá un yunque caliente para interrumpirlo.',
    'Así que el maestro está vivo, y la Fragua duerme otra vez. Halden me mandó su martillo y una carta: se queda en la caldera para cuidar las runas, con Ysolde. Tal vez eso sea lo más parecido al perdón que pueda darle. Con el corazón del dragón forjé esto para vos: que te recuerde que el fuego sirve para dar forma, no para retener.',
    false, 'smith'), rewardItemId: 'vharzul_heart' },
};
