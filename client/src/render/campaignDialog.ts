import { chapterAfter, chapterForComplete, isChapterComplete, isCampaignNpc, npcReached, getQuest, getNpc, getZone, firstQuestId, questTurnInText } from '@aden/shared';

export interface CampaignState { questId: string; questProgress: number; level: number }
export interface CampaignDialog { text: string; actionLabel: string; send: boolean }

const info = (text: string): CampaignDialog => ({ text, actionLabel: 'Entendido', send: false });

/** Diálogo de campaña de un NPC según el registro de capítulos; null = el NPC no participa (tienda, servicio…). */
export function campaignDialog(state: CampaignState, npcId: string): CampaignDialog | null {
  const next = chapterAfter(state.questId);
  if (next?.start) {
    if (npcId === next.start.npcId) {
      const ready = state.level >= next.start.minLevel;
      return { text: `${getQuest(next.questOrder[0]).intro}\n\nRequiere nivel ${next.start.minLevel}.`, actionLabel: ready ? 'Iniciar expedición' : 'Volver al camino', send: ready };
    }
    if (!isCampaignNpc(npcId)) return null;
    const starter = getNpc(next.start.npcId);
    const done = chapterForComplete(state.questId)?.completeText;
    return info(`${done ? `${done}\n\n` : ''}${starter.name} te espera en ${getZone(starter.mapId ?? 'pueblo').name} para la próxima expedición (nivel ${next.start.minLevel}).`);
  }
  if (isChapterComplete(state.questId)) return isCampaignNpc(npcId) ? info(chapterForComplete(state.questId)!.completeText) : null;
  if (state.questId === '') {
    if (npcId === 'elder') return { text: getQuest(firstQuestId()).intro, actionLabel: 'Aceptar', send: true };
    return isCampaignNpc(npcId) ? info('Hablá con el Anciano Rowan en la plaza para comenzar tu aventura.') : null;
  }
  let quest;
  try { quest = getQuest(state.questId); } catch { return null; }
  const receiver = quest.returnNpcId ?? 'elder';
  if (npcId !== receiver) {
    if (!isCampaignNpc(npcId)) return null;
    return info(npcReached(state.questId, npcId)
      ? `${getNpc(receiver).name} espera noticias. Seguí el diario de misión y entregá allí tus descubrimientos.`
      : 'Todavía no es momento. Seguí tu camino: cuando llegue la hora te voy a necesitar.');
  }
  if (state.questProgress >= quest.amount) return { text: questTurnInText(quest.id), actionLabel: 'Recibir recompensa', send: true };
  return info(`${quest.intro}\n\n(Progreso: ${state.questProgress}/${quest.amount})`);
}
