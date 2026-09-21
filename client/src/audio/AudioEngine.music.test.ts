import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const scenes = vi.hoisted(() => [] as any[]);
vi.mock('./Soundscape.js', () => ({ Soundscape: vi.fn().mockImplementation((_ctx, profile) => {
  const scene = { profile, start: vi.fn(), schedule: vi.fn(), fadeOut: vi.fn(), dispose: vi.fn() };
  scenes.push(scene); return scene;
}) }));
import { AudioEngine } from './AudioEngine.js';

function context() {
  const gains: any[] = [];
  const ctx = {
    currentTime: 0, state: 'running', destination: {},
    resume: vi.fn(() => Promise.resolve()), suspend: vi.fn(() => Promise.resolve()), close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => {
      const node = { gain: { value: 1, setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
      gains.push(node); return node;
    }),
  };
  return { ctx, gains, factory: vi.fn(() => ctx as unknown as AudioContext) };
}

describe('map audio lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); scenes.length = 0; });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('waits for a gesture, starts the latest map, and never restarts it each frame', async () => {
    const { factory } = context(), audio = new AudioEngine(factory, null);
    audio.setMap('pueblo'); audio.setMap('bosque');
    expect(factory).not.toHaveBeenCalled();
    await audio.resume();
    expect(scenes.map(s => s.profile.id)).toEqual(['bosque']);
    audio.setMap('bosque'); await audio.resume();
    expect(scenes).toHaveLength(1); expect(factory).toHaveBeenCalledTimes(1);
    audio.dispose();
  });

  it('crossfades travel, bounds rapid switches to two scenes, then retires the tail', async () => {
    const { factory, ctx } = context(), audio = new AudioEngine(factory, null);
    audio.setMap('pueblo'); await audio.resume();
    ctx.currentTime = 3;
    audio.setMap('bosque');
    expect(scenes[0].fadeOut).toHaveBeenCalled();
    expect(scenes[0].dispose).not.toHaveBeenCalled();
    ctx.currentTime = 3.5; audio.setMap('cripta'); audio.setMap('trono');
    expect(scenes).toHaveLength(2);
    expect(scenes[0].dispose).not.toHaveBeenCalled();
    expect(scenes[0].fadeOut).toHaveBeenLastCalledWith(3.5, .08);
    ctx.currentTime = 3.7;
    vi.advanceTimersByTime(200);
    expect(scenes[0].dispose).toHaveBeenCalledTimes(1);
    expect(scenes[2].profile.id).toBe('trono');
    ctx.currentTime = 8;
    vi.advanceTimersByTime(200);
    expect(scenes[1].dispose).toHaveBeenCalledTimes(1);
    expect(scenes[2].dispose).not.toHaveBeenCalled();
    audio.dispose();
    expect(scenes[2].dispose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(ctx.close).toHaveBeenCalledTimes(1);
  });

  it('persists mute and independent channel volumes, notifying controls', async () => {
    const { factory, gains } = context(); let saved = '';
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
    const audio = new AudioEngine(factory, storage), onChange = vi.fn();
    const unsubscribe = audio.subscribe(onChange);
    audio.setVolume('music', 0); audio.setVolume('ambience', .2); audio.setMuted(true);
    await audio.resume();
    expect(audio.settings).toMatchObject({ music: 0, ambience: .2, muted: true });
    expect(gains[0].gain.value).toBe(0);
    expect(onChange).toHaveBeenCalledTimes(3);
    const restored = new AudioEngine(factory, storage);
    expect(restored.settings).toEqual(audio.settings);
    audio.setVolume('effects', NaN);
    expect(Number.isFinite(audio.settings.effects)).toBe(true);
    unsubscribe(); audio.dispose(); restored.dispose();
  });

  it('pauses hidden audio and allows a failed autoplay attempt to be retried', async () => {
    const { factory, ctx } = context(); ctx.resume.mockRejectedValueOnce(Error('autoplay'));
    const audio = new AudioEngine(factory, null); audio.setMap('ruinas');
    await expect(audio.resume()).resolves.toBeUndefined();
    expect(scenes).toHaveLength(0);
    await audio.resume(); expect(scenes).toHaveLength(1);
    audio.setHidden(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    audio.setHidden(false); await Promise.resolve(); await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalledTimes(3);
    expect(scenes).toHaveLength(1);
    audio.dispose();
  });

  it('does not unlock while hidden or resurrect after disposal during resume', async () => {
    const { factory, ctx } = context(), audio = new AudioEngine(factory, null);
    audio.setHidden(true); await audio.resume(); expect(factory).not.toHaveBeenCalled();
    audio.setHidden(false);
    let finish!: () => void;
    ctx.resume.mockImplementationOnce(() => new Promise<void>(r => { finish = r; }));
    audio.setMap('trono'); const pending = audio.resume(); audio.dispose(); finish(); await pending;
    expect(scenes).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
  });

  it('queues a fresh resume after hide/show instead of reusing the pre-suspend attempt', async () => {
    const { factory, ctx } = context(), audio = new AudioEngine(factory, null);
    const finish: (() => void)[] = [];
    ctx.state = 'suspended';
    ctx.resume.mockImplementation(() => new Promise<void>(resolve => { finish.push(resolve); }));
    audio.setMap('bosque'); const first = audio.resume();
    audio.setHidden(true); audio.setHidden(false);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    finish[0](); await first;
    expect(scenes).toHaveLength(0);
    ctx.state = 'running'; finish[1]();
    await audio.resume();
    expect(scenes).toHaveLength(1); expect(vi.getTimerCount()).toBe(1);
    audio.dispose();
  });

  it('degrades gracefully when audio construction is unavailable', async () => {
    for (const factory of [() => null, () => { throw Error('unavailable'); }]) {
      const audio = new AudioEngine(factory, null); audio.setMap('cripta');
      await expect(audio.resume()).resolves.toBeUndefined();
      audio.setMuted(true); audio.dispose();
    }
  });
});
