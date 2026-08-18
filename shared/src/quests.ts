export interface Quest {
  id: string;
  title: string;
  mobTemplateId: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
}

export const QUESTS: Record<string, Quest> = {
  q1: {
    id: "q1",
    title: "Limpieza de esqueletos",
    mobTemplateId: "skeleton_minion",
    amount: 5,
    rewardExp: 50,
    rewardGold: 20,
  },
  q2: {
    id: "q2",
    title: "Purga de las ruinas",
    mobTemplateId: "skeleton_minion",
    amount: 8,
    rewardExp: 80,
    rewardGold: 40,
  },
  q3: {
    id: "q3",
    title: "Cazador de guerreros",
    mobTemplateId: "skeleton_warrior",
    amount: 5,
    rewardExp: 150,
    rewardGold: 80,
  },
  q4: {
    id: "q4",
    title: "Derrota al Rey Esqueleto",
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
