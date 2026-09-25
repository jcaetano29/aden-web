import { CLASSES, isSkillLearned } from './classes.js';
import { CAMPAIGN_COMPLETE, getQuest, nextQuestId, QUEST_ORDER } from './quests.js';
import { isChapterComplete } from './chapters.js';

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
  if (isChapterComplete(nextId)) return quest.done;
  const next = getQuest(nextId);
  return `${quest.done}\n\nSiguiente misión · ${next.title}\n${next.intro}`;
}

/** Short discoveries accompany the current public expedition, including late arrivals. */
export function cryptStory(stage: number): string {
  return [
    'Las dos llamas del grabado tienen nombre: Memoria y Fragua. Una conserva lo que fuimos; la otra le da forma.',
    'La Sala del Despertar guarda el primer secreto: la Memoria retiene a los muertos. Los guardianes no olvidaron su juramento.',
    'El primer sello cedió. La Fragua da cuerpos a los recuerdos cautivos; por eso el ejército vuelve a levantarse.',
    'La Fragua quedó sin defensores. El segundo sello protege el Corazón, donde el Custodio mantiene unidas ambas llamas.',
    'Nihil buscó conservar su vida y sometió estas llamas a su voluntad. El Custodio protege el vínculo, pero la orden viene del Trono.',
    'El Custodio cayó y el vínculo de esta expedición se quebró. Mientras Nihil siga dando la orden, las llamas podrán encenderse otra vez.',
  ][stage] ?? '';
}

const CHAPTER_STORIES: Record<string, Record<string, string>> = {
  ruins: {
    merchant: 'La piedra iba a pagar una rueda nueva. Ahora resulta que llevaba una parte de la historia del reino entre sacos de remedios. Averiguá qué despertamos.',
    healer: 'Los viajeros hablan de los guardianes como si todavía reconocieran sus insignias. Si conservan recuerdos, quizá la maldición no les quitó todo.',
    smith: 'El Amuleto del Cazador que guarda Rowan aumenta ataque y maná máximo. Te servirá al abrir paso en las Ruinas; hasta el mejor filo necesita un brazo que aguante.',
    captain: 'El Centinela guarda una entrada, no un camino cualquiera. Primero reducí a sus guardianes; después enfrentá al que los mantiene formados.',
  },
  crypt: {
    merchant: 'Si bajás a esa cripta, reponé lo que gastaste. A los arqueros les digo lo mismo siempre: un carcaj vacío no se arregla con valentía.',
    healer: 'Rowan encontró dos nombres en los registros: Memoria y Fragua. Si una llama retiene a los muertos, me temo que la otra les fabrica una prisión.',
    smith: 'La Coraza de la Cripta que recibiste refuerza defensa y vida. Comparala en el inventario antes de bajar. Las marcas del Custodio pertenecen a una fragua más antigua que la mía.',
    captain: 'Despejá cada sala antes de tocar su sello. Contra el Behemoth y el Custodio, salí del círculo rojo antes del impacto. Ninguna orden vale quedarse quieto bajo ese golpe.',
  },
  ash: {
    merchant: 'Entonces las llamas pueden volver a encenderse. Tenemos un respiro, no una ruta segura. Llevá provisiones para llegar hasta Nihil.',
    healer: 'Rompiste el vínculo del Custodio, pero la orden de Nihil persiste. Traé de vuelta a quien puedas; no necesitamos demostrar que soportamos más dolor que los muertos.',
    smith: 'El arma del Custodio lleva una habilidad mientras la tenés equipada. Compará sus mejoras antes de cambiarla. La Sortija de Brasa y el Medallón de la Pira resisten el fuego de demonios y dracos.',
    captain: 'Los Verdugos sostienen la presencia de Nihil en el Yermo. Reducí su patrulla y buscá el último santuario; necesitamos llegar al Trono preparados.',
  },
  throne: {
    merchant: 'Guardé provisiones para tu regreso. Después de todo esto, prefiero fiarme de que vas a volver a discutir mis precios.',
    healer: 'Nihil quiso que nada terminara y condenó a los suyos a repetir su muerte. Vos todavía podés elegir cuándo retroceder y pedir ayuda.',
    smith: 'Revisá el equipo que llevás puesto, no sólo el que guardás. Una espada valiosa en la mochila no va a dar el último golpe por vos.',
    captain: 'Ya sabés qué mantiene en pie a ese ejército. En el Trono, cuidá la distancia y tus reservas. Si caés, reagrupate: Aden necesita que vuelvas a intentarlo.',
  },
};

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
  const chapter = index >= QUEST_ORDER.indexOf('q6') ? 'throne'
    : index >= QUEST_ORDER.indexOf('q5') ? 'ash'
    : index >= QUEST_ORDER.indexOf('q_crypt') ? 'crypt'
    : index >= QUEST_ORDER.indexOf('q_ruins') ? 'ruins' : undefined;
  if (chapter) {
    const text = CHAPTER_STORIES[chapter][npcId] ?? '';
    return text && npcId === 'captain' ? `${text}\n\n${classAdvice(className, level)}` : text;
  }
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
