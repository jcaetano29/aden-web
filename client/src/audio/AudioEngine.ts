export type Sfx = "hit" | "hurt" | "die" | "levelup" | "cast" | "boss" | "pickup" | "dodge";

function defaultCtxFactory(): AudioContext | null {
  const Ctx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

const MASTER_VOL = 0.3;

/**
 * SFX sintetizados con Web Audio (sin archivos). El contexto se crea lazy en
 * resume() (política de autoplay: llamar tras el primer gesto del usuario).
 * Degrada a no-op si no hay AudioContext (tests/SSR).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  constructor(private readonly ctxFactory: () => AudioContext | null = defaultCtxFactory) {}

  resume(): void {
    if (!this.ctx) {
      this.ctx = this.ctxFactory();
      if (this.ctx) {
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : MASTER_VOL;
        this.master.connect(this.ctx.destination);
      }
    }
    this.ctx?.resume?.();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : MASTER_VOL;
  }
  toggleMuted(): boolean { this.setMuted(!this.muted); return this.muted; }
  get isMuted(): boolean { return this.muted; }

  /** Un tono con envelope ADSR simple. */
  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Ráfaga de ruido (para golpes/esquives). */
  private noise(dur: number, vol: number): void {
    if (!this.ctx || !this.master) return;
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
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(sfx: Sfx): void {
    if (this.muted || !this.ctx || !this.master) return;
    switch (sfx) {
      case "hit":    this.tone("square", 220, 110, 0.09, 0.5); break;
      case "hurt":   this.tone("sawtooth", 160, 70, 0.14, 0.5); break;
      case "die":    this.tone("triangle", 200, 50, 0.30, 0.5); break;
      case "cast":   this.tone("sine", 300, 720, 0.16, 0.4); break;
      case "pickup": this.tone("triangle", 660, 990, 0.10, 0.35); break;
      case "dodge":  this.noise(0.12, 0.35); break;
      case "levelup": {
        const notes = [523, 659, 784, 1047]; // C E G C — arpegio ascendente
        notes.forEach((f, i) => setTimeout(() => this.tone("triangle", f, f, 0.14, 0.45), i * 80));
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
