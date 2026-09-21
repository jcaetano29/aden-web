import { describe, expect, it } from 'vitest';
import { classAdvice, npcStory, questTurnInText } from './questNarrative.js';
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
});
