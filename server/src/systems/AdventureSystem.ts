import { distance2D, getQuest, nextQuestId, MEMORY_COMPLETE, CRYPT_WAVE_SIZE, CRYPT_WAVE_TEMPLATES } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';

export type DungeonProgress = Pick<PlayerState,'mapId'|'dead'|'dungeonStage'|'dungeonKills'> & { questId?: string };

export function resetDungeon(p: DungeonProgress): void {
  p.dungeonStage = 0;
  p.dungeonKills = 0;
}

/** Future wings remain protected so killing ahead cannot strand a non-respawning run. */
export function canFightDungeonMob(p: DungeonProgress, templateId: string): boolean {
  if (templateId === 'memory_prior') return p.mapId === 'monasterio' && (p.questId === 'a2_prior' || p.questId === MEMORY_COMPLETE);
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
  if (q.autoAdvance && p.questProgress >= q.amount) {
    p.questId = nextQuestId(q.id);
    p.questProgress = 0;
  }
}

/** Returns impacted player IDs; combat damage is applied by the room. */
export function stepGuardianHazard(mob: MobState, players: Iterable<[string, PlayerState]>, dtMs: number): string[] {
  if (!['crypt_warden','crypt_behemoth','skeleton_king','veil_guardian','memory_jailer','memory_prior'].includes(mob.templateId)) return [];
  const behemoth=['crypt_behemoth','veil_guardian','memory_jailer'].includes(mob.templateId);
  const king=mob.templateId==='skeleton_king';
  const prior=mob.templateId==='memory_prior';
  const candidates = [...players].filter(([,p]) => !p.dead && p.mapId === mob.mapId && (!prior || canFightDungeonMob(p,mob.templateId)));
  const target = candidates.find(([id]) => id === mob.aggroTargetId)?.[1];
  if (mob.dead || mob.stunMs > 0 || !target) {
    mob.hazardMs = 0;
    mob.channeling = false;
    return [];
  }
  if (mob.hazardMs > 0) {
    mob.hazardMs = Math.max(0, mob.hazardMs - dtMs);
    if (mob.hazardMs > 0) return [];
    mob.channeling = false;
    mob.hazardCooldownMs = king ? (mob.hp <= mob.maxHp / 2 ? 5000 : 8000) : prior ? 6000 : behemoth?9000:7000;
    return candidates.filter(([,p]) => distance2D(p.x,p.z,mob.hazardX,mob.hazardZ) <= mob.hazardRadius).map(([id]) => id);
  }
  mob.hazardCooldownMs = Math.max(0, mob.hazardCooldownMs - dtMs);
  if (mob.hazardCooldownMs === 0) {
    mob.channeling = prior && mob.hp <= mob.maxHp / 2 && mob.hazardCount % 2 === 1;
    mob.hazardCount++;
    mob.hazardX = mob.channeling ? mob.x : target.x;
    mob.hazardZ = mob.channeling ? mob.z : target.z;
    mob.hazardRadius = mob.channeling ? 14 : behemoth?5:6;
    mob.hazardMs = mob.channeling ? 6000 : (king || prior)?1800:behemoth?2000:1600;
    mob.hazardPower = mob.channeling ? 3.2 : 2.4;
  }
  return [];
}
