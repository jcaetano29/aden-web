import { getQuest, nextQuestId, isChapterComplete, getEncounter, questReached, CRYPT_WAVE_SIZE, CRYPT_WAVE_TEMPLATES } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';

export type DungeonProgress = Pick<PlayerState,'mapId'|'dead'|'dungeonStage'|'dungeonKills'> & { questId?: string };

export function resetDungeon(p: DungeonProgress): void {
  p.dungeonStage = 0;
  p.dungeonKills = 0;
}

/** Future wings remain protected so killing ahead cannot strand a non-respawning run. */
export function canFightDungeonMob(p: DungeonProgress, templateId: string): boolean {
  const encounter = getEncounter(templateId);
  if (encounter?.requiresQuest) return questReached(p.questId ?? '', encounter.requiresQuest);
  if(templateId === 'crypt_warden') return p.mapId === 'cripta' && p.dungeonStage === 4;
  for(const [stage,templates] of Object.entries(CRYPT_WAVE_TEMPLATES)) {
    if(templates.includes(templateId))return p.mapId==='cripta' && p.dungeonStage===Number(stage);
  }
  return true;
}

export function advanceDungeonKill(p: DungeonProgress, templateId: string): boolean {
  if (p.mapId !== 'cripta' || p.dead) return false;
  const expected = CRYPT_WAVE_TEMPLATES[p.dungeonStage] ?? [];
  if (expected.includes(templateId)) {
    p.dungeonKills = Math.min(CRYPT_WAVE_SIZE, p.dungeonKills + 1);
    if (p.dungeonKills === CRYPT_WAVE_SIZE) p.dungeonStage++;
  }
  if (p.dungeonStage === 4 && templateId === 'crypt_warden') {
    p.dungeonStage = 5;
    return true;
  }
  return false;
}

export function activateSeal(p: DungeonProgress, id: string): boolean {
  if (p.dead || p.mapId !== 'cripta') return false;
  if ((id === 'crypt_seal_1' && p.dungeonStage === 1) || (id === 'crypt_seal_2' && p.dungeonStage === 3)) {
    p.dungeonStage++;
    p.dungeonKills = 0;
    return true;
  }
  return false;
}

export function advanceQuest(p: PlayerState, objective: 'kill'|'visit'|'interact'|'dungeon', targetId: string): void {
  if (p.dead || !p.questId || isChapterComplete(p.questId)) return;
  let q;
  try { q = getQuest(p.questId); } catch { return; }
  if ((q.objective ?? 'kill') !== objective || (q.mapId && p.mapId !== q.mapId)) return;
  if ((objective === 'kill' ? q.mobTemplateId : q.targetId) !== targetId) return;
  p.questProgress = Math.min(q.amount, p.questProgress + 1);
  if (q.autoAdvance && p.questProgress >= q.amount) {
    p.questId = nextQuestId(q.id);
    p.questProgress = 0;
  }
}

/** Los jefes con ataques anunciados se interpretan desde `ENCOUNTERS` (EncounterSystem). */
export { stepEncounter as stepGuardianHazard } from './EncounterSystem.js';
