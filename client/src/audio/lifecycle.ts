import type { AudioEngine } from './AudioEngine.js';

/** Keep gesture listeners available for browsers that interrupt or reject audio. */
export function attachAudioLifecycle(audio: AudioEngine): () => void {
  const resume = () => { void audio.resume(); };
  const visibility = () => audio.setHidden(document.hidden);
  const pagehide = (event: PageTransitionEvent) => {
    if (event.persisted) audio.setHidden(true);
    else { cleanup(); audio.dispose(); }
  };
  const cleanup = () => {
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', visibility);
    document.removeEventListener('visibilitychange', visibility);
  };
  window.addEventListener('pointerdown', resume);
  window.addEventListener('keydown', resume);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', visibility);
  document.addEventListener('visibilitychange', visibility);
  visibility();
  return cleanup;
}
