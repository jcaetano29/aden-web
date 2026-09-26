import type { Quest } from './quests.js';

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


export const MINES_COMPLETE = 'mines_complete';
export const MINES_QUEST_ORDER = ['f_arrival', 'f_diggers', 'f_mark_1', 'f_mark_2', 'f_armors', 'f_lift', 'f_trolls', 'f_foreman', 'f_halden'];

function mission(id: string, title: string, objective: Quest['objective'], targetId: string, amount: number, rewardExp: number, rewardGold: number, intro: string, done: string, autoAdvance = false): Quest {
  return { id, title, objective, targetId, amount, rewardExp, rewardGold, intro, done, autoAdvance, returnNpcId: 'brenna', mapId: 'minas',
    mobTemplateId: objective === 'kill' ? targetId : '',
    hint: `${intro}${autoAdvance ? ' Después seguí el siguiente marcador.' : ' Volvé con Brenna en el campamento del sur al completar el objetivo.'}` };
}

/** Ballesta del catálogo mejorada (+2, mágica): ningún arco o ballesta de explorador cubre los niveles 15–20. */
export const FOREMAN_RANGER_REWARD = 'aden_trueno_de_la_frontera~1~magic~2~0~0~0~0~foreman';

export const MINES_QUESTS: Record<string, Quest> = {
  f_arrival: mission('f_arrival', 'El taller de Halden', 'visit', 'minas', 1, 1500, 200,
    'Dorne reconoció las marcas del Custodio: son de Halden, su maestro, desaparecido con la Hermandad del Yunque. Viajá con M a las Minas de Hierro Negro y buscá a la capataz Brenna en el campamento del sur.',
    'Soy Brenna. Aprendí el oficio con Dorne, bajo el mismo maestro. Desde que el Prior cayó, los mineros oyen martillos donde no trabaja nadie. Y los muertos del tajo volvieron a cavar.'),
  f_diggers: mission('f_diggers', 'Los que cavan sin descanso', 'kill', 'mine_digger', 8, 2500, 250,
    'Los Excavadores Huecos cavan en el tajo, a los lados del camino. Derrotá a 8 antes de que abran otra galería.',
    'Cavaban hacia el norte, siempre hacia el norte. Nadie los guía: los llama algo que está al fondo de la mina.'),
  f_mark_1: mission('f_mark_1', 'La runa del maestro · primera herramienta', 'interact', 'mines_mark_1', 1, 0, 0,
    'Examiná la herramienta marcada en el acopio oeste del campamento (1478, 184). Después buscá la segunda.', '', true),
  f_mark_2: { ...mission('f_mark_2', 'La runa del maestro', 'interact', 'mines_mark_2', 1, 2500, 250,
    'Examiná la segunda herramienta marcada, en el acopio este (1522, 184).',
    'La misma runa en las dos: un yunque partido por una llama. Es el sello de Halden. Dorne no se equivocaba. Tomá este escudo del acopio: abajo lo vas a necesitar.'), rewardItemId: 'aden_escudo_de_los_sepultados' },
  f_armors: mission('f_armors', 'Hierro que camina', 'kill', 'mine_armor', 8, 3000, 300,
    'Las armaduras vacías de la Hermandad caminan por el tajo, al oeste y al este. Alguien las forjó para que sirvan de cuerpo. Derrotá a 8.',
    'Adentro no hay huesos: hay un nombre grabado en cada peto. Nombres de los que liberó el Prior. Halden les está dando cuerpo.'),
  f_lift: mission('f_lift', 'Las galerías hondas', 'interact', 'mines_lift', 1, 2000, 200,
    'Poné en marcha el montacargas del castillete (1500, 136) para que la cuadrilla pueda bajar a las galerías del norte.',
    'El montacargas vuelve a girar. Abajo se oye la fragua: alguien la mantiene encendida día y noche.'),
  f_trolls: { ...mission('f_trolls', 'Lo que vive abajo', 'kill', 'cave_troll', 6, 4200, 350,
    'Los trolls de caverna subieron desde las galerías, al noroeste y al noreste. Derrotá a 6 para asegurar el paso.',
    'Huían de algo más grande que ellos. El calor sube desde la Puerta de la Fragua, al fondo de la mina.'), rewardItemId: 'greater_potion', rewardItemQty: 5 },
  f_foreman: { ...mission('f_foreman', 'El capataz de hierro', 'kill', 'mine_foreman', 1, 4200, 400,
    'El Capataz de Hierro, nivel 19, custodia el camino a la Puerta (1500, 120). Golpea con un barrido frontal: cuando levante el martillo, salí de adelante.',
    'Era la armadura del viejo capataz de la Hermandad. Halden la usa de guardián. Tomá esta arma de nuestras reservas: con la que tenés no vas a pasar la Puerta.'),
    rewardByClass: { knight: 'aden_hoja_de_la_sierpe_palida', barbarian: 'aden_pica_de_la_sierpe', ranger: FOREMAN_RANGER_REWARD, mage: 'aden_baculo_de_la_tormenta', rogue: 'gallery_dagger' } },
  f_halden: { ...mission('f_halden', 'La Puerta de la Fragua', 'kill', 'halden', 1, 5800, 600,
    'Halden espera en la Puerta de la Fragua (1500, 97), nivel 20. Barre de frente con el martillo y marca el suelo bajo tus pies; a media vida llama a dos armaduras. Detenelo.',
    'Halden está vivo, pero vencido. Dijo que no lo hizo solo: despertó a algo bajo la montaña para encender la Fragua como en los días de los primeros herreros. Dorne tiene que saberlo. Tomá esta arma del taller de Halden: la forjó para su último aprendiz.'),
    rewardByClass: { knight: 'aden_azote_de_los_encadenados', barbarian: 'aden_azote_de_los_encadenados', ranger: 'aden_arco_del_batidor', mage: 'anvil_staff', rogue: 'black_iron_fang' } },
};
