import { distance2D, getQuest } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';

export function resetDungeon(p: PlayerState): void {
  p.dungeonStage = 0;
  p.dungeonKills = 0;
}

/** Boss damage requires both personal seals, even if another player unlocked theirs. */
export function canFightDungeonMob(p: PlayerState, templateId: string): boolean {
  return templateId !== 'crypt_warden' || (p.mapId === 'cripta' && p.dungeonStage === 4);
}

export function advanceDungeonKill(p: PlayerState, templateId: string): boolean {
  if (p.mapId !== 'cripta' || p.dead) return false;
  const expected = p.dungeonStage === 0 ? 'crypt_acolyte' : p.dungeonStage === 2 ? 'crypt_flameguard' : '';
  if (expected && templateId === expected) {
    p.dungeonKills = Math.min(3, p.dungeonKills + 1);
    if (p.dungeonKills === 3) p.dungeonStage++;
  }
  if (p.dungeonStage === 4 && templateId === 'crypt_warden') {
    p.dungeonStage = 5;
    return true;
  }
  return false;
}

export function activateSeal(p: PlayerState, id: string): boolean {
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
  if (mob.templateId !== 'crypt_warden') return [];
  const candidates = [...players].filter(([,p]) => !p.dead && p.mapId === mob.mapId);
  const target = candidates.find(([id]) => id === mob.aggroTargetId)?.[1];
  if (mob.dead || mob.stunMs > 0 || !target) {
    mob.hazardMs = 0;
    return [];
  }
  if (mob.hazardMs > 0) {
    mob.hazardMs = Math.max(0, mob.hazardMs - dtMs);
    if (mob.hazardMs > 0) return [];
    mob.hazardCooldownMs = 7000;
    return candidates.filter(([,p]) => distance2D(p.x,p.z,mob.hazardX,mob.hazardZ) <= mob.hazardRadius).map(([id]) => id);
  }
  mob.hazardCooldownMs = Math.max(0, mob.hazardCooldownMs - dtMs);
  if (mob.hazardCooldownMs === 0) {
    mob.hazardX = target.x;
    mob.hazardZ = target.z;
    mob.hazardMs = 1600;
  }
  return [];
}
