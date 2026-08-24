export interface Quest {
  id: string;
  title: string;
  intro: string;
  done: string;
  mobTemplateId: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
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
  },
};

export const QUEST_ORDER: string[] = ["q1", "q2", "q3", "q4", "q5", "q6"];

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
  const idx = QUEST_ORDER.indexOf(current);
  if (idx === -1) {
    return QUEST_ORDER[0];
  }
  const nextIdx = (idx + 1) % QUEST_ORDER.length;
  return QUEST_ORDER[nextIdx];
}
