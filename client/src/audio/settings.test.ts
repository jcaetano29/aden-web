import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_SETTINGS, readAudioSettings, saveAudioSettings } from './settings.js';

describe('audio preferences', () => {
  it('restores independent levels, clamps values and rejects invalid fields', () => {
    const storage = { getItem: () => JSON.stringify({ music: 0, ambience: 4, effects: 'bad', muted: 'false' }) };
    expect(readAudioSettings(storage)).toEqual({ music: 0, ambience: 1, effects: DEFAULT_AUDIO_SETTINGS.effects, muted: false });
  });
  it('survives unavailable storage, malformed JSON and null', () => {
    for (const getItem of [() => '{', () => 'null', () => { throw Error('blocked'); }]) {
      expect(readAudioSettings({ getItem })).toEqual(DEFAULT_AUDIO_SETTINGS);
    }
    expect(() => saveAudioSettings({ setItem: () => { throw Error('full'); } }, DEFAULT_AUDIO_SETTINGS)).not.toThrow();
  });
  it('round-trips silence and mute without resetting defaults', () => {
    let value = '';
    const storage = { setItem: (_: string, v: string) => { value = v; }, getItem: () => value };
    const settings = { music: 0, ambience: .2, effects: .4, muted: true };
    saveAudioSettings(storage, settings);
    expect(readAudioSettings(storage)).toEqual(settings);
  });
});
