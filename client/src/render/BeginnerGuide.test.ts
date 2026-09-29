// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { BeginnerGuide, beginnerLesson } from './BeginnerGuide.js';

const start = { questId: '', questProgress: 0, mapId: 'pueblo', level: 1, hp: 100, maxHp: 100, statPoints: 0, dead: false };
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); });

describe('first adventures', () => {
  it('teaches NPCs before travel, then combat, then handing in the actual completed quest', () => {
    expect(beginnerLesson(start)?.id).toBe('npc');
    expect(beginnerLesson({ ...start, questId: 'q1' })?.id).toBe('travel');
    expect(beginnerLesson({ ...start, questId: 'q1', mapId: 'bosque' })?.id).toBe('combat');
    expect(beginnerLesson({ ...start, questId: 'q1', mapId: 'bosque', questProgress: 6 })?.id).toBe('rewards');
  });
  it('responds to low health and level-up points without requiring the player to get hurt for a tutorial', () => {
    expect(beginnerLesson({ ...start, questId: 'q1', hp: 30 })?.id).toBe('recovery');
    expect(beginnerLesson({ ...start, questId: 'q1', level: 2, statPoints: 3 })?.id).toBe('stats');
    expect(beginnerLesson({ ...start, dead: true })?.id).toBe('death');
  });
  it('introduces equipment after its reward, objects next, and boss mechanics later', () => {
    expect(beginnerLesson({ ...start, questId: 'q_supplies' })?.id).toBe('equipment');
    expect(beginnerLesson({ ...start, questId: 'q_supplies' }, new Set(['equipment']))?.id).toBe('objects');
    expect(beginnerLesson({ ...start, questId: 'q_alpha', mapId: 'bosque' })?.id).toBe('boss');
    expect(beginnerLesson({ ...start, questId: 'q_crypt', mapId: 'cripta', level: 5 })?.id).toBe('dungeon');
  });
  it('does not restart beginner tips for advanced or unknown campaigns', () => {
    for (const state of [{ ...start, level: 11 }, { ...start, questId: 'campaign_complete' }, { ...start, questId: 'a2_caravan' }]) {
      expect(beginnerLesson(state)).toBeUndefined();
    }
  });
  it('remembers dismissed lessons for the same character, isolates others, and resets a newly created name', () => {
    const guide = new BeginnerGuide(document.body);
    guide.setCharacter('RowanFan'); guide.update(start);
    document.querySelector<HTMLButtonElement>('[data-guide-ack]')!.click();
    guide.setCharacter('RowanFan'); guide.update(start);
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(true);
    guide.setCharacter('rowanfan'); guide.update(start);
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(false);
    guide.setCharacter('RowanFan', true); guide.update(start);
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(false);
  });
  it('can hide tips across sessions and reopen the reference without losing the quest tracker', () => {
    const guide = new BeginnerGuide(document.body);
    guide.setCharacter('Hero'); guide.update(start);
    document.querySelector<HTMLButtonElement>('[data-guide-hide]')!.click();
    guide.setCharacter('Hero'); guide.update(start);
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(true);
    guide.toggleManual();
    expect(document.querySelector<HTMLElement>('[data-guide-manual]')!.hidden).toBe(false);
    expect(document.querySelectorAll('[data-guide-manual] details').length).toBeGreaterThan(10);
    document.querySelector<HTMLButtonElement>('[data-guide-resume]')!.click();
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(false);
  });
  it('ignores malformed saved preferences', () => {
    const guide = new BeginnerGuide(document.body);
    guide.setCharacter('Hero'); guide.update(start);
    document.querySelector<HTMLButtonElement>('[data-guide-ack]')!.click();
    localStorage.setItem(localStorage.key(0)!, '{"seen":null,"hidden":"yes"}');
    expect(() => guide.setCharacter('Hero')).not.toThrow();
    guide.update(start);
    expect(document.querySelector<HTMLElement>('[data-guide-tip]')!.hidden).toBe(false);
  });
});
