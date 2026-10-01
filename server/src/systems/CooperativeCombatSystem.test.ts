import { describe, expect, it, vi } from 'vitest';
import { getSkill } from '@aden/shared';
import { GameState } from '../state/GameState.js';
import { PlayerState } from '../state/PlayerState.js';
import { MobState } from '../state/MobState.js';
import { CooperativeCombatSystem } from './CooperativeCombatSystem.js';

function setup() {
  const state = new GameState(), support = vi.fn();
  const system = new CooperativeCombatSystem(state, support);
  function player(id: string, className = 'knight') {
    const p = new PlayerState();
    Object.assign(p, { loaded: true, hp: 1000, maxHp: 1000, partyId: 'team', mapId: 'bosque', level: 25, className });
    state.players.set(id, p); return p;
  }
  const tank = player('tank'), ally = player('ally', 'mage'), rogue = player('rogue', 'rogue');
  const mob = new MobState();
  Object.assign(mob, { templateId: 'crimson_dragon', mapId: 'bosque', hp: 10000, maxHp: 10000, pAtk: 100, pDef: 100, level: 25 });
  state.mobs.set('boss', mob);
  return { state, system, support, tank, ally, rogue, mob };
}

describe('cooperative effects and effective contribution', () => {
  it('prevents PvE damage only while the protector stays alive, nearby and in party', () => {
    const { system, tank, ally, support } = setup();
    system.protect('tank', ally);
    expect(system.mitigate('ally', 'boss', 100)).toBe(70);
    expect(support).toHaveBeenCalledWith('boss', 'tank', 30);
    tank.x = 13;
    expect(system.mitigate('ally', 'boss', 100)).toBe(100);
    system.tick(50);
    expect(ally.cooperation.protectedMs).toBe(0);
  });

  it('credits only life actually saved and no protection when both hits are lethal', () => {
    const { system, ally, support } = setup();
    system.protect('tank', ally); ally.hp = 80;
    expect(system.mitigate('ally', 'boss', 100)).toBe(70);
    expect(support).toHaveBeenLastCalledWith('boss', 'tank', 10);
    support.mockClear(); ally.hp = 60;
    system.mitigate('ally', 'boss', 100);
    expect(support).not.toHaveBeenCalled();
  });

  it('credits actual healing only when the teammate is engaged and never self healing', () => {
    const { system, support, mob, tank, ally } = setup();
    system.healed('ally', 'tank', 100);
    system.healed('ally', 'ally', 100);
    expect(support).not.toHaveBeenCalled();
    expect(tank.msSinceCombat).toBe(100000); expect(ally.msSinceCombat).toBe(100000);
    mob.threat.set('tank', 100);
    system.healed('ally', 'tank', 0);
    expect(support).not.toHaveBeenCalled();
    system.healed('ally', 'tank', 100);
    expect(support).toHaveBeenCalledWith('boss', 'ally', 100);
    expect(mob.threat.get('ally')).toBe(50);
  });

  it('does not stack repeated rallies and restricts mark bonuses to the caster party', () => {
    const { system, tank, ally, mob } = setup();
    system.rally('tank'); system.rally('tank');
    mob.markedBy = 'tank'; mob.markedMs = 6000;
    expect(system.modifiers('ally', mob).factor).toBeCloseTo(1.15 * 1.1);
    tank.partyId = 'other';
    expect(system.modifiers('ally', mob).factor).toBe(1);
    system.tick(50); expect(ally.cooperation.rallyMs).toBe(0);
  });

  it('puts an effective PvP healer in combat without awarding invasion support', () => {
    const { state, system, tank, ally, support } = setup();
    state.mobs.clear(); tank.msSinceCombat = 0;
    system.healed('ally', 'tank', 100);
    expect(ally.msSinceCombat).toBe(0);
    expect(support).not.toHaveBeenCalled();
  });

  it('credits no extra damage when the unbuffed hit would already kill the enemy', () => {
    const { system, mob, support } = setup();
    system.rally('tank');
    system.recordHit('boss', 'ally', 1, system.modifiers('ally', mob), 115, 1);
    expect(support).not.toHaveBeenCalled();
    system.recordHit('boss', 'ally', 115, system.modifiers('ally', mob), 115, 1000);
    expect(support).toHaveBeenCalledWith('boss', 'tank', 15);
  });

  it('lets a timed interrupt stop a boss but rejects chained control for eight seconds', () => {
    const { system, mob, support } = setup();
    mob.hazardMs = 1000; mob.channeling = true;
    system.afterSkill('rogue', 'boss', getSkill('shadowstep'));
    expect(mob.hazardMs).toBe(0); expect(mob.channeling).toBe(false);
    expect(support).toHaveBeenCalledOnce();
    expect(system.control(mob, 1000)).toBe(false);
    system.tick(8000);
    expect(system.control(mob, 1000)).toBe(true);
  });

  it('does not consume boss recovery for an interrupt with no attack to interrupt', () => {
    const { system, mob } = setup();
    expect(system.control(mob, 0, 0, true)).toBe(false);
    expect(mob.controlImmuneMs).toBe(0);
  });

  it('does not count an immobilization as interrupting an ongoing stationary attack', () => {
    const { system, mob, support } = setup();
    mob.hazardMs = 1000;
    system.afterSkill('ally', 'boss', getSkill('snaring_shot'));
    expect(mob.hazardMs).toBe(1000);
    expect(support).not.toHaveBeenCalled();
  });

  it('does not award interrupt support when no ally was threatened', () => {
    const { system, mob, tank, ally, support } = setup();
    tank.x = ally.x = 20;
    mob.hazardMs = 1000; mob.hazardRadius = 5;
    system.afterSkill('rogue', 'boss', getSkill('shadowstep'));
    expect(mob.hazardMs).toBe(0);
    expect(support).not.toHaveBeenCalled();
  });

  it('clears threat and cooperative marks when a monster resets', () => {
    const { system, mob } = setup();
    system.recordHit('boss', 'tank', 40);
    expect(mob.threat.get('tank')).toBe(100);
    system.afterSkill('rogue', 'boss', getSkill('backstab'));
    expect(mob.exposedMs).toBe(5000);
    system.resetMob(mob);
    expect(mob.threat.size).toBe(0); expect(mob.exposedMs).toBe(0);
  });

  it('forgets a departed target even while a boss is channeling and AI is paused', () => {
    const { system, mob, tank } = setup();
    system.afterSkill('tank', 'boss', getSkill('shield_bash'));
    mob.hazardMs = 6000; tank.mapId = 'minas';
    system.tick(50);
    expect(mob.threat.has('tank')).toBe(false);
    expect(mob.tauntTargetId).toBe('');
  });
});
