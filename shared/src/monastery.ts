import type { Quest } from './quests.js';
export const MEMORY_COMPLETE = 'memory_campaign_complete';
export const MONASTERY_QUEST_ORDER = ['a2_monastery','a2_archive','a2_testimony','a2_cell_1','a2_cell_2','a2_cell_3','a2_jailer','a2_anchor_1','a2_anchor_2','a2_prior'];
export const MEMORY_ANCHORS = ['monastery_anchor_1','monastery_anchor_2'];

function mission(id: string, title: string, objective: Quest['objective'], targetId: string, intro: string, done: string, rewardExp: number, autoAdvance = false): Quest {
  return { id,title,objective,targetId,intro,done,rewardExp,autoAdvance,returnNpcId:'iria',mapId:'monasterio',
    mobTemplateId: objective === 'kill' ? targetId : '',amount:1,rewardGold:autoAdvance?0:250,
    hint: `${intro}${autoAdvance ? ' Después seguí el siguiente marcador.' : ' Volvé con Iria en la entrada al completar el objetivo.'}` };
}
export const MONASTERY_QUESTS: Record<string, Quest> = {
  a2_monastery: mission('a2_monastery','La archivista de la Vigilia','visit','monasterio',
    'Viajá al Monasterio de la Vigilia con M. Iria espera junto al acceso sur.',
    'Yo escribí esos registros. El Prior prometió devolvernos a quienes perdimos. Ahora toma recuerdos de los vivos para sostener a los muertos. Ayudame a sacar a los cautivos.',1000),
  a2_archive: mission('a2_archive','Lo que la Vigilia conserva','interact','monastery_archive_1',
    'Recuperá el registro del archivo oriental (1228, 464). Buscá después el testimonio que lo acompaña.',
    '',0,true),
  a2_testimony: mission('a2_testimony','Una voz entre los registros','interact','monastery_archive_2',
    'Recuperá el segundo testimonio en el archivo oriental (1232, 456).',
    'Estos nombres coinciden con los viajeros de Maera. Siguen vivos en las celdas occidentales. Ningún recuerdo vale el precio que les estamos haciendo pagar.',2200),
  a2_cell_1: mission('a2_cell_1','Los nombres cautivos · primera celda','interact','monastery_cell_1',
    'Abrí la primera celda del ala occidental (1162, 444). Despejá a los guardias y seguí hacia las otras celdas.', '',0,true),
  a2_cell_2: mission('a2_cell_2','Los nombres cautivos · segunda celda','interact','monastery_cell_2',
    'Abrí la segunda celda al oeste (1162, 434).', '',0,true),
  a2_cell_3: mission('a2_cell_3','Los nombres cautivos · última celda','interact','monastery_cell_3',
    'Abrí la tercera celda al oeste (1162, 424). Los cautivos pueden regresar por el camino que recuperaste.',
    'Entre ellos está el hermano de Maera. Recuerda su nombre. Todavía debemos detener al carcelero: mientras obedezca al Prior, perseguirá a quienes acabamos de liberar.',2600),
  a2_jailer: mission('a2_jailer','El último carcelero','kill','memory_jailer',
    'Derrotá al Carcelero de la Vigilia, nivel 14, en el patio occidental (1178, 417). Apartate de sus áreas anunciadas.',
    'Las puertas ya no tienen guardián. El Prior se alimenta de dos anclajes junto al campanario. Aprendé a romper su vínculo antes de enfrentarlo.',2200),
  a2_anchor_1: mission('a2_anchor_1','El pulso del campanario · oeste','interact','monastery_anchor_1',
    'Activá el anclaje occidental (1188, 407) para debilitar el vínculo. Después buscá el anclaje oriental.', '',0,true),
  a2_anchor_2: mission('a2_anchor_2','El pulso del campanario · este','interact','monastery_anchor_2',
    'Activá el anclaje oriental (1212, 407) y volvé con Iria. Al nivel 15 aprendés una habilidad nueva de movilidad.',
    'El vínculo está expuesto. Durante la canalización del Prior, activá cualquiera de los dos anclajes para interrumpirlo. Aprovechá su recuperación; también podés escapar del círculo grande caminando.',3000),
  a2_prior: { ...mission('a2_prior','El Prior sin Nombre','kill','memory_prior',
    'Enfrentá al Prior, nivel 15, en el campanario (1200, 401). Evitá los círculos. Bajo media vida canaliza un área mayor: escapá o activá un anclaje para interrumpirlo.',
    'La Memoria vuelve a pertenecer a quienes la vivieron. Maera se reúne con su hermano y los cautivos emprenden el regreso. Yo llevaré estos testimonios a Aden. Conservá este relicario: recordar también es elegir qué no debemos repetir.',2500), rewardItemId:'memory_locket' },
};
