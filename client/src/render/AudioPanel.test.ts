// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../audio/AudioEngine.js';
import { AudioPanel } from './AudioPanel.js';

afterEach(() => { document.body.innerHTML = ''; });
describe('map sound controls', () => {
  it('shows the current piece, adjusts channels and reflects the N mute state', () => {
    const audio = new AudioEngine(() => null, null);
    const panel = new AudioPanel(audio);
    audio.setMap('bosque');
    expect(document.body.textContent).toContain('Susurros de Umbra');
    const toggle = document.querySelector<HTMLButtonElement>('[data-audio-toggle]')!;
    toggle.click(); expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const slider = document.querySelector<HTMLInputElement>('input[aria-label="Volumen de música"]')!;
    slider.value = '25'; slider.dispatchEvent(new Event('input'));
    expect(audio.settings.music).toBe(.25);
    expect(audio.settings.effects).toBe(.8);
    audio.toggleMuted();
    expect(document.querySelector('[data-audio-mute]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.body.textContent).toContain('Activar sonido');
    audio.setMap('cripta'); expect(document.body.textContent).toContain('Las dos llamas');
    panel.dispose(); audio.dispose();
  });

  it('closes with Escape, preserves focus and isolates panel hotkeys', () => {
    const audio = new AudioEngine(() => null, null), panel = new AudioPanel(audio);
    const toggle = document.querySelector<HTMLButtonElement>('[data-audio-toggle]')!;
    toggle.click();
    document.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    const gameplay = vi.fn(); document.body.addEventListener('keydown', gameplay, { once: true });
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(gameplay).toHaveBeenCalledTimes(1);
    panel.dispose(); expect(document.querySelector('[data-audio-panel]')).toBeNull();
    expect(() => audio.setMap('pueblo')).not.toThrow(); audio.dispose();
  });
});
