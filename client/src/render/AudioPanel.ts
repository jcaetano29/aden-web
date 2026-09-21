import type { AudioEngine } from '../audio/AudioEngine.js';
import type { AudioChannel } from '../audio/settings.js';
import './AudioPanel.css';
import './GameLayout.css';

/** Compact mixer below the radar; the flyout follows the existing stone/gold HUD. */
export class AudioPanel {
  private readonly root = document.createElement('div');
  private readonly toggle = document.createElement('button');
  private readonly flyout = document.createElement('section');
  private readonly title = document.createElement('div');
  private readonly description = document.createElement('p');
  private readonly mute = document.createElement('button');
  private readonly sliders = new Map<AudioChannel, { input: HTMLInputElement; output: HTMLOutputElement }>();
  private readonly unsubscribe: () => void;
  private readonly outside = (event: PointerEvent) => {
    if (event.target instanceof Node && !this.root.contains(event.target)) this.setOpen(false);
  };

  constructor(private readonly audio: AudioEngine, parent: HTMLElement = document.body) {
    this.root.className = 'aden-audio'; this.root.dataset.audioPanel = '';
    this.toggle.type = 'button'; this.toggle.className = 'aden-audio-toggle'; this.toggle.dataset.audioToggle = '';
    this.toggle.setAttribute('aria-expanded', 'false'); this.toggle.setAttribute('aria-controls', 'aden-audio-mixer');
    this.toggle.title = 'Música y sonido · N para silenciar';
    this.toggle.addEventListener('click', () => { void audio.resume(); this.setOpen(this.flyout.hidden); });
    this.flyout.id = 'aden-audio-mixer'; this.flyout.className = 'aden-panel aden-audio-mixer'; this.flyout.hidden = true;
    this.flyout.setAttribute('aria-label', 'Música y sonido');
    const heading = document.createElement('h2'); heading.textContent = 'Música y sonido';
    this.title.className = 'aden-audio-title'; this.title.setAttribute('aria-live', 'polite');
    this.description.className = 'aden-audio-description';
    this.flyout.append(heading, this.title, this.description);
    const channels: [AudioChannel, string, string][] = [
      ['music', 'Música', 'Volumen de música'], ['ambience', 'Ambiente', 'Volumen de ambiente'], ['effects', 'Efectos', 'Volumen de efectos'],
    ];
    for (const [channel, label, aria] of channels) {
      const row = document.createElement('label'); row.className = 'aden-audio-level';
      const caption = document.createElement('span'); caption.textContent = label;
      const output = document.createElement('output');
      const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1';
      input.setAttribute('aria-label', aria);
      input.addEventListener('input', () => audio.setVolume(channel, Number(input.value) / 100));
      row.append(caption, output, input); this.flyout.append(row); this.sliders.set(channel, { input, output });
    }
    this.mute.type = 'button'; this.mute.className = 'aden-btn'; this.mute.dataset.audioMute = '';
    this.mute.addEventListener('click', () => { audio.toggleMuted(); void audio.resume(); });
    const hint = document.createElement('small'); hint.textContent = 'N silencia todo · Se guarda en este navegador';
    this.flyout.append(this.mute, hint); this.root.append(this.toggle, this.flyout); parent.append(this.root);
    // Sliders use arrows and Space themselves. Do not send their keystrokes into combat.
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        this.setOpen(false); this.toggle.focus(); event.stopPropagation(); return;
      }
      if (event.key === 'n' || event.key === 'N') {
        if (!event.repeat) { audio.toggleMuted(); void audio.resume(); }
        event.stopPropagation(); return;
      }
      if (event.target instanceof HTMLInputElement || event.key === ' ' || event.key === 'Enter') event.stopPropagation();
    });
    window.addEventListener('pointerdown', this.outside);
    this.unsubscribe = audio.subscribe(() => this.refresh()); this.refresh();
  }

  private setOpen(open: boolean): void {
    this.flyout.hidden = !open; this.toggle.setAttribute('aria-expanded', String(open));
  }

  private refresh(): void {
    const settings = this.audio.settings, track = this.audio.currentSoundtrack;
    this.toggle.textContent = settings.muted ? '♫  Sonido apagado' : '♫  Música y sonido';
    this.title.textContent = track?.title ?? 'El viaje está por comenzar';
    this.description.textContent = track?.description ?? 'La música acompaña al mapa que estés explorando.';
    this.mute.textContent = settings.muted ? 'Activar sonido' : 'Silenciar todo';
    this.mute.setAttribute('aria-pressed', String(settings.muted));
    for (const [channel, { input, output }] of this.sliders) {
      const value = Math.round(settings[channel] * 100);
      input.value = String(value); output.value = `${value}%`;
      input.setAttribute('aria-valuetext', `${value}%`);
    }
  }

  dispose(): void { this.unsubscribe(); window.removeEventListener('pointerdown', this.outside); this.root.remove(); }
}
