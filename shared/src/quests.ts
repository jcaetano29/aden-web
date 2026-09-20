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
    intro: "Al norte del pueblo, el Bosque de Umbra se llenó de huesos que caminan: exploradores del Rey Nihil. Andá y acabá con 6. Es tu bautismo, aventurero.",
    done: "Lo hiciste. Pero por cada uno que cae, el bosque escupe dos más. Esto recién empieza.",
    mobTemplateId: "skeleton_minion",
    amount: 6,
    rewardExp: 60,
    rewardGold: 25,
    rewardItemId: "leather_vest",
  },
  q2: {
    id: "q2",
    title: "La marea del bosque",
    intro: "Entre los árboles ya no sólo hay exploradores: caminan los Guerreros Musgosos, vieja guardia alzada de nuevo. Derribá 5. Golpean como en vida.",
    done: "El Bosque respira gracias a vos. Pero mis exploradores traen malas nuevas: hacia el oeste, las viejas Ruinas de Nihil volvieron a moverse.",
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
  q_supplies: { id: "q_supplies", title: "Provisiones extraviadas", objective: "interact", targetId: "bosque_chest_1", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 80, rewardGold: 20, rewardItemId: "health_potion", rewardItemQty: 3, intro: "Una caravana dejó sus provisiones al oeste de la entrada del Bosque. Recuperalas del cofre y traé noticias.", done: "Estas provisiones salvarán vidas. Quedate con tres pociones para el viaje.", hint: "Cofre al oeste de la llegada del Bosque (250, 40). Acercate y hacé clic." },
  q_shrine: { id: "q_shrine", title: "Una luz entre los árboles", objective: "interact", targetId: "bosque_shrine", mapId: "bosque", mobTemplateId: "", amount: 1, rewardExp: 100, rewardGold: 30, intro: "Encontrá el santuario del Bosque y recibí su bendición antes de avanzar.", done: "Su luz todavía nos protege. Usá esa fuerza contra la guardia musgosa.", hint: "Bosque de Umbra: santuario cerca de la llegada (300, 30). Acercate y hacé clic." },
  q_alpha: { id: "q_alpha", title: "El rugido de Umbra", objective: "kill", mapId: "bosque", mobTemplateId: "umbra_alpha", amount: 1, rewardExp: 180, rewardGold: 70, rewardItemId: "aden_sello_del_veneno_antiguo", intro: "El Alfa de Umbra reúne a las bestias al noroeste. Prepará pociones y derrotalo.", done: "Sin su líder, las bestias se retiran. Ahora podemos investigar las Ruinas.", hint: "Buscá al Alfa al noroeste del Bosque (260, -42)." },
  q_ruins: { id: "q_ruins", title: "Tras la piedra caída", objective: "visit", targetId: "ruinas", mapId: "ruinas", mobTemplateId: "", amount: 1, rewardExp: 200, rewardGold: 60, intro: "Viajá a las Ruinas de Nihil y reconocé el lugar. Abrí el mapa con M.", done: "Reconociste la entrada. Los guardianes custodian una antigua cripta bajo estas piedras.", hint: "Abrí M y viajá a Ruinas de Nihil (nivel 3)." },
  q_crypt: { id: "q_crypt", title: "Las Dos Llamas", objective: "dungeon", targetId: "cripta", mapId: "cripta", mobTemplateId: "crypt_warden", amount: 1, rewardExp: 600, rewardGold: 250, intro: "Entrá en la Cripta de las Dos Llamas. Vencé a tres acólitos, activá el primer sello, vencé a tres guardias y activá el segundo. Después enfrentá al Custodio: salí del círculo antes de que estalle.", done: "Apagaste las dos llamas y rompiste el sello del Custodio. Su arma te ayudará a cruzar el Yermo.", hint: "M → Cripta de las Dos Llamas (nivel 5). Seguí los objetivos de la mazmorra; salir o morir reinicia el recorrido." },
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
