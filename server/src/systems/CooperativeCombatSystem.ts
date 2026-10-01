import { distance2D, getEncounter, pvePower, isReturningHome, type SkillConfig } from '@aden/shared';
import { inHazard, isEncounterEligible } from './EncounterSystem.js';
import { canFightDungeonMob } from './AdventureSystem.js';
import type { GameState } from '../state/GameState.js';
import type { MobState } from '../state/MobState.js';
import type { PlayerState } from '../state/PlayerState.js';

export interface CooperativeModifiers {
  factor: number;
  defenseMultiplier: number;
  sources: { id: string; fraction: number }[];
}

/** Party combat rules. Only the room applies resources, damage, kills and broadcasts. */
export class CooperativeCombatSystem {
  constructor(private readonly state: GameState, private readonly support: (mobId: string, playerId: string, amount: number) => void) {}

  arePartners(a: PlayerState, b: PlayerState): boolean {
    return !a.dead && !b.dead && a.hp > 0 && b.hp > 0 && a.mapId !== 'castillo' &&
      a.mapId === b.mapId && !!a.partyId && a.partyId === b.partyId;
  }

  ally(caster: PlayerState, id: unknown, range = 10): PlayerState | undefined {
    if (typeof id !== 'string' || !id) return;
    const target = this.state.players.get(id);
    return target && target !== caster && this.arePartners(caster, target) && distance2D(caster.x, caster.z, target.x, target.z) <= range ? target : undefined;
  }

  protect(casterId: string, ally: PlayerState): void {
    ally.cooperation.protectedBy = casterId;
    ally.cooperation.protectedMs = 6000;
  }

  rally(casterId: string): void {
    const caster = this.state.players.get(casterId)!;
    for (const p of this.state.players.values()) if (p !== caster && this.arePartners(caster, p) && distance2D(caster.x, caster.z, p.x, p.z) <= 10) {
      p.cooperation.rallyMs = 6000; p.cooperation.rallyBy = casterId;
    }
  }

  /** Credit only actual healing to a teammate currently involved with the enemy. */
  healed(casterId: string, targetId: string, actual: number): void {
    if (actual <= 0 || casterId === targetId) return;
    const caster = this.state.players.get(casterId), target = this.state.players.get(targetId);
    if (!caster || !target || !this.arePartners(caster, target)) return;
    // Helping a teammate fighting another player also puts the healer in combat.
    if (target.msSinceCombat < 5000) caster.msSinceCombat = target.msSinceCombat = 0;
    for (const [id, mob] of this.state.mobs) if (!mob.dead && mob.mapId === target.mapId &&
      (mob.aggroTargetId === targetId || mob.threat.has(targetId)) && distance2D(mob.x, mob.z, target.x, target.z) <= 25) {
      caster.msSinceCombat = target.msSinceCombat = 0;
      this.addThreat(mob, casterId, actual * .5);
      this.support(id, casterId, actual);
    }
  }

  mitigate(targetId: string, mobId: string, damage: number): number {
    const p = this.state.players.get(targetId);
    if (!p || damage <= 0 || p.cooperation.protectedMs <= 0) return damage;
    const protector = this.ally(p, p.cooperation.protectedBy, 12);
    if (!protector) return damage;
    const reduced = Math.round(damage * .7);
    const prevented = Math.min(p.hp, damage) - Math.min(p.hp, reduced);
    if (prevented > 0) {
      protector.msSinceCombat = 0;
      this.support(mobId, p.cooperation.protectedBy, prevented);
      const mob = this.state.mobs.get(mobId);
      if (mob) this.addThreat(mob, p.cooperation.protectedBy, prevented);
    }
    return reduced;
  }

  modifiers(attackerId: string, mob: MobState, includeArmor = true): CooperativeModifiers {
    const p = this.state.players.get(attackerId)!;
    const sources: CooperativeModifiers['sources'] = [];
    // Keep the tank within the solo campaign pacing targets; PvP is unchanged.
    let factor = p.className === 'knight' ? 1.12 : 1;
    if (p.cooperation.rallyMs > 0 && this.ally(p, p.cooperation.rallyBy, 12)) {
      factor *= 1.15; sources.push({ id: p.cooperation.rallyBy, fraction: .15 / 1.15 });
    }
    const marker = this.state.players.get(mob.markedBy);
    if (mob.markedMs > 0 && marker && !marker.dead && marker.mapId === mob.mapId && (mob.markedBy === attackerId || this.arePartners(marker, p))) {
      factor *= 1.1;
      if (mob.markedBy !== attackerId) sources.push({ id: mob.markedBy, fraction: .1 / 1.1 });
    }
    const exposed = includeArmor && mob.exposedMs > 0;
    const exposer = this.state.players.get(mob.exposedBy);
    if (exposed && exposer && mob.exposedBy !== attackerId && this.arePartners(exposer, p)) {
      sources.push({ id: mob.exposedBy, fraction: 1 - (100 + mob.pDef * .8) / (100 + mob.pDef) });
    }
    return { factor, defenseMultiplier: exposed ? .8 : 1, sources };
  }

  recordHit(mobId: string, attackerId: string, actual: number, modifiers?: CooperativeModifiers, rawDamage = actual, hpBefore = actual): void {
    const mob = this.state.mobs.get(mobId);
    if (!mob || actual <= 0) return;
    this.addThreat(mob, attackerId, actual);
    for (const source of modifiers?.sources ?? []) {
      const withoutBonus = Math.max(1, Math.round(rawDamage * (1 - source.fraction)));
      const extra = Math.max(0, actual - Math.min(hpBefore, withoutBonus));
      if (extra > 0) this.support(mobId, source.id, extra);
    }
  }

  private addThreat(mob: MobState, id: string, amount: number): void {
    const p = this.state.players.get(id);
    mob.threat.set(id, (mob.threat.get(id) ?? 0) + amount * (p?.className === 'knight' ? 2.5 : 1));
  }

  /** Returns true if control landed. Boss recovery prevents chained permanent interruptions. */
  control(mob: MobState, stunMs = 0, rootMs = 0, interrupt = false): boolean {
    if (!stunMs && !rootMs && !interrupt) return false;
    const boss = !!getEncounter(mob.templateId);
    if (boss && mob.controlImmuneMs > 0) return false;
    const interrupted = (stunMs > 0 || interrupt) && (mob.hazardMs > 0 || mob.windupMs > 0);
    mob.stunMs = Math.max(mob.stunMs, stunMs);
    mob.rootMs = Math.max(mob.rootMs, rootMs);
    if (interrupted) {
      mob.hazardMs = 0; mob.channeling = false; mob.windupMs = 0; mob.windupTargetId = '';
      mob.hazardCooldownMs = Math.max(mob.hazardCooldownMs, 3000);
    }
    if (boss && (interrupted || stunMs > 0 || rootMs > 0)) mob.controlImmuneMs = 8000;
    return interrupted || stunMs > 0 || rootMs > 0;
  }

  afterSkill(attackerId: string, mobId: string, skill: SkillConfig): void {
    const p = this.state.players.get(attackerId)!, mob = this.state.mobs.get(mobId)!;
    if (mob.hp <= 0) return;
    if (skill.id === 'shield_bash' || skill.id === 'shield_charge') {
      mob.tauntMs = 4000; mob.tauntTargetId = attackerId;
      mob.threat.set(attackerId, Math.max(0, ...mob.threat.values()) + 1);
      mob.aggroTargetId = attackerId;
    }
    if (skill.id === 'backstab') { mob.exposedBy = attackerId; mob.exposedMs = 5000; }
    if (skill.id === 'aimed_shot') { mob.markedBy = attackerId; mob.markedMs = 6000; }
    const encounter = getEncounter(mob.templateId);
    const threatenedAlly = [...this.state.players.entries()].some(([id, ally]) => ally !== p && this.arePartners(p, ally) &&
      ((mob.hazardMs > 0 && encounter && isEncounterEligible(encounter, ally) && inHazard(mob, ally.x, ally.z)) ||
       (mob.windupMs > 0 && mob.windupTargetId === id)));
    const hadHazard = mob.hazardMs > 0, hadWindup = mob.windupMs > 0;
    this.control(mob, skill.stunMs, skill.rootMs, skill.id === 'shadowstep');
    const interrupted = (hadHazard && mob.hazardMs === 0) || (hadWindup && mob.windupMs === 0);
    if (interrupted && threatenedAlly) {
      this.support(mobId, attackerId, mob.pAtk * .5);
    }
    if (skill.id === 'snaring_shot') {
      const adds = [...this.state.mobs.values()].filter(other => other !== mob && !other.dead && !isReturningHome(other) && p.level >= (getEncounter(other.templateId)?.minTargetLevel ?? 0) && other.mapId === mob.mapId &&
        distance2D(other.x, other.z, mob.x, mob.z) <= 4 && pvePower(p.level, other.level).outgoing > 0 && canFightDungeonMob(p, other.templateId));
      for (const add of adds.slice(0, 2)) this.control(add, 0, skill.rootMs);
    }
  }

  tick(dtMs: number): void {
    for (const [id, p] of this.state.players) {
      const c = p.cooperation;
      c.protectedMs = p.dead || !this.ally(p, c.protectedBy, 12) ? 0 : Math.max(0, c.protectedMs - dtMs);
      if (!c.protectedMs) c.protectedBy = '';
      c.rallyMs = p.dead || !this.ally(p, c.rallyBy, 12) ? 0 : Math.max(0, c.rallyMs - dtMs);
      if (!c.rallyMs) c.rallyBy = '';
      if (p.dead) this.clearPlayer(id);
    }
    for (const mob of this.state.mobs.values()) {
      // AI may be paused by a windup, channel or stun. Departed targets still lose threat now.
      const eligible = (id: string) => {
        const p = this.state.players.get(id);
        return p && !p.dead && p.hp > 0 && p.mapId === mob.mapId;
      };
      for (const id of mob.threat.keys()) if (!eligible(id)) mob.threat.delete(id);
      if (mob.tauntTargetId && !eligible(mob.tauntTargetId)) mob.tauntMs = 0;
      mob.tauntMs = Math.max(0, mob.tauntMs - dtMs);
      mob.controlImmuneMs = Math.max(0, mob.controlImmuneMs - dtMs);
      mob.markedMs = Math.max(0, mob.markedMs - dtMs);
      mob.exposedMs = Math.max(0, mob.exposedMs - dtMs);
      if (!mob.tauntMs) mob.tauntTargetId = '';
    }
  }

  clearPlayer(id: string): void {
    for (const p of this.state.players.values()) {
      if (p.cooperation.protectedBy === id || this.state.players.get(id) === p) { p.cooperation.protectedMs = 0; p.cooperation.protectedBy = ''; }
      if (p.cooperation.rallyBy === id || this.state.players.get(id) === p) { p.cooperation.rallyMs = 0; p.cooperation.rallyBy = ''; }
    }
    for (const mob of this.state.mobs.values()) { mob.threat.delete(id); if (mob.tauntTargetId === id) { mob.tauntMs = 0; mob.tauntTargetId = ''; } }
  }

  resetMob(mob: MobState): void {
    mob.threat.clear(); mob.poisons.clear(); mob.tauntMs = mob.controlImmuneMs = mob.markedMs = mob.exposedMs = 0;
    mob.tauntTargetId = mob.markedBy = mob.exposedBy = '';
  }
}
