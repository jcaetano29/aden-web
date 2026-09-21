import { ZONES, getZone } from '@aden/shared';
import { AudioEngine } from '../audio/AudioEngine.js';
import { attachAudioLifecycle } from '../audio/lifecycle.js';
import { getSoundtrack } from '../audio/score.js';
import { AudioPanel } from '../render/AudioPanel.js';
import { Minimap } from '../render/Minimap.js';
import { injectTheme } from '../render/theme.js';
import { Renderer } from '../render/Renderer.js';
import { Environment } from '../render/Environment.js';
import { preloadMaterialAtlas } from '../render/materialAtlas.js';

injectTheme();
const audio = new AudioEngine();
attachAudioLifecycle(audio);
const mixer = new AudioPanel(audio), minimap = new Minimap();
const status = document.querySelector<HTMLElement>('#status')!;
const buttons = new Map<string, HTMLButtonElement>();
let mapId = 'pueblo';
const renderer = new Renderer(document.querySelector<HTMLElement>('#app')!);
await preloadMaterialAtlas();
const environment = new Environment(renderer.scene);

function select(id: string): void {
  mapId = id; const zone = getZone(id), soundtrack = getSoundtrack(id);
  audio.setMap(id); minimap.setMap(zone);
  for (const [map, button] of buttons) button.setAttribute('aria-pressed', String(map === id));
  status.textContent = `${soundtrack.title} · ${soundtrack.bpm} pulsos/min · ${soundtrack.meter}/4`;
  environment.updateMood(zone.center.x, zone.center.z, 100);
  renderer.camera.position.set(zone.center.x + 20, 38, zone.center.z + 39);
  renderer.camera.lookAt(zone.center.x, 0, zone.center.z);
}

for (const zone of ZONES) {
  const button = document.createElement('button'); button.className = 'aden-btn'; button.textContent = zone.name;
  button.dataset.map = zone.id;
  button.addEventListener('click', () => { select(zone.id); void audio.resume(); });
  document.querySelector('#maps')!.append(button); buttons.set(zone.id, button);
}
document.querySelector('#listen')!.addEventListener('click', () => { audio.setMuted(false); void audio.resume(); });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.repeat) return;
  if (event.key.toLowerCase() === 'n') audio.toggleMuted();
});
window.addEventListener('pagehide', event => { if (!event.persisted) mixer.dispose(); });
select(mapId);
let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  const zone = getZone(mapId); environment.updateMood(zone.center.x, zone.center.z, dt);
  renderer.render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.body.dataset.ready = 'true';
