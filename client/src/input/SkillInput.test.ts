// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { SkillInput } from './SkillInput.js';
afterEach(() => document.body.replaceChildren());

it('lets Space activate guide summaries and buttons without casting a skill', () => {
  const host = document.createElement('div');
  host.innerHTML = '<details><summary>Combate</summary></details><button>Entendido</button>';
  document.body.append(host);
  const cast = vi.fn(); const input = new SkillInput(cast);
  input.setSkills(['power_strike']); input.attach(host);
  for (const target of host.querySelectorAll<HTMLElement>('summary,button')) {
    target.focus();
    const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(cast).not.toHaveBeenCalled();
  }
  host.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', bubbles: true }));
  expect(cast).toHaveBeenCalledWith('power_strike');
  cast.mockClear();
  (document.activeElement as HTMLElement).blur();
  host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  expect(cast).toHaveBeenCalledWith('power_strike');
});
