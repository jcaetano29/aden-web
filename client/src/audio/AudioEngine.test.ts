// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { AudioEngine } from "./AudioEngine.js";

// Stub mínimo de AudioContext que registra la creación de nodos.
function makeStubCtx() {
  const osc = { type: "sine", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 }, connect: vi.fn() };
  const ctx = {
    currentTime: 0,
    destination: {},
    state: "running",
    resume: vi.fn(),
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(64) })),
    createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    sampleRate: 44100,
  };
  return ctx;
}

describe("AudioEngine", () => {
  it("no crea nodos hasta resume()", () => {
    const ctx = makeStubCtx();
    const a = new AudioEngine(() => ctx as unknown as AudioContext);
    a.play("hit"); // sin resume → no-op
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it("tras resume(), play() sintetiza (crea nodos)", () => {
    const ctx = makeStubCtx();
    const a = new AudioEngine(() => ctx as unknown as AudioContext);
    a.resume();
    a.play("hit");
    expect(ctx.createGain).toHaveBeenCalled();
    expect(ctx.createOscillator.mock.calls.length + ctx.createBufferSource.mock.calls.length).toBeGreaterThan(0);
  });

  it("muteado, play() no sintetiza", () => {
    const ctx = makeStubCtx();
    const a = new AudioEngine(() => ctx as unknown as AudioContext);
    a.resume();
    a.setMuted(true);
    const before = ctx.createOscillator.mock.calls.length;
    a.play("levelup");
    expect(ctx.createOscillator.mock.calls.length).toBe(before);
  });

  it("toggleMuted alterna e informa el estado", () => {
    const a = new AudioEngine(() => makeStubCtx() as unknown as AudioContext);
    expect(a.isMuted).toBe(false);
    expect(a.toggleMuted()).toBe(true);
    expect(a.isMuted).toBe(true);
  });

  it("sin AudioContext disponible (factory null) no crashea", () => {
    const a = new AudioEngine(() => null);
    a.resume();
    expect(() => a.play("boss")).not.toThrow();
  });
});
