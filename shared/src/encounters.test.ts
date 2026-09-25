import { describe, it, expect } from 'vitest';
import { ENCOUNTERS, getEncounter, encounterInterruptFor } from './encounters.js';
import { MOB_TEMPLATES } from './mobs.js';
import { getWorldObject } from './worldobjects.js';
import { MEMORY_ANCHORS } from './monastery.js';

describe('encounters', () => {
  it('keeps the current boss numbers', () => {
    expect(getEncounter('crypt_warden')).toMatchObject({ aggroRadius: 14, cooldownMs: 7000, patterns: [{ shape: 'circle', anchor: 'target', radius: 6, windupMs: 1600, power: 2.2 }] });
    for (const id of ['crypt_behemoth', 'veil_guardian', 'memory_jailer']) {
      expect(getEncounter(id)).toMatchObject({ cooldownMs: 9000, patterns: [{ radius: 5, windupMs: 2000, power: 2.2 }] });
    }
    expect(getEncounter('skeleton_king')).toMatchObject({ cooldownMs: 8000, belowHalf: { cooldownMs: 5000 }, patterns: [{ radius: 6, windupMs: 1800, power: 2.8 }] });
    const prior = getEncounter('memory_prior')!;
    expect(prior).toMatchObject({ cooldownMs: 6000, requiresQuest: 'a2_prior', patterns: [{ radius: 6, windupMs: 1800, power: 2.4 }] });
    expect(prior.belowHalf!.patterns![1]).toMatchObject({ anchor: 'self', radius: 14, windupMs: 6000, power: 3.2, channel: true, interruptCooldownMs: 9000, interruptStunMs: 3000 });
  });
  it('only references real enemies and world objects', () => {
    for (const def of Object.values(ENCOUNTERS)) {
      expect(MOB_TEMPLATES[def.templateId]).toBeDefined();
      for (const p of [...def.patterns, ...(def.belowHalf?.patterns ?? [])]) for (const o of p.interruptObjects ?? []) expect(getWorldObject(o).id).toBe(o);
    }
  });
  it('finds the channel an object interrupts', () => {
    for (const anchor of MEMORY_ANCHORS) expect(encounterInterruptFor(anchor)?.templateId).toBe('memory_prior');
    expect(encounterInterruptFor('bosque_shrine')).toBeNull();
    expect(getEncounter('veil_raider')).toBeUndefined();
  });
});
