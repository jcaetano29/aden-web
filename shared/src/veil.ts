import type { Quest } from './quests.js';

export const VEIL_COMPLETE = 'veil_prologue_complete';
export const VEIL_QUEST_ORDER = ['a2_arrival', 'a2_caravan', 'a2_manifest', 'a2_raiders', 'a2_crossing'];
export const VEIL_POOLS = [
  { x: 1172, z: 154, width: 20, depth: 30 },
  { x: 1228, z: 151, width: 20, depth: 36 },
] as const;

const quest = (id: string, title: string, intro: string, done: string, objective: Quest['objective'], targetId: string, rewardExp: number): Quest => ({
  id, title, intro, done, objective, targetId, mapId: 'marismas', returnNpcId: 'maera',
  mobTemplateId: objective === 'kill' ? targetId : '', amount: 1, rewardExp, rewardGold: 150,
  hint: `${intro} Volvé con Maera al puesto del sur para entregar.`,
});

export const VEIL_QUESTS: Record<string, Quest> = {
  a2_arrival: quest('a2_arrival', 'Una ruta que vuelve',
    'La caída de Nihil abrió el camino de las Marismas del Velo. Algunos viajeros vuelven sin recordar sus nombres. Viajá con M a las Marismas y hablá con Maera en el puesto de expedición.',
    'Soy Maera. Mi hermano viajaba en la última caravana. Encontramos el carro, pero nadie recuerda haberlo visto llegar. Necesito respuestas, no otra lista de desaparecidos.', 'visit', 'marismas', 700),
  a2_caravan: quest('a2_caravan', 'Huellas sin nombre',
    'Buscá el cofre de viaje junto a la caravana abandonada, al noroeste (1184, 122). Sus pertenencias pueden decirnos quién pasó por allí.',
    'Reconozco esta hebilla. Mi hermano no habría abandonado su abrigo en el frío. Hay marcas de la Vigilia en el cierre: alguien registró la carga.', 'interact', 'veil_caravan', 1200),
  a2_manifest: quest('a2_manifest', 'La lista borrada',
    'Revisá el arcón de documentos junto a la caravana (1191, 116). Los nombres del registro podrían explicar por qué se llevaron a los viajeros.',
    'Todos los nombres están raspados, salvo uno: Iria. Era archivista de la Vigilia. Si sigue viva, conoce lo que ocurrió. Primero debemos despejar el paso.', 'interact', 'veil_manifest', 1200),
  a2_raiders: { ...quest('a2_raiders', 'Los que vigilan el camino',
    'Derrotá a cuatro Saqueadores del Velo al norte del puesto. Boren tiene pociones y munición; revisá el nivel de cada amenaza antes de avanzar.',
    'Los supervivientes ya pueden acercarse al puesto. Boren encontró una ruta al norte, pero una criatura custodia la torre de señales. No la enfrentes sin prepararte.', 'kill', 'veil_raider', 2000), amount: 4 },
  a2_crossing: { ...quest('a2_crossing', 'El guardián del paso',
    'Derrotá al Guardián del Velo, nivel 12, junto a la torre del norte (1200, 102). Apartate del círculo antes del impacto.',
    'El sello del guardián confirma el destino: el Monasterio de la Vigilia. Mi hermano podría seguir allí. Hoy recuperamos el camino y los nombres de quienes faltan. Prepararemos juntos la próxima expedición.', 'kill', 'veil_guardian', 2500), rewardItemId: 'greater_potion', rewardItemQty: 5 },
};
