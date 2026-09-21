import type { Note, Voice } from './score.js';

interface Timbre { partials: number[]; attack: number; release: number; level: number; cutoff: number; detune?: number; pluck?: boolean; }
const TIMBRES: Record<Voice, Timbre> = {
  strings: { partials: [1, .42, .21, .15, .08, .06, .04], attack: .7, release: 1.2, level: .15, cutoff: 1900, detune: 5 },
  choir: { partials: [1, .1, .3, .04, .12, .02], attack: .95, release: 1.8, level: .14, cutoff: 1400, detune: 4 },
  harp: { partials: [1, .55, .23, .13, .06, .03], attack: .008, release: 1.1, level: .25, cutoff: 3600, pluck: true },
  flute: { partials: [1, .13, .055, .015], attack: .14, release: .35, level: .24, cutoff: 3800, detune: 1.5 },
  bell: { partials: [1, .04, .4, .015, .16, .01, .055], attack: .008, release: 2.3, level: .16, cutoff: 4200, pluck: true },
  horn: { partials: [1, .5, .27, .13, .07, .025], attack: .28, release: .6, level: .2, cutoff: 1300, detune: 2.5 },
  bass: { partials: [1, .25, .08], attack: .09, release: .5, level: .25, cutoff: 450 },
  drum: { partials: [1, .13], attack: .006, release: .35, level: .46, cutoff: 700, pluck: true },
};

export function seededNoise(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 * 2 - 1; };
}

/** Diffuse, damped stereo room; generated once per scene, never downloaded. */
export function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const frames = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, frames, ctx.sampleRate);
  const random = seededNoise(937);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel); let low = 0;
    for (let i = 0; i < frames; i++) {
      low = low * .55 + random() * .45;
      // Predelay gives the melody room; the tail reaches zero without a hard edge.
      data[i] = i < ctx.sampleRate * .025 ? 0 : low * Math.pow(1 - i / frames, 2.8);
    }
  }
  return buffer;
}

/** Short-lived voices with explicit release/disconnection; works online and offline. */
export class Instruments {
  private readonly waves = new Map<Voice, PeriodicWave>();
  private readonly cleanups = new Set<() => void>();
  private readonly vibrato: OscillatorNode;
  private readonly vibratoDepth: GainNode;

  constructor(private readonly ctx: BaseAudioContext, private readonly output: AudioNode) {
    this.vibrato = ctx.createOscillator(); this.vibrato.frequency.value = 4.7;
    this.vibratoDepth = ctx.createGain(); this.vibratoDepth.gain.value = 3;
    this.vibrato.connect(this.vibratoDepth); this.vibrato.start();
  }

  play(note: Note, at: number, beatSeconds: number): void {
    const ctx = this.ctx, timbre = TIMBRES[note.voice];
    let wave = this.waves.get(note.voice);
    if (!wave) {
      wave = ctx.createPeriodicWave(new Float32Array(timbre.partials.length + 1), new Float32Array([0, ...timbre.partials]));
      this.waves.set(note.voice, wave);
    }
    const duration = note.duration * beatSeconds;
    const attack = Math.min(timbre.attack, duration * .35);
    const end = at + duration + timbre.release;
    const envelope = ctx.createGain(), filter = ctx.createBiquadFilter(), pan = ctx.createStereoPanner();
    filter.type = 'lowpass'; filter.frequency.value = timbre.cutoff; filter.Q.value = .5;
    pan.pan.value = note.pan;
    filter.connect(envelope); envelope.connect(pan); pan.connect(this.output);
    const peak = timbre.level * note.velocity * (timbre.detune ? .6 : 1);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(peak, at + attack);
    if (timbre.pluck) {
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * .15), at + duration);
    } else {
      envelope.gain.linearRampToValueAtTime(peak * .75, at + duration);
    }
    envelope.gain.linearRampToValueAtTime(0, end);
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const detunes = timbre.detune ? [-timbre.detune, timbre.detune] : [0];
    const oscillators = detunes.map(detune => {
      const osc = ctx.createOscillator(); osc.setPeriodicWave(wave!);
      osc.frequency.setValueAtTime(frequency * (note.voice === 'drum' ? 1.8 : 1), at);
      if (note.voice === 'drum') osc.frequency.exponentialRampToValueAtTime(frequency * .7, at + .16);
      osc.detune.value = detune;
      if (timbre.detune) this.vibratoDepth.connect(osc.detune);
      osc.connect(filter); osc.start(at); osc.stop(end + .02); return osc;
    });
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return; cleaned = true;
      for (const osc of oscillators) {
        osc.onended = null;
        try { osc.stop(); } catch { /* already ended */ }
        if (timbre.detune) this.vibratoDepth.disconnect(osc.detune);
        osc.disconnect();
      }
      filter.disconnect(); envelope.disconnect(); pan.disconnect(); this.cleanups.delete(cleanup);
    };
    oscillators[oscillators.length - 1].onended = cleanup;
    this.cleanups.add(cleanup);
  }

  dispose(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.vibrato.stop(); this.vibrato.disconnect(); this.vibratoDepth.disconnect(); this.waves.clear();
  }
}
