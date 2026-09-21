export type AudioChannel = 'music' | 'ambience' | 'effects';
export interface AudioSettings { music: number; ambience: number; effects: number; muted: boolean; }
export type AudioStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const AUDIO_SETTINGS_KEY = 'aden.audio.v1';
export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = { music: .7, ambience: .45, effects: .8, muted: false };

export function browserAudioStorage(): AudioStorage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readAudioSettings(storage: Pick<Storage, 'getItem'> | null): AudioSettings {
  const settings = { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const saved = JSON.parse(storage?.getItem(AUDIO_SETTINGS_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return settings;
    for (const channel of ['music', 'ambience', 'effects'] as const) {
      if (typeof saved[channel] === 'number' && Number.isFinite(saved[channel])) {
        settings[channel] = Math.max(0, Math.min(1, saved[channel]));
      }
    }
    if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
  } catch { /* Private browsing / corrupt settings must never prevent entering the game. */ }
  return settings;
}

export function saveAudioSettings(storage: Pick<Storage, 'setItem'> | null, settings: AudioSettings): void {
  try { storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Quota or permissions. */ }
}
