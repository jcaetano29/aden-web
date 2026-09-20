import { distance2D, getQuest, CRYPT_WAVE_SIZE, CRYPT_WAVE_TEMPLATES } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';

export type DungeonProgress = Pick<PlayerState,'mapId'|'dead'|'dungeonStage'|'dungeonKills'>;

export function resetDungeon(p: DungeonProgress): void {
  p.dungeonStage = 0;
  p.dungeonKills = 0;
}

/** Future wings remain protected so killing ahead cannot strand a non-respawning run. */
export function canFightDungeonMob(p: DungeonProgress, templateId: string): boolean {
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
  if (p.dead || !p.questId || p.questId === 'campaign_complete') return;
  let q;
  try { q = getQuest(p.questId); } catch { return; }
  if ((q.objective ?? 'kill') !== objective || (q.mapId && p.mapId !== q.mapId)) return;
  if ((objective === 'kill' ? q.mobTemplateId : q.targetId) !== targetId) return;
  p.questProgress = Math.min(q.amount, p.questProgress + 1);
}

/** Returns impacted player IDs; combat damage is applied by the room. */
export function stepGuardianHazard(mob: MobState, players: Iterable<[string, PlayerState]>, dtMs: number): string[] {
  if (!['crypt_warden','crypt_behemoth'].includes(mob.templateId)) return [];
  const behemoth=mob.templateId==='crypt_behemoth';
  const candidates = [...players].filter(([,p]) => !p.dead && p.mapId === mob.mapId);
  const target = candidates.find(([id]) => id === mob.aggroTargetId)?.[1];
  if (mob.dead || mob.stunMs > 0 || !target) {
    mob.hazardMs = 0;
    return [];
  }
  if (mob.hazardMs > 0) {
    mob.hazardMs = Math.max(0, mob.hazardMs - dtMs);
    if (mob.hazardMs > 0) return [];
    mob.hazardCooldownMs = behemoth?9000:7000;
    return candidates.filter(([,p]) => distance2D(p.x,p.z,mob.hazardX,mob.hazardZ) <= mob.hazardRadius).map(([id]) => id);
  }
  mob.hazardCooldownMs = Math.max(0, mob.hazardCooldownMs - dtMs);
  if (mob.hazardCooldownMs === 0) {
    mob.hazardX = target.x;
    mob.hazardZ = target.z;
    mob.hazardRadius = behemoth?5:6;
    mob.hazardMs = behemoth?2000:1600;
  }
  return [];
}
