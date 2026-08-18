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

export const QUESTS: Record<string, Quest> = {
  q1: {
    id: "q1",
    title: "Los primeros huesos",
    intro: "Han visto esqueletos merodeando cerca de los campos. Aún son pocos y torpes, exploradores del Rey Nihil. Acabá con 5 antes de que aprendan el camino a nuestras puertas.",
    done: "Lo hiciste. Pero por cada uno que cae, las Ruinas escupen dos más. Esto recién empieza, aventurero.",
    mobTemplateId: "skeleton_minion",
    amount: 5,
    rewardExp: 50,
    rewardGold: 20,
  },
  q2: {
    id: "q2",
    title: "La marea crece",
    intro: "Tenías razón en temer. Ahora bajan en manada desde el norte. Derribá 8 esta vez: hay que quebrarles el avance.",
    done: "El pueblo respira gracias a vos. Pero mis exploradores traen malas nuevas: entre los muertos caminan cosas peores.",
    mobTemplateId: "skeleton_minion",
    amount: 8,
    rewardExp: 80,
    rewardGold: 40,
  },
  q3: {
    id: "q3",
    title: "Los guerreros caídos",
    intro: "No son simples huesos: son los Guerreros Caídos, la vieja guardia del Rey Nihil, alzada de nuevo. Derrotá a 5. Cuidate: golpean como en vida.",
    done: "Sos más fuerte de lo que este viejo esperaba. Ya no quedan excusas: hay que ir por quien mueve los hilos.",
    mobTemplateId: "skeleton_warrior",
    amount: 5,
    rewardExp: 150,
    rewardGold: 80,
  },
  q4: {
    id: "q4",
    title: "El Rey Esqueleto",
    intro: "El Rey Nihil comanda a los muertos desde la arena de las Ruinas, al norte. Mientras persista, no habrá paz. Andá. Terminá con esto. Que Aden vuelva a dormir tranquila.",
    done: "¡Lo lograste! El Rey ha caído y su ejército se deshace en polvo. Aden vivirá, y tu nombre con ella. Sos un héroe. (La amenaza podría regresar algún día... pero hoy, descansá.)",
    mobTemplateId: "skeleton_king",
    amount: 1,
    rewardExp: 400,
    rewardGold: 200,
  },
};

export const QUEST_ORDER: string[] = ["q1", "q2", "q3", "q4"];

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
