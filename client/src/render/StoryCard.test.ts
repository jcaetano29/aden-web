// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { StoryCard } from './StoryCard.js';
afterEach(() => document.body.replaceChildren());

it('lets an existing character enter immediately without replaying the prologue', async () => {
  const card = new StoryCard();
  await card.showForEntry('login');
  expect(document.querySelector<HTMLElement>('[data-story-card]')!.style.display).toBe('none');
});

it('shows the prologue for a newly created character and continues on its action', async () => {
  const card = new StoryCard();
  const entry = card.showForEntry('create');
  expect(document.querySelector<HTMLElement>('[data-story-card]')!.style.display).toBe('flex');
  document.querySelector<HTMLButtonElement>('[data-story-card] button')!.click();
  await entry;
  expect(document.querySelector<HTMLElement>('[data-story-card]')!.style.display).toBe('none');
});
