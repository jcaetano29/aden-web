import { CLASSES, isSkillLearned } from './classes.js';
import { CAMPAIGN_COMPLETE, getQuest, nextQuestId, QUEST_ORDER } from './quests.js';

/** Advice follows actual unlocks; it never grants or requires a skill. */
export function classAdvice(className: string, level: number): string {
  if (!Object.hasOwn(CLASSES, className)) return '';
  const learned = (id: string) => isSkillLearned(className, level, id);
  switch (className) {
    case 'knight': return learned('guard')
      ? 'Varek: «Usá Guardia antes de recibir los golpes más duros. Un arma de una mano te permite llevar escudo.»'
      : 'Varek: «Golpe de Escudo aturde al enemigo. Aprovechá ese respiro para cambiar de posición.»';
    case 'barbarian': return learned('rage')
      ? 'Varek: «Activá Furia cuando estés en posición de atacar: dura poco. No desperdicies esa fuerza persiguiendo al enemigo.»'
      : 'Varek: «Reservá maná para Golpe Brutal y apartate cuando el enemigo prepare su ataque.»';
    case 'rogue': return learned('poison')
      ? 'Varek: «El Veneno sigue haciendo daño mientras te apartás. No necesitás intercambiar cada golpe.»'
      : 'Varek: «Puñalada golpea fuerte, pero no te vuelve invulnerable. Buscá espacio entre tus ataques.»';
    case 'mage': return learned('ice_lance')
      ? 'Varek: «Lanza de Hielo inmoviliza un instante. Usalo para ganar distancia y cuidá el maná para el próximo encuentro.»'
      : 'Varek: «Bola de Fuego alcanza desde lejos. Mantené distancia y llevá una reserva de maná.»';
    case 'ranger': return learned('snaring_shot')
      ? 'Varek: «Flecha de Zarzas inmoviliza al enemigo. Ganá distancia antes de volver a disparar y revisá tu munición.»'
      : 'Varek: «Mantené distancia con tu arco. Los disparos y las habilidades de tiro consumen munición; Bram vende flechas y virotes.»';
    default: return '';
  }
}

/** Preview the assignment that the server will grant when this quest is claimed. */
export function questTurnInText(questId: string): string {
  const quest = getQuest(questId);
  const nextId = nextQuestId(questId);
  if (nextId === CAMPAIGN_COMPLETE) return quest.done;
  const next = getQuest(nextId);
  return `${quest.done}\n\nSiguiente misión · ${next.title}\n${next.intro}`;
}

/** Flavor follows the saved campaign position and never changes service behavior. */
export function npcStory(npcId: string, questId: string, className: string, level: number): string {
  if (questId === CAMPAIGN_COMPLETE) {
    const endings: Record<string, string> = {
      merchant: 'Desde la caída de Nihil, vuelven a preguntar por viajes. Hacía tiempo que sólo preguntaban por refugio.',
      healer: 'Nihil cayó. Todavía hay heridas que cerrar, pero esta noche puedo prometerles un mañana.',
      smith: 'El arma ayuda; quien la sostiene decide. Acordate de eso cuando cuentes cómo cayó Nihil.',
      captain: 'Venciste a Nihil. Ahora nos toca cuidar lo que recuperamos. Todavía hay trabajo para la guardia.',
    };
    return endings[npcId] ?? '';
  }
  const index = QUEST_ORDER.indexOf(questId || 'q1');
  if (index < 0) return '';
  const suppliesRecovered = index > QUEST_ORDER.indexOf('q_supplies');
  const armed = index > QUEST_ORDER.indexOf('q2');
  switch (npcId) {
    case 'merchant': return suppliesRecovered
      ? 'Los remedios que recuperaste ya están con Elenya. El dinero se repone; la gente que viaja conmigo, no.'
      : 'Mi caravana llevaba remedios para Elenya y una piedra del viejo santuario. Abandonamos el cofre al oeste del Bosque. Los muertos ni miraron las monedas.';
    case 'healer': return suppliesRecovered
      ? 'Con esos remedios pude atender a los viajeros. Todos recuerdan lo mismo: los muertos rodearon la piedra y dejaron pasar a quien soltó la carga.'
      : 'Los viajeros de Bram llegaron sin sus remedios. Puedo aliviar el dolor, pero necesito que alguien recupere lo que quedó en el Bosque.';
    case 'smith': return armed
      ? 'Rowan te entregó el arma que preparé. Abrí el inventario y comparala con la que llevás: una mejora sirve cuando la equipás, no cuando la guardás.'
      : 'Conozco las marcas de la vieja guardia. Si esos guerreros vuelven a llevarlas, no salgas con cualquier filo. Le prepararé a Rowan un arma para tu oficio.';
    case 'captain': return `${index >= QUEST_ORDER.indexOf('q_ruins') ? 'Umbra nos dio una pista, no una victoria definitiva. Averiguá quién está llamando a esos guardianes desde las Ruinas.' : 'Los muertos se agrupan alrededor de los lugares antiguos. Abrí paso, pero observá qué protegen.'}\n\n${classAdvice(className, level)}`;
    default: return '';
  }
}
