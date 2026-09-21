import { getSoundtrack } from './score.js';
import { Soundscape } from './Soundscape.js';
import { browserAudioStorage, readAudioSettings, saveAudioSettings, type AudioChannel, type AudioSettings, type AudioStorage } from './settings.js';

export type Sfx = "hit" | "hurt" | "die" | "levelup" | "cast" | "boss" | "pickup" | "dodge";

function defaultCtxFactory(): AudioContext | null {
  const Ctx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

const MASTER_VOL = 0.3;

/**
 * Música, ambiente y SFX originales, con un único contexto y mezcla persistente.
 * El contexto se crea lazy en
 * resume() (política de autoplay: llamar tras el primer gesto del usuario).
 * Degrada a no-op si no hay AudioContext (tests/SSR).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<AudioChannel, GainNode> | null = null;
  private preferences: AudioSettings;
  private mapId: string | null = null;
  private active: Soundscape | null = null;
  private outgoing: { scene: Soundscape; until: number; expedited?: boolean } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private resumeAttempt: Promise<void> | null = null;
  private playbackGeneration = 0;
  private resumeRequested = false;
  private unlocked = false;
  private hidden = false;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  private readonly effects = new Set<() => void>();

  constructor(
    private readonly ctxFactory: () => AudioContext | null = defaultCtxFactory,
    private readonly storage: AudioStorage | null = browserAudioStorage(),
  ) { this.preferences = readAudioSettings(storage); }

  resume(): Promise<void> {
    if (this.disposed || this.hidden) return Promise.resolve();
    if (this.resumeAttempt) return this.resumeAttempt;
    this.resumeRequested = true;
    try {
      if (!this.ctx) {
        this.ctx = this.ctxFactory();
        if (!this.ctx) return Promise.resolve();
        this.master = this.ctx.createGain(); this.master.gain.value = this.isMuted ? 0 : MASTER_VOL;
        this.master.connect(this.ctx.destination);
        this.buses = { music: this.ctx.createGain(), ambience: this.ctx.createGain(), effects: this.ctx.createGain() };
        for (const channel of ['music', 'ambience', 'effects'] as const) {
          this.buses[channel].gain.value = this.preferences[channel]; this.buses[channel].connect(this.master);
        }
      }
      const ctx = this.ctx;
      const generation = this.playbackGeneration;
      this.resumeAttempt = Promise.resolve(ctx.resume()).then(() => {
        if (this.disposed || this.hidden || generation !== this.playbackGeneration || ctx.state !== 'running') return;
        this.unlocked = true; this.syncMap(); this.startScheduler();
      }).catch(() => { /* Autoplay can reject; the next gesture retries. */ }).finally(() => {
        if (generation === this.playbackGeneration) this.resumeAttempt = null;
      });
      return this.resumeAttempt;
    } catch { return Promise.resolve(); }
  }

  get settings(): Readonly<AudioSettings> { return { ...this.preferences }; }
  get currentSoundtrack() { return this.mapId ? getSoundtrack(this.mapId) : null; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  private notify(): void { for (const listener of this.listeners) listener(); }
  private save(): void { saveAudioSettings(this.storage, this.preferences); this.notify(); }

  setVolume(channel: AudioChannel, value: number): void {
    if (!Number.isFinite(value)) return;
    this.preferences[channel] = Math.max(0, Math.min(1, value));
    if (this.ctx && this.buses) this.buses[channel].gain.setTargetAtTime(this.preferences[channel], this.ctx.currentTime, .04);
    this.save();
  }

  setMap(mapId: string): void {
    const id = getSoundtrack(mapId).id;
    if (id === this.mapId || this.disposed) return;
    this.mapId = id; this.syncMap(); this.notify();
  }

  private syncMap(): void {
    if (!this.ctx || !this.buses || !this.unlocked || this.hidden || !this.mapId || this.active?.profile.id === this.mapId) return;
    const now = this.ctx.currentTime;
    if (this.outgoing && now < this.outgoing.until) {
      // A third destination releases the old tail before creating another scene.
      // Keep only the latest map request, at most two scenes, and no hard audio cut.
      if (!this.outgoing.expedited) {
        this.outgoing.scene.fadeOut(now, .08);
        this.outgoing.until = now + .08; this.outgoing.expedited = true;
      }
      return;
    }
    this.outgoing?.scene.dispose(); this.outgoing = null;
    if (this.active) {
      this.active.fadeOut(now, 4);
      this.outgoing = { scene: this.active, until: now + 4 };
    }
    this.active = new Soundscape(this.ctx, getSoundtrack(this.mapId), this.buses.music, this.buses.ambience);
    this.active.start(now + .04, this.outgoing ? 4 : 2);
    this.tick(); this.startScheduler();
  }

  private tick = (): void => {
    if (!this.ctx || this.ctx.state !== 'running' || this.hidden) return;
    const now = this.ctx.currentTime;
    this.active?.schedule(now);
    if (this.outgoing) {
      if (now >= this.outgoing.until) { this.outgoing.scene.dispose(); this.outgoing = null; this.syncMap(); }
      else this.outgoing.scene.schedule(now);
    }
  };

  private startScheduler(): void {
    if (this.active && !this.hidden && !this.timer) this.timer = setInterval(this.tick, 150);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) {
      // A later resume must be queued AFTER suspend, even if a prior resume is pending.
      this.playbackGeneration++; this.resumeAttempt = null;
      if (this.timer) clearInterval(this.timer); this.timer = null;
      void this.ctx?.suspend().catch(() => {});
    } else if (this.resumeRequested && this.ctx) { void this.resume(); }
  }

  setMuted(m: boolean): void {
    this.preferences.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : MASTER_VOL, this.ctx.currentTime, .025);
    this.save();
  }
  toggleMuted(): boolean { this.setMuted(!this.isMuted); return this.isMuted; }
  get isMuted(): boolean { return this.preferences.muted; }

  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    if (this.timer) clearInterval(this.timer); this.timer = null;
    this.active?.dispose(); this.outgoing?.scene.dispose(); this.active = null; this.outgoing = null;
    for (const cleanup of this.effects) cleanup();
    if (this.buses) for (const node of Object.values(this.buses)) node.disconnect();
    this.master?.disconnect(); this.listeners.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null; this.master = null; this.buses = null;
  }

  private trackEffect(source: AudioScheduledSourceNode, gain: GainNode): void {
    const cleanup = () => {
      source.onended = null;
      try { source.stop(); } catch { /* ended */ }
      source.disconnect(); gain.disconnect(); this.effects.delete(cleanup);
    };
    source.onended = cleanup; this.effects.add(cleanup);
  }

  /** Un tono con envelope ADSR simple. */
  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0): void {
    if (!this.ctx || !this.buses) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.buses.effects);
    this.trackEffect(osc, g);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Ráfaga de ruido (para golpes/esquives). */
  private noise(dur: number, vol: number): void {
    if (!this.ctx || !this.buses) return;
    const t0 = this.ctx.currentTime;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(this.buses.effects);
    this.trackEffect(src, g);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(sfx: Sfx): void {
    if (this.isMuted || this.hidden || this.preferences.effects === 0 || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    switch (sfx) {
      case "hit":    this.tone("square", 220, 110, 0.09, 0.5); break;
      case "hurt":   this.tone("sawtooth", 160, 70, 0.14, 0.5); break;
      case "die":    this.tone("triangle", 200, 50, 0.30, 0.5); break;
      case "cast":   this.tone("sine", 300, 720, 0.16, 0.4); break;
      case "pickup": this.tone("triangle", 660, 990, 0.10, 0.35); break;
      case "dodge":  this.noise(0.12, 0.35); break;
      case "levelup": {
        const notes = [523, 659, 784, 1047]; // C E G C — arpegio ascendente
        notes.forEach((f, i) => this.tone("triangle", f, f, 0.14, 0.45, i * .08));
        break;
      }
      case "boss": {
        this.tone("sawtooth", 110, 55, 0.5, 0.5);
        this.tone("square", 220, 110, 0.5, 0.3);
        break;
      }
    }
  }
}
