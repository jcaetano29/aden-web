import { describe, expect, it } from 'vitest';
import { getQuest, nextQuestId } from './quests.js';
import { getZone } from './world.js';
import { expToNextLevel, getMobExp } from './progression.js';
import { getNpc } from './npcs.js';
import { getWorldObject } from './worldobjects.js';
import { findPath } from './navigation.js';

describe('Monastery campaign', () => {
  it('reaches the level-15 encounter through mandatory objectives alone', () => {
    let level = 10, xp = 0;
    const visited = new Set<string>();
    for (let id = 'a2_arrival'; id !== 'memory_campaign_complete'; id = id === 'veil_prologue_complete' ? 'a2_monastery' : nextQuestId(id)) {
      expect(visited.has(id), id).toBe(false); visited.add(id);
      if (id === 'veil_prologue_complete') continue;
      const q = getQuest(id);
      expect(level).toBeGreaterThanOrEqual(getZone(q.mapId!).levelReq);
      if (id === 'a2_prior') expect(level).toBeGreaterThanOrEqual(15);
      xp += q.rewardExp + (q.objective === 'kill' ? q.amount * getMobExp(q.mobTemplateId) : 0);
      while (xp >= expToNextLevel(level)) { xp -= expToNextLevel(level); level++; }
    }
  });
  it('keeps Iria and every ordered object reachable from the entrance', () => {
    const zone = getZone('monasterio');
    for (const point of [getNpc('iria'), ...['monastery_archive_1','monastery_archive_2','monastery_cell_1','monastery_cell_2','monastery_cell_3','monastery_anchor_1','monastery_anchor_2'].map(getWorldObject)]) {
      expect(findPath(zone.id, zone.spawn, point).length).toBeGreaterThan(0);
    }
  });
});
