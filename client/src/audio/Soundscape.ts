import { buildScore, type Soundtrack } from './score.js';
import { Instruments, roomImpulse, seededNoise } from './instruments.js';

/** One map's music and ambience. AudioEngine owns its lifetime and clock. */
export class Soundscape {
  private readonly score;
  private readonly music: GainNode;
  private readonly ambience: GainNode;
  private readonly instruments: Instruments;
  private readonly room: ConvolverNode;
  private readonly input: GainNode;
  private readonly wet: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private startAt = 0;
  private noteIndex = 0;
  private cycle = 0;
  private nextAccent = 0;
  private accentIndex = 0;
  private fadeStart = 0;
  private fadeDuration = 1;
  private fadeFrom = 0;
  private fadeTo = 1;
  private disposed = false;

  constructor(private readonly ctx: BaseAudioContext, readonly profile: Soundtrack, musicBus: AudioNode, ambienceBus: AudioNode) {
    this.score = buildScore(profile);
    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(musicBus);
    this.ambience = ctx.createGain(); this.ambience.gain.value = 0; this.ambience.connect(ambienceBus);
    this.input = ctx.createGain(); this.input.gain.value = .85; this.input.connect(this.music);
    this.room = ctx.createConvolver(); this.room.buffer = roomImpulse(ctx, profile.reverb);
    this.wet = ctx.createGain(); this.wet.gain.value = .32;
    this.input.connect(this.room); this.room.connect(this.wet); this.wet.connect(this.music);
    this.instruments = new Instruments(ctx, this.input);
  }

  start(at: number, fadeSeconds: number): void {
    this.startAt = at; this.nextAccent = at + 2; this.fadeStart = at; this.fadeDuration = fadeSeconds;
    for (const node of [this.music, this.ambience]) {
      node.gain.setValueAtTime(0, at); node.gain.linearRampToValueAtTime(1, at + fadeSeconds);
    }
    this.startWind(at);
  }

  private startWind(at: number): void {
    const ctx = this.ctx, frames = Math.ceil(ctx.sampleRate * 8);
    const buffer = ctx.createBuffer(2, frames, ctx.sampleRate), random = seededNoise(61 + this.profile.tonic);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel); let brown = 0;
      for (let i = 0; i < frames; i++) {
        brown = (brown + random() * .045) / 1.025;
        // Smooth periodic loop window: no seam in the wind/foliage bed.
        data[i] = brown * Math.sin(Math.PI * i / (frames - 1)) ** 2;
      }
    }
    const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = this.profile.windHz;
    const level = ctx.createGain(); level.gain.value = this.profile.wind;
    source.connect(filter); filter.connect(level); level.connect(this.ambience); source.start(at);
    // A slow gust modulates the bed without allocating work every animation frame.
    const gust = ctx.createOscillator(); gust.frequency.value = .085;
    const depth = ctx.createGain(); depth.gain.value = this.profile.wind * .32;
    gust.connect(depth); depth.connect(level.gain); gust.start(at);
    this.sources.push(source, gust); this.nodes.push(source, gust, filter, level, depth);
  }

  private accent(at: number): void {
    const id = this.profile.id, bird = id === 'bosque' || id === 'pueblo';
    if (!bird && id !== 'cripta' && id !== 'ruinas') return;
    const ctx = this.ctx, osc = ctx.createOscillator(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
    const index = this.accentIndex++, duration = bird ? .3 : .75;
    const from = bird ? 1650 + index % 4 * 210 : 680 + index % 3 * 135;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(from * (bird ? 1.42 : .55), at + .09);
    osc.frequency.exponentialRampToValueAtTime(from * .9, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(bird ? .027 : .05, at + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    pan.pan.value = Math.sin(index * 2.4) * .7;
    osc.connect(gain); gain.connect(pan); pan.connect(this.ambience);
    osc.start(at); osc.stop(at + duration + .01);
    this.sources.push(osc); this.nodes.push(osc, gain, pan);
    osc.onended = () => {
      osc.disconnect(); gain.disconnect(); pan.disconnect();
      this.sources.splice(this.sources.indexOf(osc), 1);
      for (const node of [osc, gain, pan]) this.nodes.splice(this.nodes.indexOf(node), 1);
    };
  }

  /** Small lookahead; late frames skip elapsed notes instead of bursting them all. */
  schedule(now: number, horizon = now + .6): void {
    if (this.disposed) return;
    const beatSeconds = 60 / this.profile.bpm;
    const duration = this.score.beats * beatSeconds;
    const elapsedCycle = Math.max(0, Math.floor((now - this.startAt) / duration));
    if (elapsedCycle > this.cycle) { this.cycle = elapsedCycle; this.noteIndex = 0; }
    for (;;) {
      const note = this.score.notes[this.noteIndex];
      const at = this.startAt + this.cycle * duration + note.beat * beatSeconds;
      if (at > horizon) break;
      if (at >= now - .04) this.instruments.play(note, Math.max(at, now), beatSeconds);
      this.noteIndex++;
      if (this.noteIndex === this.score.notes.length) { this.noteIndex = 0; this.cycle++; }
    }
    if (this.nextAccent <= horizon) {
      if (this.nextAccent >= now) this.accent(this.nextAccent);
      this.nextAccent = Math.max(now, this.nextAccent) + (this.profile.id === 'bosque' ? 5.7 : 11.3);
    }
  }

  fadeOut(at: number, seconds: number): void {
    // Account for both fade-in and a shortened outgoing fade on rapid travel.
    const progress = Math.max(0, Math.min(1, (at - this.fadeStart) / this.fadeDuration));
    const level = this.fadeFrom + (this.fadeTo - this.fadeFrom) * progress;
    for (const node of [this.music, this.ambience]) {
      node.gain.cancelScheduledValues(at); node.gain.setValueAtTime(level, at);
      node.gain.linearRampToValueAtTime(0, at + seconds);
    }
    this.fadeFrom = level; this.fadeTo = 0; this.fadeStart = at; this.fadeDuration = seconds;
  }

  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.instruments.dispose();
    for (const source of this.sources) { source.onended = null; try { source.stop(); } catch { /* ended */ } }
    for (const node of [...this.nodes, this.input, this.room, this.wet, this.music, this.ambience]) node.disconnect();
    this.room.buffer = null; this.sources.length = 0; this.nodes.length = 0;
  }
}
