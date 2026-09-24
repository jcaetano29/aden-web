import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone } from './world.js';
import { getNpc } from './npcs.js';
import { getQuest, nextQuestId, CAMPAIGN_COMPLETE } from './quests.js';
import { getWorldObject } from './worldobjects.js';
import { findPath, isWalkable } from './navigation.js';

describe('Veil prologue', () => {
  it('preserves Act I and adds a region reachable at level ten', () => {
    expect(nextQuestId('q6')).toBe(CAMPAIGN_COMPLETE);
    const zone = getZone('marismas');
    expect(canEnterZone(zone, 9)).toBe(false);
    expect(canEnterZone(zone, 10)).toBe(true);
    expect(getNpc('maera').mapId).toBe(zone.id);
    expect(getNpc('boren').mapId).toBe(zone.id);
  });
  it('requires separate clues and a traversable route to each objective', () => {
    const zone = getZone('marismas');
    const first = getQuest('a2_caravan');
    const second = getQuest(nextQuestId(first.id));
    expect(second.targetId).not.toBe(first.targetId);
    for (const id of [first.targetId!, second.targetId!]) {
      const object = getWorldObject(id);
      expect(isWalkable(zone.id, object)).toBe(true);
      expect(findPath(zone.id, zone.spawn, object).length).toBeGreaterThan(0);
    }
  });
});
