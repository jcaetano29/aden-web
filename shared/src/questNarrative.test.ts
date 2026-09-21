import { describe, expect, it } from 'vitest';
import { classAdvice, cryptStory, npcStory, questTurnInText } from './questNarrative.js';
import { getQuest } from './quests.js';

describe('forest narrative', () => {
  it('introduces the next assignment without restarting a completed campaign', () => {
    expect(questTurnInText('q1')).toContain(getQuest('q1').done);
    expect(questTurnInText('q1')).toContain(getQuest('q_supplies').intro);
    expect(questTurnInText('q6')).toBe(getQuest('q6').done);
  });
  it('only advises skills available at the player level', () => {
    expect(classAdvice('mage', 1)).not.toContain('Lanza de Hielo');
    expect(classAdvice('mage', 3)).toContain('Lanza de Hielo');
    expect(classAdvice('ranger', 3)).not.toContain('Flecha de Zarzas');
    expect(classAdvice('ranger', 8)).toContain('Flecha de Zarzas');
    expect(classAdvice('unknown', 1)).toBe('');
  });
  it('does not thank players for supplies they have not recovered', () => {
    const before = npcStory('merchant', 'q_supplies', 'knight', 2);
    const after = npcStory('merchant', 'q_shrine', 'knight', 2);
    expect(before).not.toBe(after);
    expect(after).toContain('recuperaste');
    expect(npcStory('merchant', 'unknown', 'knight', 2)).toBe('');
  });
  it('lets town characters acknowledge the victory without offering the forest again', () => {
    for (const npc of ['merchant', 'smith', 'healer', 'captain']) {
      expect(npcStory(npc, 'campaign_complete', 'mage', 10)).toContain('Nihil');
    }
  });
  it('updates every town service after the crypt instead of repeating the forest story', () => {
    for (const npc of ['merchant', 'smith', 'healer', 'captain']) {
      const ruins = npcStory(npc, 'q3', 'mage', 5);
      const crypt = npcStory(npc, 'q_crypt', 'mage', 6);
      const ash = npcStory(npc, 'q5', 'mage', 7);
      expect(ruins).not.toBe(crypt);
      expect(crypt).not.toBe(ash);
      expect(ash).not.toBe(npcStory(npc, 'q6', 'mage', 9));
    }
  });
  it('reveals crypt lore by expedition stage and ignores invalid stages', () => {
    expect(cryptStory(0)).not.toContain('Custodio cayó');
    expect(cryptStory(5)).toContain('Custodio cayó');
    expect(new Set(Array.from({ length: 6 }, (_, stage) => cryptStory(stage))).size).toBe(6);
    expect(cryptStory(-1)).toBe('');
    expect(cryptStory(99)).toBe('');
  });
});
