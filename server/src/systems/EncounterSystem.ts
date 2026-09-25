import { distance2D, getEncounter, questReached, type EncounterDef, type HazardPattern } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';

const FULL_CIRCLE = Math.PI * 2;

export function isEncounterEligible(def: EncounterDef, p: Pick<PlayerState, 'questId'>): boolean {
  return !def.requiresQuest || questReached(p.questId, def.requiresQuest);
}

/** Patrón que toca según la vida del jefe y los ataques ya lanzados. */
function patternFor(def: EncounterDef, mob: MobState): HazardPattern {
  const low = mob.hp <= mob.maxHp / 2;
  const list = (low && def.belowHalf?.patterns) || def.patterns;
  return list[mob.hazardCount % list.length];
}

/** ¿El punto está dentro del área anunciada (círculo o sector)? */
export function inHazard(mob: Pick<MobState, 'hazardX' | 'hazardZ' | 'hazardRadius' | 'hazardArc' | 'hazardAngle'>, x: number, z: number): boolean {
  const d = distance2D(x, z, mob.hazardX, mob.hazardZ);
  if (d > mob.hazardRadius) return false;
  if (mob.hazardArc >= FULL_CIRCLE - 1e-6 || d === 0) return true;
  let diff = Math.abs(Math.atan2(z - mob.hazardZ, x - mob.hazardX) - mob.hazardAngle) % FULL_CIRCLE;
  if (diff > Math.PI) diff = FULL_CIRCLE - diff;
  return diff <= mob.hazardArc / 2 + 1e-9;
}

/** Avanza el ataque anunciado del jefe; devuelve los jugadores alcanzados al impactar. */
export function stepEncounter(mob: MobState, players: Iterable<[string, PlayerState]>, dtMs: number): string[] {
  const def = getEncounter(mob.templateId);
  if (!def) return [];
  const candidates = [...players].filter(([, p]) => !p.dead && p.mapId === mob.mapId && isEncounterEligible(def, p));
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
    const low = mob.hp <= mob.maxHp / 2;
    mob.hazardCooldownMs = (low && def.belowHalf?.cooldownMs) || def.cooldownMs;
    return candidates.filter(([, p]) => inHazard(mob, p.x, p.z)).map(([id]) => id);
  }
  mob.hazardCooldownMs = Math.max(0, mob.hazardCooldownMs - dtMs);
  if (mob.hazardCooldownMs === 0) {
    const pattern = patternFor(def, mob);
    mob.hazardCount++;
    mob.channeling = !!pattern.channel;
    const atSelf = pattern.shape === 'cone' || pattern.anchor === 'self';
    mob.hazardX = atSelf ? mob.x : target.x;
    mob.hazardZ = atSelf ? mob.z : target.z;
    mob.hazardRadius = pattern.radius;
    mob.hazardMs = pattern.windupMs;
    mob.hazardPower = pattern.power;
    mob.hazardArc = pattern.shape === 'cone' ? (pattern.angleDeg ?? 90) * Math.PI / 180 : FULL_CIRCLE;
    mob.hazardAngle = Math.atan2(target.z - mob.z, target.x - mob.x);
  }
  return [];
}
