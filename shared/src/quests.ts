export interface Quest {
  objective?: "kill" | "visit" | "interact" | "dungeon";
  targetId?: string;
  mapId?: string;
  hint?: string;
  rewardByClass?: Record<string, string>;
  rewardItemQty?: number;
  id: string;
  title: string;
  intro: string;
  done: string;
  mobTemplateId: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
  /** Etapa 21: pieza de equipo que entrega la misión al completarla (opcional). */
  rewardItemId?: string;
}

// Etapa 11: la cadena de misiones es la brújula del jugador — cada quest lo empuja
// una zona más al norte, del Bosque al Trono. El enemigo de cada quest vive en la
// zona correspondiente, así el marcador del minimapa siempre apunta "más profundo".
export const QUESTS: Record<string, Quest> = {
  q1: {
    id: "q1",
    title: "Los primeros huesos",
    intro: "Los viajeros de Bram llegaron heridos y sin su carga. Varek intentó volver por los remedios, pero los exploradores óseos dominan la entrada de Umbra. Derrotá a 6 para abrir paso. Elenya tiene pacientes esperando; hoy necesitamos algo más que otra espada de paso.",
    done: "Varek ya puede acercarse a la ruta. Este chaleco era de la reserva de la guardia: llevátelo. Bram insiste en algo extraño: los muertos dejaron las monedas y fueron detrás de una piedra que transportaba su caravana.",
    mobTemplateId: "skeleton_minion",
    amount: 6,
    rewardExp: 60,
    rewardGold: 25,
    rewardItemId: "leather_vest",
  },
  q2: {
    id: "q2",
    title: "La marea del bosque",
    intro: "La piedra pertenece al santuario; sus marcas también aparecen en las armas de los Guerreros Musgosos. Dorne las reconoció: eran guardianes del reino, antes de la caída de Nihil. Derrotá a 5 para debilitar su presencia en Umbra. Necesitamos averiguar qué siguen custodiando.",
    done: "La vieja guardia sigue obedeciendo una orden, incluso muerta. Dorne preparó esta arma para tu oficio: viene mejorada a +2. Equipala desde el inventario antes de volver al Bosque; lo que nos espera allí no es otro soldado.",
    mobTemplateId: "skeleton_warrior",
    amount: 5,
    rewardExp: 140,
    rewardGold: 70,
    rewardItemId: "iron_sword",
  },
  q3: {
    id: "q3",
    title: "Bajo las Ruinas",
    intro: "Las Ruinas de Nihil, al noroeste, están tomadas por los Guardianes de la Cripta. Quebrá a 6 de esos centinelas de piedra y hueso. Ahí la muerte es más vieja y más terca.",
    done: "Abriste camino en las Ruinas. Pero en lo más hondo algo enorme montó guardia: el Centinela de Nihil, la llave del trono.",
    mobTemplateId: "crypt_warrior",
    amount: 6,
    rewardExp: 320,
    rewardGold: 150,
    rewardItemId: "hunter_charm",
  },
  q4: {
    id: "q4",
    title: "El Centinela de Nihil",
    intro: "En el corazón de las Ruinas espera el Centinela de Nihil, mini-jefe que sella el paso al norte. Derrotalo y el camino al Yermo quedará abierto. Vas a necesitar todo lo que aprendiste.",
    done: "¡El Centinela cayó! Más allá, la tierra misma arde: el Yermo Ceniciento. Pocos volvieron de ahí. Vos podrías ser el primero en cruzarlo.",
    mobTemplateId: "crypt_sentinel",
    amount: 1,
    rewardExp: 600,
    rewardGold: 300,
    rewardItemId: "bone_blade",
  },
  q5: {
    id: "q5",
    title: "El Yermo Ardiente",
    intro: "El Yermo Ceniciento, al noreste, está patrullado por los Verdugos Ardientes: élites forjados en fuego. Reducí a 8 a cenizas. Sólo así probarás que estás listo para el Trono.",
    done: "Atravesaste el fuego y seguís en pie. Ya no queda nada entre vos y él. Al norte, en su Trono, el Rey Nihil espera.",
    mobTemplateId: "ash_warrior",
    amount: 8,
    rewardExp: 900,
    rewardGold: 450,
    rewardItemId: "ash_guard",
  },
  q6: {
    id: "q6",
    title: "El Rey Nihil",
    intro: "En el extremo norte del mundo, sobre su Trono de hueso y obsidiana, reina el Rey Nihil. Mientras persista, no habrá paz. Andá. Terminá con esto. Que Aden vuelva a dormir tranquila.",
    done: "¡Lo lograste! El Rey ha caído y su ejército se deshace en polvo. Aden vivirá, y tu nombre con ella. Sos una leyenda. (La amenaza podría regresar algún día... pero hoy, descansá.)",
    mobTemplateId: "skeleton_king",
    amount: 1,
    rewardExp: 1500,
    rewardGold: 800,
    rewardItemId: "nihil_aegis",
  },
};

export const CAMPAIGN_COMPLETE = "campaign_complete";

Object.assign(QUESTS, {
  q_supplies: { id: "q_supplies", title: "Provisiones extraviadas", objective: "interact", targetId: "bosque_chest_1", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 80, rewardGold: 20, rewardItemId: "health_potion", rewardItemQty: 3, intro: "Bram abandonó el cofre al oeste de la entrada del Bosque. Recuperá sus provisiones: Elenya necesita los remedios. Entre la carga también hay una piedra tallada del santuario. Quiero entender por qué interesó tanto a los muertos.", done: "Elenya ya tiene los remedios. Te dejó tres pociones para que puedas volver. La piedra lleva dos llamas grabadas; Bram la encontró junto al santuario de Umbra. No parece un simple adorno.", hint: "Buscá el cofre de Bram al oeste de la llegada del Bosque (250, 40). Acercate y hacé clic; después volvé con Rowan." },
  q_shrine: { id: "q_shrine", title: "Una luz entre los árboles", objective: "interact", targetId: "bosque_shrine", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 100, rewardGold: 30, intro: "El santuario de Umbra tiene el mismo grabado que la piedra de Bram. Acercate y activalo. Si todavía responde, tal vez esos símbolos nos digan qué buscan los guardianes de Nihil.", done: "El santuario respondió. Esas dos llamas también figuran en los registros de las Ruinas. Su bendición es breve, pero la pista permanece: los muertos buscan algo que perteneció al reino, antes de la maldición.", hint: "Activá el santuario cerca de la llegada del Bosque (300, 30) y volvé con Rowan. Su bendición de ataque dura 30 segundos; podés renovarla cuando esté disponible." },
  q_alpha: { id: "q_alpha", title: "El rugido de Umbra", objective: "kill", mapId: "bosque", mobTemplateId: "umbra_alpha", amount: 1, rewardExp: 180, rewardGold: 70, rewardItemId: "aden_sello_del_veneno_antiguo", intro: "Varek vio al Alfa de Umbra rondando las piedras del noroeste. Las bestias también parecen atraídas por los lugares antiguos. Derrotalo para que la guardia pueda investigar. Revisá el arma de Dorne, tus pociones y lo que aprendiste antes de enfrentarlo.", done: "La guardia pudo examinar las piedras: otra vez, las dos llamas. Tomá este Sello del Veneno Antiguo de nuestras reservas; equipado como anillo reduce el daño de veneno. Ya tenemos una dirección: las Ruinas, donde empezó la búsqueda de Nihil.", hint: "El Alfa está al noroeste del Bosque (260, -42). Revisá tu equipo en I, prepará pociones y apartate de sus golpes anunciados. Volvé con Rowan al vencerlo." },
  q_ruins: { id: "q_ruins", title: "Tras la piedra caída", objective: "visit", targetId: "ruinas", mapId: "ruinas", mobTemplateId: "", amount: 1, rewardExp: 200, rewardGold: 60, intro: "Nihil partió hacia las Ruinas buscando la inmortalidad. Ahora sus guardianes siguen símbolos que nacieron allí. Viajá a las Ruinas de Nihil con M y reconocé la entrada. Necesitamos descubrir qué relación tienen esas dos llamas con su ejército.", done: "Los guardianes siguen custodiando las Ruinas. Bajo esas piedras está la Cripta de las Dos Llamas. Antes de investigar su interior, tenemos que abrirnos paso entre los defensores.", hint: "Abrí M y viajá a Ruinas de Nihil (nivel 3). Volvé con Rowan después de reconocer la entrada." },
  q_crypt: { id: "q_crypt", title: "Las Dos Llamas", objective: "dungeon", targetId: "cripta", mapId: "cripta", mobTemplateId: "crypt_warden", amount: 1, rewardExp: 600, rewardGold: 250, intro: "Entrá en la Cripta de las Dos Llamas. Despejá las seis criaturas del Despertar y activá su sello. Cruzá a la Fragua y vencé a sus seis defensores, incluido el Behemoth, para activar el segundo. En el Corazón aguarda el Custodio alado: salí de sus círculos antes del impacto.", done: "Apagaste las dos llamas y rompiste el sello del Custodio. Su arma te ayudará a cruzar el Yermo.", hint: "M → Cripta de las Dos Llamas (nivel 5). La expedición es compartida; las salas despejadas permanecen vacías hasta que salgan todos. Morir te devuelve al pueblo." },
  q_ash_shrine: { id: "q_ash_shrine", title: "La última llama", objective: "interact", targetId: "yermo_shrine", mapId: "yermo", mobTemplateId: "", amount: 1, rewardExp: 300, rewardGold: 120, rewardItemId: "greater_potion", intro: "Activá el santuario de la entrada del Yermo. Su llama revelará el camino al Rey Nihil.", done: "El camino al Trono está abierto. Revisá tu equipo, reponé pociones y preparate para el último combate.", hint: "Santuario del Yermo (300, 335), cerca del punto de llegada." },
} satisfies Record<string, Quest>);

for (const [id, mapId] of Object.entries({ q1: "bosque", q2: "bosque", q3: "ruinas", q4: "ruinas", q5: "yermo", q6: "trono" })) {
  QUESTS[id].mapId = mapId;
  QUESTS[id].objective = "kill";
  QUESTS[id].hint = `Viajá con M a ${mapId}; buscá los enemigos marcados y volvé con Rowan al completar el objetivo.`;
}
QUESTS.q2.rewardItemId = undefined;
QUESTS.q2.rewardByClass = {
  knight: "aden_punal_del_umbral", barbarian: "aden_destral_del_lenador_gris", rogue: "aden_punal_del_umbral",
  mage: "aden_baston_del_huesero", ranger: "aden_arco_de_la_senda",
};
QUESTS.q4.rewardItemId = "crypt_plate";
QUESTS.q4.done = "El Centinela cayó. Bajo sus ruinas se abre la Cripta de las Dos Llamas: cortá el poder que alimenta al ejército antes de cruzar al Yermo.";
QUESTS.q6.done = "¡El Rey ha caído! Aden vuelve a respirar. La campaña está completa: podés seguir explorando y volver a la Cripta para buscar nuevas recompensas.";

export const QUEST_ORDER: string[] = ["q1", "q_supplies", "q_shrine", "q2", "q_alpha", "q_ruins", "q3", "q4", "q_crypt", "q5", "q_ash_shrine", "q6"];

export function getQuest(id: string): Quest {
  const quest = QUESTS[id];
  if (!quest) {
    throw new Error(`Unknown quest: ${id}`);
  }
  return quest;
}

export function firstQuestId(): string {
  return QUEST_ORDER[0];
}

export function nextQuestId(current: string): string {
  if (current === CAMPAIGN_COMPLETE) return CAMPAIGN_COMPLETE;
  const idx = QUEST_ORDER.indexOf(current);
  if (idx === -1) {
    return QUEST_ORDER[0];
  }
  return QUEST_ORDER[idx + 1] ?? CAMPAIGN_COMPLETE;
}
