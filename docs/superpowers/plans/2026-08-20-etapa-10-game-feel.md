# Etapa 10 — Game feel & sonido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada acción del juego dé placer — sonido, screen-shake y números de daño jugosos enganchados a los eventos que ya existen — para hacer el core loop adictivo.

**Architecture:** 100% cliente. Dos módulos puros y testeables: `AudioEngine` (SFX sintetizados con WebAudio, sin archivos externos) y `ScreenShake` (sistema de "trauma" con decaimiento → offset de cámara). Se enganchan a los callbacks de red ya cableados en `main.ts` (`onDamage`/`onDeath`/`onLevelUp`/`onBossKilled`), a `Renderer` (offset de cámara) y a `DamageNumbers` (pop + tamaño por magnitud). Sin cambios de server ni de protocolo.

**Tech Stack:** TypeScript, Three.js, Web Audio API (procedural, sin assets), Vite, vitest (+ jsdom para los módulos DOM/audio).

**Spec:** (sin spec formal — el usuario eligió la dirección "game feel + sonido" el 2026-08-20; este plan es el diseño de la etapa, dentro del roadmap del proyecto).

## Global Constraints

- 100% cliente: NO tocar `server/` ni `shared/`. Sin cambios de protocolo (se reusan los eventos existentes).
- Audio PROCEDURAL con Web Audio API — nada de archivos de sonido ni CDNs (self-contained, funciona offline).
- Web Audio requiere un gesto del usuario para arrancar (política de autoplay): el contexto se crea/resume en el primer pointerdown/keydown.
- Verificación estricta: `npx tsc -p client/tsconfig.json --noEmit` limpio + `npm test --workspace @aden/client` verde.
- 0 artefactos. `jsdom` ya es devDependency (usar `// @vitest-environment jsdom` en tests que tocan DOM/WebAudio stubs).
- Los módulos nuevos deben degradar con gracia si no hay `AudioContext` (tests/SSR) — nunca lanzar.

---

### Task 1: cliente — AudioEngine (SFX procedural + mute)

**Files:**
- Create: `client/src/audio/AudioEngine.ts`
- Test: `client/src/audio/AudioEngine.test.ts`

**Interfaces:**
- Produces:
  - `export type Sfx = "hit" | "hurt" | "die" | "levelup" | "cast" | "boss" | "pickup" | "dodge";`
  - `class AudioEngine` con:
    - `constructor(ctxFactory?: () => AudioContext | null)` — factory inyectable para tests; por defecto crea un `AudioContext` real guardado (o null si no existe en el entorno).
    - `resume(): void` — crea (lazy) el contexto + nodo master y hace `ctx.resume()`. Llamar tras el primer gesto del usuario.
    - `play(sfx: Sfx): void` — sintetiza el efecto; no-op si está muteado o sin contexto.
    - `setMuted(m: boolean): void`, `toggleMuted(): boolean`, `get isMuted(): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// client/src/audio/AudioEngine.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/client -- AudioEngine`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Implement**

```ts
// client/src/audio/AudioEngine.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/client -- AudioEngine`
Expected: PASS (5 tests).

- [ ] **Step 5: Strict tsc**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/audio/AudioEngine.ts client/src/audio/AudioEngine.test.ts
git commit -m "feat(client): AudioEngine — SFX procedural con Web Audio + mute"
```

---

### Task 2: cliente — ScreenShake (trauma → offset de cámara)

**Files:**
- Create: `client/src/render/ScreenShake.ts`
- Test: `client/src/render/ScreenShake.test.ts`

**Interfaces:**
- Produces:
  - `class ScreenShake` con `addTrauma(amount: number): void`, `update(dt: number): { x: number; y: number }`, `get trauma(): number`.
  - Constantes: `MAX_OFFSET` (unidades de mundo, ~0.8), `DECAY` (trauma/seg, ~1.6).

- [ ] **Step 1: Write the failing test**

```ts
// client/src/render/ScreenShake.test.ts
import { describe, it, expect } from "vitest";
import { ScreenShake, MAX_OFFSET } from "./ScreenShake.js";

describe("ScreenShake", () => {
  it("sin trauma el offset es cero", () => {
    const s = new ScreenShake();
    expect(s.update(0.016)).toEqual({ x: 0, y: 0 });
  });

  it("addTrauma se clampea a 1", () => {
    const s = new ScreenShake();
    s.addTrauma(5);
    expect(s.trauma).toBe(1);
  });

  it("el offset queda dentro de ±MAX_OFFSET", () => {
    const s = new ScreenShake();
    s.addTrauma(1);
    for (let i = 0; i < 20; i++) {
      const o = s.update(0.016);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(MAX_OFFSET);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(MAX_OFFSET);
    }
  });

  it("el trauma decae a 0 con el tiempo", () => {
    const s = new ScreenShake();
    s.addTrauma(1);
    for (let i = 0; i < 120; i++) s.update(0.016); // ~2s
    expect(s.trauma).toBe(0);
    expect(s.update(0.016)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/client -- ScreenShake`
Expected: FAIL (no existe).

- [ ] **Step 3: Implement**

```ts
// client/src/render/ScreenShake.ts
export const MAX_OFFSET = 0.8;  // unidades de mundo de desplazamiento máximo de cámara
export const DECAY = 1.6;       // cuánto trauma se pierde por segundo

/**
 * Sistema de "trauma" (Squirrel Eiserloh): el trauma ∈ [0,1] decae linealmente y
 * el desplazamiento usa trauma² (curva suave). El offset es aleatorio por frame
 * dentro de ±MAX_OFFSET·trauma², para un shake orgánico.
 */
export class ScreenShake {
  private _trauma = 0;

  addTrauma(amount: number): void {
    this._trauma = Math.min(1, Math.max(0, this._trauma + amount));
  }

  get trauma(): number { return this._trauma; }

  update(dt: number): { x: number; y: number } {
    if (this._trauma <= 0) return { x: 0, y: 0 };
    this._trauma = Math.max(0, this._trauma - DECAY * dt);
    const mag = this._trauma * this._trauma;
    return {
      x: (Math.random() * 2 - 1) * MAX_OFFSET * mag,
      y: (Math.random() * 2 - 1) * MAX_OFFSET * mag,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/client -- ScreenShake`
Expected: PASS.

- [ ] **Step 5: Strict tsc**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add client/src/render/ScreenShake.ts client/src/render/ScreenShake.test.ts
git commit -m "feat(client): ScreenShake — sistema de trauma para sacudir la cámara"
```

---

### Task 3: cliente — integración (audio + shake + números jugosos + fanfarrias)

**Files:**
- Modify: `client/src/render/Renderer.ts` (offset de shake sobre la cámara sin drift)
- Modify: `client/src/render/DamageNumbers.ts` (pop de escala + tamaño por magnitud)
- Modify: `client/src/main.ts` (instanciar AudioEngine/ScreenShake; enganchar a eventos; tecla `M`; resume en primer gesto; aplicar shake cada frame)

**Interfaces:**
- Consumes: `AudioEngine`/`Sfx` (Task 1), `ScreenShake` (Task 2); callbacks existentes `onDamage`/`onDeath`/`onLevelUp`/`onBossKilled`; `Renderer.followTarget`; `net` con el `sessionId` local (para saber si el daño es al jugador propio); `hud.toast`.
- Produces:
  - `Renderer.followTarget(x, z, dt, shakeX?: number, shakeY?: number)` — aplica el smoothing sobre una base interna y suma el shake al final (sin drift).

- [ ] **Step 1: Renderer — offset de shake sin drift**

Leer `Renderer.followTarget`. Hoy suaviza `this.camera.position` directamente. Cambiarlo para suavizar una **base** interna (`camBaseX/Y/Z`, inicializadas al valor inicial de la cámara) y setear `camera.position = base + shake`:

```ts
// campos nuevos en Renderer:
private camBaseX = 0; private camBaseY = 30; private camBaseZ = 30;

// followTarget reescrito:
followTarget(x: number, z: number, dt: number, shakeX = 0, shakeY = 0): void {
  const K = /* la constante K actual */;
  this.camBaseX = smoothTowards(this.camBaseX, x, K, dt);
  this.camBaseY = smoothTowards(this.camBaseY, 22, K, dt);
  this.camBaseZ = smoothTowards(this.camBaseZ, z + 22, K, dt);
  this.camera.position.set(this.camBaseX + shakeX, this.camBaseY + shakeY, this.camBaseZ);
  this.camera.lookAt(x, 1, z);
}
```

(Inicializar `camBaseX/Y/Z` con los mismos valores que hoy tiene `camera.position` — leer el constructor: `set(0,30,30)`. Usar esos.)

- [ ] **Step 2: DamageNumbers — pop + tamaño por magnitud**

Modificar `spawn(worldPos, amount)`: el tamaño de fuente escala con el golpe (más grande = más satisfactorio) y hace un "pop" (escala 1.5→1 en los primeros ~140ms). Guardar por número un `bornAt` (ya existe) y aplicar `transform: scale(...)` en `update()`.

```ts
// en spawn(): tamaño por magnitud
const size = 14 + Math.min(30, Math.round(amount)) * 0.5; // 14..29px
el.style.cssText = `color:#ffd23f;font:bold ${size}px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;transform-origin:center;`;

// en update(): pop de escala en los primeros 140ms de vida
const POP_MS = 140;
const age = now - n.bornAt;
const scale = age < POP_MS ? 1.5 - 0.5 * (age / POP_MS) : 1;
n.el.style.transform = `scale(${scale})`;
```

(Aplicar el `transform` junto al `opacity` ya existente; `spawnText` puede quedar sin pop o compartir el mismo — mínimo: no romperlo.)

- [ ] **Step 3: main.ts — instanciar + resume + tecla M**

- Instanciar cerca de los otros: `const audio = new AudioEngine(); const screenShake = new ScreenShake();`
- Resume en el primer gesto (una vez):
  ```ts
  const resumeAudio = () => audio.resume();
  window.addEventListener("pointerdown", resumeAudio, { once: true });
  window.addEventListener("keydown", resumeAudio, { once: true });
  ```
- En el handler de `keydown` existente (después del focus-guard de inputs), agregar la tecla `M`:
  ```ts
  if (e.key === "m" || e.key === "M") { const muted = audio.toggleMuted(); hud.toast(muted ? "🔇 Sonido apagado" : "🔊 Sonido encendido", "#ffd23f"); return; }
  ```

- [ ] **Step 4: main.ts — enganchar audio + shake a los eventos**

En los callbacks existentes (leer el bloque actual y agregar, sin romper lo que ya hacen):

- `onDamage`: determinar si el objetivo es el jugador LOCAL (`ev.targetId === net.sessionId` — usar el getter real del NetworkClient para el sessionId local; si no existe, agregarlo mínimamente). Entonces:
  ```ts
  if (ev.dodged) { audio.play("dodge"); }
  else if (ev.targetId === net.sessionId) { audio.play("hurt"); screenShake.addTrauma(0.5); } // te pegaron
  else { audio.play("hit"); screenShake.addTrauma(0.18); }                                    // pegaste vos / a otro
  ```
  (Colocar después del feedback visual existente; no duplicar el spawn de números.)
- `onDeath`: si el que muere es un mob, `audio.play("die")`.
- `onLevelUp`: `audio.play("levelup"); screenShake.addTrauma(0.5);` (además del `hud.flashLevelUp` existente). Opcional: `damageNumbers.spawnText(selfPos, "¡NIVEL "+level+"!", "#ffd23f")` si hay una posición del jugador propio a mano.
- `onBossKilled`: `audio.play("boss"); screenShake.addTrauma(0.7);` (además del toast existente).
- Pickup: en el callback de recoger ítems del jugador propio, si existe uno claro, `audio.play("pickup")`. Si no hay un evento de pickup dirigido al jugador propio en el cliente, OMITIR (no inventar; dejar pickup sin sonido). [Ruling permitido al implementer: si no hay un hook limpio de pickup del jugador propio, saltarlo y anotarlo.]

- [ ] **Step 5: main.ts — aplicar el shake cada frame**

En el render loop, donde hoy se llama `renderer.followTarget(self.x, self.z, dt)` (o equivalente), calcular el offset y pasarlo:

```ts
const shake = screenShake.update(dt);
renderer.followTarget(self.x, self.z, dt, shake.x, shake.y);
```

(Leer el loop real: puede que `followTarget` se llame con otros nombres de variables; adaptar. `screenShake.update(dt)` debe llamarse UNA vez por frame.)

- [ ] **Step 6: Verificar tsc + suite + smoke**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Run: `npm test --workspace @aden/client`
Expected: sin errores; suite verde (los tests existentes + los de Task 1/2 no se rompen).

Smoke (dev server; WS no conecta en el sandbox pero el boot sí): el cliente bootea sin errores de consola; la tecla `M` togglea el toast de sonido. El audio/shake en vivo (con golpes reales) → pendiente-usuario.

- [ ] **Step 7: Commit**

```bash
git add client/src/render/Renderer.ts client/src/render/DamageNumbers.ts client/src/main.ts client/src/net/NetworkClient.ts
git commit -m "feat(client): game feel — audio+shake en eventos, números jugosos, tecla M"
```

---

### Task 4: verificación final + merge

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa**

Run: `npm test --workspace @aden/shared && npm test --workspace @aden/server && npm test --workspace @aden/client`
Expected: todo verde (server/shared sin cambios → siguen igual).

- [ ] **Step 2: tsc estricto en los tres workspaces**

Run: `npx tsc -p shared/tsconfig.json --noEmit && npx tsc -p server/tsconfig.json --noEmit && npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: 0 artefactos**

Run: `git status --porcelain`
Expected: limpio.

- [ ] **Step 4: Merge a master**

```bash
git checkout master
git merge --no-ff etapa-10-game-feel -m "merge: Etapa 10 — Game feel & sonido (audio procedural, screen-shake, números jugosos)"
```

- [ ] **Step 5: Actualizar el ledger SDD** con tests totales y commits.

## Self-Review (hecho al escribir el plan)

- **Cobertura de la dirección elegida (game feel + sonido):** sonido procedural en golpe/daño/muerte/level-up/boss/cast/pickup/esquive + mute (Task 1 + wiring Task 3/4), screen-shake en golpes/daño/level-up/boss (Task 2 + Task 3), números de daño jugosos con pop+tamaño (Task 3), fanfarria de level-up (Task 3). Sin cambios de server/shared/protocolo (transversal). ✓
- **Sin placeholders:** todo el código real; los pasos de wiring referencian los callbacks/loop concretos ya existentes y dejan un ruling explícito para el caso del pickup sin hook limpio. ✓
- **Consistencia de tipos:** `Sfx` (Task 1) usado en los `audio.play(...)` de Task 3; `ScreenShake.update(dt)→{x,y}` (Task 2) alimenta `Renderer.followTarget(x,z,dt,shakeX,shakeY)` (Task 3); `DamageNumbers.spawn(worldPos, amount)` firma intacta. ✓
- **Degradación:** AudioEngine no-op sin AudioContext (tests) y sin resume; ScreenShake puro sin dependencias del DOM. ✓
