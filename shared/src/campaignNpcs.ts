import { CHAPTERS, campaignIndex, chapterAfter, type ChapterDef } from './chapters.js';
import { getQuest } from './quests.js';

/** Primer punto de la campaña en el que un NPC ofrece un capítulo o recibe una misión (null = no participa). */
export function npcFirstAppearance(npcId: string): string | null {
  for (const chapter of CHAPTERS) {
    if (chapter.start?.npcId === npcId) return chapter.start.after;
    for (const id of chapter.questOrder) if ((getQuest(id).returnNpcId ?? 'elder') === npcId) return id;
  }
  return null;
}

export function isCampaignNpc(npcId: string): boolean {
  return npcFirstAppearance(npcId) !== null;
}

export function chapterForComplete(completeId: string): ChapterDef | null {
  return CHAPTERS.find(c => c.completeId === completeId) ?? null;
}

/** ¿El NPC tiene algo de campaña que hacer ahora mismo (ofrecer el capítulo siguiente o recibir la misión actual)? */
export function campaignRoleNow(questId: string, npcId: string): boolean {
  if (chapterAfter(questId)?.start?.npcId === npcId) return true;
  try { return (getQuest(questId).returnNpcId ?? 'elder') === npcId; } catch { return false; }
}

/** ¿El jugador ya llegó al punto de la campaña en que aparece este NPC? */
export function npcReached(questId: string, npcId: string): boolean {
  const first = npcFirstAppearance(npcId);
  return first !== null && campaignIndex(questId) >= campaignIndex(first);
}
