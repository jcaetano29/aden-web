# Etapa 1 — Mundo 3D (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los cubos por personajes low-poly animados (KayKit, CC0): cada jugador se ve como un aventurero con animación idle/walk según el estado del servidor, orientado hacia su movimiento, con nameplate flotante y cámara que sigue al jugador propio. Movimiento interpolado suave en el render loop (corrige el bug de interpolación de la Etapa 0).

**Architecture:** Se mantiene el server autoritativo de la Etapa 0 intacto (no se toca `server/` ni `shared/`). Todo el trabajo es en `@aden/client`: se descargan modelos glTF CC0 a `client/public/models/`, se cargan una vez con `GLTFLoader`, se clonan por jugador con `SkeletonUtils`, y un `AnimationMixer` reproduce clips idle/walk seleccionados por nombre. La lógica pura (selección de clip, interpolación frame-rate-independiente, heading, asignación de modelo) se aísla en módulos testeables; el I/O WebGL se verifica con smoke test.

**Tech Stack:** TypeScript, Three.js 0.160 (`GLTFLoader`, `SkeletonUtils`, `CSS2DRenderer` de `three/examples/jsm`), Vite 5, Vitest, colyseus.js 0.15. Assets: KayKit Character Pack Adventurers 1.0 (CC0).

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md`

## Global Constraints

- No modificar `server/` ni `shared/`. Solo `client/` (+ assets en `client/public/`). Si algo parece requerir tocar el server, es señal de re-scope: reportar, no improvisar.
- ESM, TypeScript `strict: true`. Tests con Vitest; TDD en los módulos puros.
- El cliente sigue sin autoridad: solo envía `moveTo` y renderiza estado. La animación/orientación se derivan del estado sincronizado (`x/z/targetX/targetZ/moving`), no de decisiones locales de juego.
- Assets: **KayKit Character Pack Adventurers 1.0**, licencia **CC0** (sin atribución obligatoria). Modelos GLB autocontenidos desde el repo oficial de GitHub:
  `https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/<Nombre>.glb`
  Nombres: `Knight` (3.66 MB), `Mage` (3.59 MB), `Barbarian` (3.61 MB), `Rogue` (3.62 MB).
- Los 4 modelos comparten rig y nombres de animación (mismo pack), por lo que un único manejo de clips sirve para todos.
- Interpolación en el **render loop** por frame (no en callbacks de red) — corrige el carry-forward de la Etapa 0 documentado para `EntityViews`.
- Import de addons de Three.js vía `three/examples/jsm/...` (incluidos en `@types/three`).
- Entorno Windows, Git Bash disponible vía Bash tool; `curl` disponible para descargas.

---

## File Structure

```
client/public/models/                (NUEVO — assets servidos por Vite en /models/)
  Knight.glb  Mage.glb  Barbarian.glb  Rogue.glb
  LICENSES.md                         atribución/licencia CC0 de los assets

client/src/assets/manifest.ts         (NUEVO) lista de modelos + pickModelForSession (puro)
client/src/assets/manifest.test.ts    (NUEVO)

client/src/render/animation.ts        (NUEVO) selectClip (puro)
client/src/render/animation.test.ts   (NUEVO)
client/src/render/motion.ts           (NUEVO) smoothTowards + headingFromDelta (puros)
client/src/render/motion.test.ts      (NUEVO)

client/src/render/CharacterFactory.ts (NUEVO) carga GLBs, clona skinned meshes
client/src/render/CharacterView.ts    (NUEVO) mesh + AnimationMixer + estado por jugador
client/src/render/EntityViews.ts      (MODIFICAR) usa CharacterView en vez de cubos
client/src/render/Nameplates.ts       (NUEVO) CSS2DRenderer + etiqueta por jugador
client/src/render/Renderer.ts         (MODIFICAR) integra CSS2DRenderer + cámara follow
client/src/main.ts                    (MODIFICAR) precarga assets, wiring, loop con dt
client/src/net/NetworkClient.ts       (MODIFICAR) exponer targetX/targetZ/moving en callbacks
```

**Decomposición:** la lógica pura (`manifest`, `animation`, `motion`) se testea con Vitest sin WebGL. El I/O (carga glTF, mixer, CSS2D) vive en `CharacterFactory`/`CharacterView`/`Nameplates` y se verifica con smoke test. `EntityViews` pasa de crear cubos a orquestar `CharacterView`s.

---

### Task 1: Descarga de assets KayKit + manifest + licencias

**Files:**
- Create (binarios): `client/public/models/Knight.glb`, `Mage.glb`, `Barbarian.glb`, `Rogue.glb`
- Create: `client/public/models/LICENSES.md`
- Create: `client/src/assets/manifest.ts`
- Test: `client/src/assets/manifest.test.ts`

**Interfaces:**
- Produces:
  - `MODEL_NAMES: readonly string[]` — `["Knight","Mage","Barbarian","Rogue"]`
  - `modelUrl(name: string): string` — devuelve `/models/<name>.glb`
  - `pickModelForSession(sessionId: string, models: readonly string[]): string` — hash determinístico → un modelo de la lista.

- [ ] **Step 1: Descargar los 4 GLB a `client/public/models/`**

Run (desde la raíz del repo):
```bash
mkdir -p client/public/models
BASE="https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf"
for m in Knight Mage Barbarian Rogue; do
  curl -sfL "$BASE/$m.glb" -o "client/public/models/$m.glb" || { echo "FALLO $m"; exit 1; }
done
ls -l client/public/models
```
Expected: 4 archivos `.glb`, cada uno ~3.6 MB (>3.000.000 bytes). Si alguno pesa <100 KB, la descarga falló (probablemente HTML de error) — abortar y reportar.

- [ ] **Step 2: Verificar que son glTF binarios válidos (magic `glTF`)**

Run:
```bash
for m in Knight Mage Barbarian Rogue; do printf "%s: " "$m"; head -c 4 "client/public/models/$m.glb"; echo; done
```
Expected: cada línea imprime `glTF` (los primeros 4 bytes del formato GLB). Si no, el archivo no es un GLB válido.

- [ ] **Step 3: Crear `client/public/models/LICENSES.md`**

```markdown
# Licencias de assets 3D

## Personajes: KayKit Character Pack — Adventurers 1.0
- Autor: Kay Lousberg (KayKit)
- Licencia: CC0 1.0 (dominio público, sin atribución obligatoria)
- Fuente: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Archivos: Knight.glb, Mage.glb, Barbarian.glb, Rogue.glb
- Uso: modelos low-poly riggeados y animados (25+ clips), formato glTF binario.

CC0 no exige atribución; se incluye por buena práctica y trazabilidad.
```

- [ ] **Step 4: Escribir el test que falla (`client/src/assets/manifest.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { MODEL_NAMES, modelUrl, pickModelForSession } from "./manifest.js";

describe("modelUrl", () => {
  it("resuelve la ruta pública del GLB", () => {
    expect(modelUrl("Knight")).toBe("/models/Knight.glb");
  });
});

describe("pickModelForSession", () => {
  it("es determinístico para el mismo sessionId", () => {
    const a = pickModelForSession("abc123", MODEL_NAMES);
    const b = pickModelForSession("abc123", MODEL_NAMES);
    expect(a).toBe(b);
  });

  it("siempre devuelve un modelo de la lista", () => {
    for (const id of ["x", "player-1", "ZZZ", "9"]) {
      expect(MODEL_NAMES).toContain(pickModelForSession(id, MODEL_NAMES));
    }
  });

  it("distribuye entre los modelos disponibles (no siempre el mismo)", () => {
    const seen = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => pickModelForSession(id, MODEL_NAMES)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 5: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/client`
Expected: FAIL — no existe `./manifest.js`.

- [ ] **Step 6: Implementar `client/src/assets/manifest.ts`**

```ts
export const MODEL_NAMES = ["Knight", "Mage", "Barbarian", "Rogue"] as const;

export function modelUrl(name: string): string {
  return `/models/${name}.glb`;
}

export function pickModelForSession(sessionId: string, models: readonly string[]): string {
  if (models.length === 0) throw new Error("pickModelForSession: lista de modelos vacía");
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return models[h % models.length];
}
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/client`
Expected: PASS (manifest + mapping.test previo siguen en verde).

- [ ] **Step 8: Commit**

```bash
git add client/public/models client/src/assets
git commit -m "feat(client): assets KayKit CC0 + manifest de modelos con test"
```

---

### Task 2: Selección de clip de animación (puro, TDD)

**Files:**
- Create: `client/src/render/animation.ts`
- Test: `client/src/render/animation.test.ts`

**Interfaces:**
- Produces: `selectClip(available: string[], desired: "idle" | "walk"): string | null` — elige un nombre de clip real a partir del estado deseado, por coincidencia case-insensitive con fallbacks; `null` si no hay clips.

- [ ] **Step 1: Escribir el test que falla (`client/src/render/animation.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { selectClip } from "./animation.js";

const CLIPS = ["Idle", "Walking_A", "Running_A", "Attack_Melee"];

describe("selectClip", () => {
  it("elige el clip de caminar por 'walk'", () => {
    expect(selectClip(CLIPS, "walk")).toBe("Walking_A");
  });

  it("elige el clip idle por 'idle'", () => {
    expect(selectClip(CLIPS, "idle")).toBe("Idle");
  });

  it("cae a 'run' si no hay 'walk'", () => {
    expect(selectClip(["Idle", "Running_A"], "walk")).toBe("Running_A");
  });

  it("es case-insensitive", () => {
    expect(selectClip(["idle_loop", "walk_loop"], "walk")).toBe("walk_loop");
  });

  it("devuelve null si no hay clips", () => {
    expect(selectClip([], "idle")).toBeNull();
  });

  it("cae al primer clip si no matchea nada", () => {
    expect(selectClip(["Foo", "Bar"], "walk")).toBe("Foo");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/client`
Expected: FAIL — no existe `./animation.js`.

- [ ] **Step 3: Implementar `client/src/render/animation.ts`**

```ts
export function selectClip(available: string[], desired: "idle" | "walk"): string | null {
  if (available.length === 0) return null;
  const lower = available.map((n) => n.toLowerCase());
  const findBy = (subs: string[]): string | null => {
    for (const sub of subs) {
      const i = lower.findIndex((n) => n.includes(sub));
      if (i !== -1) return available[i];
    }
    return null;
  };
  if (desired === "walk") return findBy(["walk", "run", "jog"]) ?? available[0];
  return findBy(["idle", "wait", "stand"]) ?? available[0];
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/render/animation.ts client/src/render/animation.test.ts
git commit -m "feat(client): selectClip para mapear estado→animación con test"
```

---

### Task 3: Interpolación frame-rate-independiente + heading (puro, TDD)

**Files:**
- Create: `client/src/render/motion.ts`
- Test: `client/src/render/motion.test.ts`

**Interfaces:**
- Produces:
  - `smoothTowards(current: number, target: number, k: number, dt: number): number` — acerca `current` a `target` con factor exponencial `1 - e^(-k·dt)` (independiente del framerate); nunca sobrepasa.
  - `headingFromDelta(dx: number, dz: number): number | null` — yaw (radianes) que mira en la dirección `(dx,dz)` con `atan2(dx, dz)`; `null` si el delta es cero.

- [ ] **Step 1: Escribir el test que falla (`client/src/render/motion.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { smoothTowards, headingFromDelta } from "./motion.js";

describe("smoothTowards", () => {
  it("con dt=0 no cambia", () => {
    expect(smoothTowards(0, 10, 10, 0)).toBe(0);
  });

  it("se acerca al target sin sobrepasar", () => {
    const next = smoothTowards(0, 10, 10, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it("converge al target tras muchos pasos", () => {
    let x = 0;
    for (let i = 0; i < 600; i++) x = smoothTowards(x, 10, 10, 1 / 60);
    expect(x).toBeCloseTo(10, 3);
  });
});

describe("headingFromDelta", () => {
  it("devuelve null sin movimiento", () => {
    expect(headingFromDelta(0, 0)).toBeNull();
  });

  it("mira a +Z como 0 rad", () => {
    expect(headingFromDelta(0, 1)).toBeCloseTo(0);
  });

  it("mira a +X como PI/2", () => {
    expect(headingFromDelta(1, 0)).toBeCloseTo(Math.PI / 2);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/client`
Expected: FAIL — no existe `./motion.js`.

- [ ] **Step 3: Implementar `client/src/render/motion.ts`**

```ts
export function smoothTowards(current: number, target: number, k: number, dt: number): number {
  if (dt <= 0) return current;
  const alpha = 1 - Math.exp(-k * dt); // ∈ [0,1)
  return current + (target - current) * alpha;
}

export function headingFromDelta(dx: number, dz: number): number | null {
  if (dx === 0 && dz === 0) return null;
  return Math.atan2(dx, dz);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/render/motion.ts client/src/render/motion.test.ts
git commit -m "feat(client): motion helpers (smoothTowards, headingFromDelta) con tests"
```

---

### Task 4: Carga/clonado de personajes + animación (integración)

**Files:**
- Create: `client/src/render/CharacterFactory.ts`
- Create: `client/src/render/CharacterView.ts`
- Modify: `client/src/render/EntityViews.ts`
- Modify: `client/src/net/NetworkClient.ts`
- Modify: `client/src/main.ts`

**Interfaces:**
- Consumes: `selectClip` (Task 2), `smoothTowards`/`headingFromDelta` (Task 3), `MODEL_NAMES`/`modelUrl`/`pickModelForSession` (Task 1).
- Produces:
  - `class CharacterFactory` con `async preload(names: readonly string[]): Promise<void>` y `create(modelName: string): { root: THREE.Object3D; mixer: THREE.AnimationMixer; clipNames: string[]; play(name: string): void }`.
  - `class CharacterView` que envuelve un personaje y expone `setServerState(x,z,targetX,targetZ,moving)`, `update(dt)` (interpola posición, orienta, avanza mixer y cambia idle/walk), y `dispose()`.
  - `EntityViews` reescrito: `add(id, isSelf, modelName)`, `update(id, state)`, `remove(id)`, `updateAll(dt)`, y acceso a la posición del self para la cámara.

- [ ] **Step 1: Implementar `client/src/render/CharacterFactory.ts`**

```ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelUrl } from "../assets/manifest.js";

interface LoadedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export interface Character {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clipNames: string[];
  play(name: string): void;
}

export class CharacterFactory {
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, LoadedModel>();

  async preload(names: readonly string[]): Promise<void> {
    await Promise.all(
      names.map(async (name) => {
        const gltf = await this.loader.loadAsync(modelUrl(name));
        this.loaded.set(name, { scene: gltf.scene, animations: gltf.animations });
      }),
    );
  }

  create(modelName: string): Character {
    const model = this.loaded.get(modelName);
    if (!model) throw new Error(`CharacterFactory: modelo no precargado: ${modelName}`);
    const root = cloneSkeleton(model.scene);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of model.animations) {
      actions.set(clip.name, mixer.clipAction(clip));
    }
    let current: THREE.AnimationAction | null = null;
    return {
      root,
      mixer,
      clipNames: model.animations.map((c) => c.name),
      play(name: string) {
        const next = actions.get(name);
        if (!next || next === current) return;
        next.reset().fadeIn(0.2).play();
        if (current) current.fadeOut(0.2);
        current = next;
      },
    };
  }
}
```

- [ ] **Step 2: Implementar `client/src/render/CharacterView.ts`**

```ts
import * as THREE from "three";
import type { Character } from "./CharacterFactory.js";
import { selectClip } from "./animation.js";
import { smoothTowards, headingFromDelta } from "./motion.js";

const SMOOTH_K = 12; // rapidez de convergencia de la interpolación
const TURN_K = 12;

export interface ServerState {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export class CharacterView {
  private state: ServerState = { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false };
  private desiredYaw: number | null = null;
  private lastMoving: boolean | null = null;
  private readonly idleClip: string | null;
  private readonly walkClip: string | null;

  constructor(private readonly character: Character) {
    this.idleClip = selectClip(character.clipNames, "idle");
    this.walkClip = selectClip(character.clipNames, "walk");
  }

  get object(): THREE.Object3D {
    return this.character.root;
  }

  get position(): { x: number; z: number } {
    return { x: this.character.root.position.x, z: this.character.root.position.z };
  }

  /** Coloca el mesh en la posición inicial exacta (sin interpolar). */
  snapTo(x: number, z: number) {
    this.character.root.position.set(x, 0, z);
    this.state.x = x;
    this.state.z = z;
  }

  setServerState(s: ServerState) {
    this.state = s;
    const heading = headingFromDelta(s.targetX - s.x, s.targetZ - s.z);
    if (heading !== null && s.moving) this.desiredYaw = heading;
  }

  update(dt: number) {
    const root = this.character.root;
    // Interpolación de posición en el render loop (frame-rate independiente).
    root.position.x = smoothTowards(root.position.x, this.state.x, SMOOTH_K, dt);
    root.position.z = smoothTowards(root.position.z, this.state.z, SMOOTH_K, dt);

    // Orientación hacia la dirección de movimiento.
    if (this.desiredYaw !== null) {
      root.rotation.y = smoothTowards(root.rotation.y, this.desiredYaw, TURN_K, dt);
    }

    // Animación según moving.
    if (this.state.moving !== this.lastMoving) {
      const clip = this.state.moving ? this.walkClip : this.idleClip;
      if (clip) this.character.play(clip);
      this.lastMoving = this.state.moving;
    }

    this.character.mixer.update(dt);
  }
}
```

Nota de calibración (documentar en el reporte): si los modelos KayKit miran hacia -Z por defecto, sumar `Math.PI` al yaw en `setServerState` (o rotar el root al crearlo). Ajustar durante el smoke test para que el personaje camine "de frente".

- [ ] **Step 3: Reescribir `client/src/render/EntityViews.ts`**

```ts
import * as THREE from "three";
import { CharacterFactory } from "./CharacterFactory.js";
import { CharacterView, type ServerState } from "./CharacterView.js";

export class EntityViews {
  private readonly views = new Map<string, CharacterView>();
  private selfId: string | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly factory: CharacterFactory,
  ) {}

  add(id: string, isSelf: boolean, modelName: string, x: number, z: number) {
    const view = new CharacterView(this.factory.create(modelName));
    view.snapTo(x, z);
    this.scene.add(view.object);
    this.views.set(id, view);
    if (isSelf) this.selfId = id;
  }

  update(id: string, state: ServerState) {
    this.views.get(id)?.setServerState(state);
  }

  remove(id: string) {
    const view = this.views.get(id);
    if (view) {
      this.scene.remove(view.object);
      this.views.delete(id);
    }
  }

  updateAll(dt: number) {
    this.views.forEach((v) => v.update(dt));
  }

  selfPosition(): { x: number; z: number } | null {
    if (!this.selfId) return null;
    return this.views.get(this.selfId)?.position ?? null;
  }

  entries(): Array<[string, CharacterView]> {
    return [...this.views.entries()];
  }
}
```

- [ ] **Step 4: Actualizar `client/src/net/NetworkClient.ts` para pasar el estado completo**

El callback `onChange` debe entregar `{x,z,targetX,targetZ,moving}` y `onAdd` debe entregar la posición inicial y el modelo. Ajustar el tipo `RoomCallbacks`:

```ts
import { Client, Room } from "colyseus.js";
import { MessageType, type MoveToMessage } from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface PlayerSnapshot {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name });
    const selfId = this.room.sessionId;

    const snap = (p: any): PlayerSnapshot => ({
      x: p.x, z: p.z, targetX: p.targetX, targetZ: p.targetZ, moving: p.moving,
    });

    this.room.state.players.onAdd((player: any, id: string) => {
      cb.onAdd(id, id === selfId, snap(player));
      player.onChange(() => cb.onChange(id, snap(player)));
    });
    this.room.state.players.onRemove((_player: any, id: string) => cb.onRemove(id));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }

  get sessionId(): string {
    return this.room.sessionId;
  }
}
```

- [ ] **Step 5: Actualizar `client/src/main.ts` (precarga + wiring + loop con dt + asignación de modelo)**

```ts
import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { MODEL_NAMES, pickModelForSession } from "./assets/manifest.js";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);

  const factory = new CharacterFactory();
  await factory.preload(MODEL_NAMES);

  const views = new EntityViews(renderer.scene, factory);
  const net = new NetworkClient();

  const name = prompt("Nombre de tu personaje:") ?? "Adventurer";

  await net.connect(name, {
    onAdd: (id, isSelf, snap) =>
      views.add(id, isSelf, pickModelForSession(id, MODEL_NAMES), snap.x, snap.z),
    onChange: (id, snap) => views.update(id, snap),
    onRemove: (id) => views.remove(id),
  });

  const input = new InputController(renderer, (msg) => net.sendMove(msg));
  input.attach(document.body);

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    const self = views.selfPosition();
    if (self) renderer.followTarget(self.x, self.z);
    renderer.render();
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
```

(Nota: `renderer.followTarget` se agrega en la Task 5; hasta entonces, este `main.ts` no compila. Implementar Task 4 y Task 5 juntas antes de smoke-testear, o stubear `followTarget` en Renderer. Para respetar el orden, en Task 4 agregar un stub temporal `followTarget(_x:number,_z:number){}` en Renderer y completarlo en Task 5.)

- [ ] **Step 6: Agregar stub temporal `followTarget` en `Renderer.ts`**

Agregar el método (se completa en Task 5):
```ts
followTarget(_x: number, _z: number): void { /* completado en Task 5 */ }
```

- [ ] **Step 7: Typecheck + build**

Run:
```bash
npx tsc --noEmit -p client/tsconfig.json
npm run build --workspace @aden/client
```
Expected: sin errores de tipo; build OK. (Los tests unitarios de Tasks 1–3 siguen en verde.)

- [ ] **Step 8: Smoke test (un navegador)**

Levantar server (`npm run start --workspace @aden/server`) y cliente (`npm run dev --workspace @aden/client`), abrir la URL, entrar con un nombre. Verificar:
- Aparece un personaje low-poly (no un cubo) parado en idle.
- Al hacer click en el suelo, camina hacia el punto con animación de caminar y orientado hacia el movimiento; al llegar, vuelve a idle.
- Consola sin errores; los GLB cargan (Network 200 en `/models/*.glb`).

Calibrar el offset de yaw si el personaje camina de espaldas (documentar el valor usado).

- [ ] **Step 9: Commit**

```bash
git add client/src
git commit -m "feat(client): personajes glTF animados con interpolacion y orientacion"
```

---

### Task 5: Nameplates + cámara follow + indicador de self (integración)

**Files:**
- Create: `client/src/render/Nameplates.ts`
- Modify: `client/src/render/Renderer.ts`
- Modify: `client/src/render/EntityViews.ts`
- Modify: `client/src/render/CharacterView.ts`
- Modify: `client/src/net/NetworkClient.ts`
- Modify: `client/src/main.ts`

**Interfaces:**
- Consumes: `EntityViews`/`CharacterView` (Task 4).
- Produces:
  - `class Nameplates` (usa `CSS2DRenderer`): `add(id, name, object)`, `remove(id)`, `render(camera)`.
  - `Renderer.followTarget(x, z)` real: cámara en tercera persona que sigue al self con offset fijo.
  - Indicador visual del self (anillo/disco bajo los pies).
  - El nombre del jugador se propaga desde el server: agregar `name` al `PlayerSnapshot`.

- [ ] **Step 1: Exponer `CSS2DRenderer` en `Renderer.ts` y `followTarget` real**

En `Renderer.ts`: importar `CSS2DRenderer` de `three/examples/jsm/renderers/CSS2DRenderer.js`, crear su instancia con el mismo tamaño que el WebGL, posicionar su `domElement` con `position:absolute; top:0; pointer-events:none;` sobre el canvas, y actualizarlo en resize. Reemplazar el stub por:

```ts
followTarget(x: number, z: number): void {
  // Cámara isométrica-ish siguiendo al jugador con offset fijo.
  const offset = new THREE.Vector3(0, 22, 22);
  this.camera.position.set(x + offset.x, offset.y, z + offset.z);
  this.camera.lookAt(x, 1, z);
}
```

Exponer `get css2d(): CSS2DRenderer` y renderizarlo en `render()` (o dejar que `Nameplates.render(camera)` lo haga). Documentar el enfoque elegido en el reporte.

- [ ] **Step 2: Implementar `client/src/render/Nameplates.ts`**

```ts
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export class Nameplates {
  private readonly labels = new Map<string, CSS2DObject>();

  add(id: string, name: string, parent: THREE.Object3D) {
    const div = document.createElement("div");
    div.textContent = name;
    div.style.cssText =
      "color:#fff;font:12px sans-serif;text-shadow:0 0 3px #000;pointer-events:none;white-space:nowrap;";
    const label = new CSS2DObject(div);
    label.position.set(0, 2.4, 0); // sobre la cabeza
    parent.add(label);
    this.labels.set(id, label);
  }

  remove(id: string) {
    const label = this.labels.get(id);
    if (label) {
      label.parent?.remove(label);
      this.labels.delete(id);
    }
  }
}
```

- [ ] **Step 3: Indicador del self en `CharacterView`**

Agregar un método para adjuntar un anillo bajo los pies del self:
```ts
addSelfRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.8, 24),
    new THREE.MeshBasicMaterial({ color: 0x4fa3ff, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  this.character.root.add(ring);
}
```

- [ ] **Step 4: Propagar `name` por la red**

En `NetworkClient.ts`, agregar `name: string` a `PlayerSnapshot` y a `snap()` (`name: p.name`). En `EntityViews.add`, aceptar `name` y crear el nameplate; en `remove`, quitarlo. Cablear `Nameplates` dentro de `EntityViews` (o pasarlo como dependencia) y llamar `addSelfRing()` cuando `isSelf`.

- [ ] **Step 5: Wiring en `main.ts`**

Instanciar `Nameplates`, pasarlo a `EntityViews`, y en el loop llamar al render de CSS2D (`renderer.css2d.render(renderer.scene, renderer.camera)`), después de `renderer.render()`. `onAdd` ahora pasa `snap.name`.

- [ ] **Step 6: Typecheck + build**

Run:
```bash
npx tsc --noEmit -p client/tsconfig.json
npm run build --workspace @aden/client
```
Expected: sin errores; build OK.

- [ ] **Step 7: Smoke test (un navegador)**

Verificar: el personaje propio tiene un anillo azul bajo los pies; su nombre flota sobre la cabeza; la cámara lo sigue al caminar. Consola limpia.

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "feat(client): nameplates CSS2D, camara follow e indicador de self"
```

---

### Task 6: Verificación E2E de dos clientes (controller)

**Files:** ninguno (verificación manual del controlador).

- [ ] **Step 1: Levantar server + cliente**

```bash
npm run start --workspace @aden/server   # ventana 1
npm run dev --workspace @aden/client     # ventana 2
```

- [ ] **Step 2: Abrir dos navegadores con nombres distintos**

Verificar:
- Cada jugador ve a ambos personajes (modelos posiblemente distintos por hash de sessionId), cada uno con su nameplate.
- Cuando un jugador camina en una pestaña, en la otra pestaña ese personaje se mueve con animación de caminar, orientado, e interpola suave hasta la posición final (sin quedar corto — el bug de la Etapa 0 está corregido).
- Al llegar, vuelve a idle en ambas vistas.

- [ ] **Step 3: Registrar el resultado**

Documentar PASS/FAIL de cada punto. Si algo falla, entra al fix loop de la tarea correspondiente.

---

## Self-Review (cobertura vs spec)

- **Modelos glTF low-poly CC0 (spec §3, §4 Etapa 1):** Task 1 (descarga KayKit + licencias + manifest).
- **Click-to-move con animaciones idle/walk (spec Etapa 1):** Tasks 2–4 (selectClip + CharacterView + mixer, dirigido por `moving` del server).
- **Múltiples jugadores visibles con nameplates (spec Etapa 1):** Tasks 4–5 (EntityViews clona por jugador; Nameplates CSS2D).
- **Interpolación corregida (carry-forward Etapa 0):** Task 3 (`smoothTowards`) aplicado en el render loop en `CharacterView.update` (Task 4).
- **Orientación hacia el movimiento:** Task 3 (`headingFromDelta`) + Task 4.
- **Cámara que sigue al jugador:** Task 5 (`followTarget`).
- **Server intacto (constraint):** solo se modifica `client/`; `server/` y `shared/` no se tocan.
- **Fuera de alcance (etapas futuras):** combate/mobs (E2), EXP/loot/persistencia (E3), pueblo/HUD/deploy (E4), equipar armas KayKit (los assets de armas existen pero se difieren). No se implementan aquí.

**Placeholder scan:** sin TBD/TODO; todo el código de cada step es real. La única dependencia de orden explícita (Renderer.followTarget stub en Task 4 → real en Task 5) está documentada en Task 4 Step 6.
**Type consistency:** `PlayerSnapshot` (NetworkClient) evoluciona en Task 5 agregando `name`; `ServerState` de CharacterView coincide con los campos del snapshot (x/z/targetX/targetZ/moving); `Character`/`CharacterView`/`EntityViews` encadenan los mismos tipos entre Tasks 4–5.
