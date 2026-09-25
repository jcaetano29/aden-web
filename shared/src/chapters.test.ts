import { describe, it, expect } from 'vitest';
import { CHAPTERS, campaignIndex, questReached, isChapterComplete, chapterAfter, nextQuestId, mapGate } from './chapters.js';
import { QUEST_ORDER, CAMPAIGN_COMPLETE, getQuest } from './quests.js';
import { VEIL_QUEST_ORDER, VEIL_COMPLETE } from './veil.js';
import { MONASTERY_QUEST_ORDER, MEMORY_COMPLETE } from './monastery.js';

describe('campaign chapters', () => {
  it('chains every chapter in order and ends each on its complete state', () => {
    expect(CHAPTERS.map(c => c.id)).toEqual(['act1', 'veil', 'memory']);
    expect(nextQuestId(QUEST_ORDER[QUEST_ORDER.length - 1])).toBe(CAMPAIGN_COMPLETE);
    expect(nextQuestId(VEIL_QUEST_ORDER[VEIL_QUEST_ORDER.length - 1])).toBe(VEIL_COMPLETE);
    expect(nextQuestId(MONASTERY_QUEST_ORDER[MONASTERY_QUEST_ORDER.length - 1])).toBe(MEMORY_COMPLETE);
    for (const c of CHAPTERS) expect(nextQuestId(c.completeId)).toBe(c.completeId);
    expect(nextQuestId('unknown')).toBe('q1');
  });
  it('offers each chapter from the previous complete state through its NPC', () => {
    expect(chapterAfter(CAMPAIGN_COMPLETE)?.id).toBe('veil');
    expect(chapterAfter(CAMPAIGN_COMPLETE)?.start).toMatchObject({ npcId: 'elder', minLevel: 10 });
    expect(chapterAfter(VEIL_COMPLETE)?.start).toMatchObject({ npcId: 'maera', minLevel: 12 });
    expect(chapterAfter(MEMORY_COMPLETE)).toBeNull();
    expect(chapterAfter('q1')).toBeNull();
  });
  it('orders progress globally for gates', () => {
    expect(questReached('a2_prior', 'a2_prior')).toBe(true);
    expect(questReached(MEMORY_COMPLETE, 'a2_prior')).toBe(true);
    expect(questReached('a2_jailer', 'a2_prior')).toBe(false);
    expect(questReached('', 'a2_prior')).toBe(false);
    expect(campaignIndex(CAMPAIGN_COMPLETE)).toBe(QUEST_ORDER.length);
    expect(isChapterComplete(VEIL_COMPLETE)).toBe(true);
    expect(isChapterComplete('q1')).toBe(false);
  });
  it('gates the Monastery until the Veil is recovered, and nothing else', () => {
    const gate = mapGate('monasterio')!;
    expect(gate.from).toBe(VEIL_COMPLETE);
    for (const id of [VEIL_COMPLETE, ...MONASTERY_QUEST_ORDER, MEMORY_COMPLETE]) expect(questReached(id, gate.from)).toBe(true);
    for (const id of [...QUEST_ORDER, CAMPAIGN_COMPLETE, ...VEIL_QUEST_ORDER]) expect(questReached(id, gate.from)).toBe(false);
    expect(mapGate('marismas')).toBeNull();
  });
  it('references only real quests', () => {
    for (const c of CHAPTERS) for (const id of c.questOrder) expect(getQuest(id).id).toBe(id);
  });
});
