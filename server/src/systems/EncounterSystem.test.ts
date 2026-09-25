import { describe, it, expect, afterEach } from 'vitest';
import { ENCOUNTERS } from '@aden/shared';
import { MobState } from '../state/MobState.js';
import { PlayerState } from '../state/PlayerState.js';
import { stepEncounter, inHazard } from './EncounterSystem.js';

afterEach(() => { delete ENCOUNTERS.test_cone; });

function setup() {
  ENCOUNTERS.test_cone = { templateId: 'test_cone', aggroRadius: 14, cooldownMs: 5000,
    patterns: [{ shape: 'cone', anchor: 'self', radius: 8, angleDeg: 90, windupMs: 1000, power: 2 }] };
  const mob = new MobState(); mob.templateId = 'test_cone'; mob.mapId = 'm'; mob.x = 0; mob.z = 0; mob.hp = mob.maxHp = 100; mob.aggroTargetId = 'p';
  const p = new PlayerState(); p.mapId = 'm'; p.x = 5; p.z = 0;
  return { mob, p, players: new Map([['p', p]]) };
}

describe('EncounterSystem', () => {
  it('aims a cone at the target when the warning starts and keeps it fixed', () => {
    const { mob, p, players } = setup();
    stepEncounter(mob, players, 50);
    expect(mob.hazardMs).toBe(1000);
    expect(mob.hazardArc).toBeCloseTo(Math.PI / 2);
    expect(mob.hazardAngle).toBeCloseTo(0);
    p.x = 0; p.z = 5;
    expect(mob.hazardAngle).toBeCloseTo(0);
    expect(stepEncounter(mob, players, 1000)).toEqual([]);
  });
  it('hits only inside the aperture and radius', () => {
    const { mob } = setup();
    mob.hazardX = 0; mob.hazardZ = 0; mob.hazardRadius = 8; mob.hazardArc = Math.PI / 2; mob.hazardAngle = 0;
    expect(inHazard(mob, 5, 0)).toBe(true);
    expect(inHazard(mob, 5, 4)).toBe(true);
    expect(inHazard(mob, 5, 6)).toBe(false);
    expect(inHazard(mob, 0, 5)).toBe(false);
    expect(inHazard(mob, -3, 0)).toBe(false);
    expect(inHazard(mob, 9, 0)).toBe(false);
    mob.hazardArc = Math.PI * 2;
    expect(inHazard(mob, -3, 0)).toBe(true);
  });
  it('lands the cone on a target that stays in front', () => {
    const { mob, players } = setup();
    stepEncounter(mob, players, 50);
    expect(stepEncounter(mob, players, 1000)).toEqual(['p']);
    expect(mob.hazardCooldownMs).toBe(5000);
  });
});
