import { describe, expect, it, vi } from 'vitest';
const voices = vi.hoisted(() => ({ play: vi.fn(), dispose: vi.fn() }));
vi.mock('./instruments.js', () => ({
  Instruments: vi.fn(() => voices), roomImpulse: vi.fn(() => ({})), seededNoise: () => () => .1,
}));
import { Soundscape } from './Soundscape.js';
import { getSoundtrack, buildScore } from './score.js';

function setup() {
  const nodes: any[] = [];
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const node = () => {
    const n = { gain: param(), frequency: param(), pan: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    nodes.push(n); return n;
  };
  const ctx = { sampleRate: 100, createGain: node, createConvolver: node, createOscillator: node, createStereoPanner: node,
    createBiquadFilter: node, createBufferSource: node, createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }) };
  voices.play.mockClear(); voices.dispose.mockClear();
  return { nodes, ctx: ctx as unknown as BaseAudioContext, output: node() as unknown as AudioNode };
}

describe('soundscape scheduling', () => {
  it('does not replay the lookahead or burst missed notes after a stalled frame', () => {
    const { ctx, output } = setup();
    const scene = new Soundscape(ctx, getSoundtrack('pueblo'), output, output);
    scene.start(0, 2); scene.schedule(0);
    const initial = voices.play.mock.calls.length;
    scene.schedule(.1); expect(voices.play.mock.calls.length).toBe(initial);
    voices.play.mockClear(); scene.schedule(51);
    expect(voices.play.mock.calls.length).toBeLessThan(12);
    expect(voices.play.mock.calls.every(call => call[1] >= 51 && call[1] <= 51.6)).toBe(true);
    scene.dispose();
  });
  it('schedules the loop seam without a missing first chord or duplicate notes', () => {
    const { ctx, output } = setup(), profile = getSoundtrack('bosque');
    const scene = new Soundscape(ctx, profile, output, output);
    const duration = buildScore(profile).beats * 60 / profile.bpm;
    scene.start(0, 2); scene.schedule(duration - .3);
    const firstChord = voices.play.mock.calls.filter(call => Math.abs(call[1] - duration) < .001);
    expect(firstChord).toHaveLength(4);
    voices.play.mockClear(); scene.schedule(duration + .05);
    expect(voices.play.mock.calls.filter(call => Math.abs(call[1] - duration) < .001)).toHaveLength(0);
    scene.dispose();
  });
  it('fades rapid travel from its actual gain and releases every retained node once', () => {
    const { ctx, output, nodes } = setup();
    const scene = new Soundscape(ctx, getSoundtrack('cripta'), output, output);
    scene.start(10, 4); scene.fadeOut(11, 4);
    expect(nodes[1].gain.setValueAtTime).toHaveBeenLastCalledWith(.25, 11);
    scene.fadeOut(12, .08);
    expect(nodes[1].gain.setValueAtTime).toHaveBeenLastCalledWith(.1875, 12);
    scene.dispose(); scene.dispose();
    expect(voices.dispose).toHaveBeenCalledTimes(1);
    expect(nodes.slice(1).every(n => n.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
