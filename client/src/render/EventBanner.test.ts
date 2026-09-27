// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { EventBanner } from './EventBanner.js';

it('counts down to the invasion and then shows time left and the guild ranking', () => {
  const parent = document.createElement('div'), banner = new EventBanner(parent);
  const base = { invaderId: 'crimson_dragon', mapId: 'pueblo', x: 0, z: -24, radius: 30, startsAt: 400_000, endsAt: 1_600_000, ranking: [] as string[] };
  banner.update({ ...base, phase: 'announced' }, 128_000);
  expect(parent.textContent).toContain('Dragón Carmesí');
  expect(parent.textContent).toContain('Pueblo de Aden');
  expect(parent.textContent).toContain('04:32');
  banner.update({ ...base, phase: 'active', ranking: ['AAA · 70%', 'BBB · 30%'] }, 400_000);
  expect(parent.textContent).toContain('20:00');
  expect(parent.textContent).toContain('AAA · 70%');
  banner.update(null, 0);
  expect((parent.firstElementChild as HTMLElement).style.display).toBe('none');
});
