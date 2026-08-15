# Etapa 0 — Esqueleto de Red (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar un monorepo con un servidor Colyseus autoritativo donde un jugador (cubo) se mueve con click-to-move y su posición se sincroniza en tiempo real entre dos navegadores.

**Architecture:** Monorepo con tres paquetes: `shared` (tipos/protocolo/fórmulas puras), `server` (servidor Colyseus con game loop autoritativo y sistemas testeables), `client` (Three.js + Vite que renderiza el estado y envía inputs). El servidor es la única autoridad: valida movimiento y sincroniza estado; el cliente solo dibuja y manda intención.

**Tech Stack:** TypeScript 5, Colyseus 0.15 (`colyseus`, `@colyseus/schema`, `@colyseus/testing`, `colyseus.js`), Three.js 0.160, Vite 5, Vitest, Node 18+.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md`

## Global Constraints

- Node 18+ ; ESM en todos los paquetes (`"type": "module"`).
- TypeScript `strict: true` en todos los paquetes.
- El servidor es autoritativo: el cliente **nunca** decide posición final; solo envía `moveTo`.
- Tick del servidor: **15 Hz** (`TICK_RATE = 15`), constante única en `shared`.
- Velocidad de movimiento: `MOVE_SPEED = 5` unidades/seg, constante única en `shared`.
- Toda fórmula/constante compartida vive en `shared` e importada por `server` y `client` (una sola fuente de verdad; DRY).
- Tests con Vitest; cada task termina con test en verde y commit.
- Puerto del servidor por env (`PORT`, default 2567); host del server en el cliente por env (`VITE_SERVER_URL`, default `ws://localhost:2567`). Nada hardcodeado.

---

## File Structure

```
package.json                 Root, npm workspaces: shared, server, client
tsconfig.base.json           Config TS compartida (strict, ESM)
.gitignore                   (ya existe)

shared/
  package.json               name @aden/shared
  tsconfig.json
  src/index.ts               re-exporta protocol, constants, math
  src/constants.ts           TICK_RATE, MOVE_SPEED, MAP_BOUNDS
  src/protocol.ts            tipos de mensajes cliente↔servidor
  src/math.ts                distance2D, stepTowards, clampToBounds
  src/math.test.ts           tests de las fórmulas puras

server/
  package.json               name @aden/server
  tsconfig.json
  src/index.ts               bootstrap del servidor Colyseus
  src/state/PlayerState.ts   Schema Colyseus del jugador
  src/state/GameState.ts     Schema raíz (MapSchema<PlayerState>)
  src/systems/MovementSystem.ts       lógica pura de avance por tick
  src/systems/MovementSystem.test.ts
  src/rooms/GameRoom.ts       sala: onJoin/onMessage/tick
  src/rooms/GameRoom.test.ts  test de integración con @colyseus/testing

client/
  package.json               name @aden/client
  tsconfig.json
  index.html
  vite.config.ts
  src/main.ts                 entrypoint: arma render + red + input
  src/net/NetworkClient.ts    conexión Colyseus, envío de moveTo
  src/render/Renderer.ts      escena Three.js, cámara, plano de suelo
  src/render/EntityViews.ts   mapea players del estado → cubos 3D
  src/input/mapping.ts        funciones puras input→mensaje
  src/input/mapping.test.ts
  src/input/InputController.ts raycast click→suelo→moveTo
```

**Nota de decomposición:** cada archivo tiene una responsabilidad única. La lógica testeable (`math`, `MovementSystem`, `mapping`) está separada del I/O (WebGL, sockets) para poder testear sin navegador ni red real.

---

### Task 1: Monorepo + paquete `shared` con fórmulas puras

**Files:**
- Create: `package.json`, `tsconfig.base.json`
- Create: `shared/package.json`, `shared/tsconfig.json`
- Create: `shared/src/constants.ts`, `shared/src/protocol.ts`, `shared/src/math.ts`, `shared/src/index.ts`
- Test: `shared/src/math.test.ts`

**Interfaces:**
- Produces:
  - `TICK_RATE: number`, `MOVE_SPEED: number`, `MAP_BOUNDS: { minX:number; maxX:number; minZ:number; maxZ:number }`
  - `MessageType = { MoveTo: "moveTo" }` y `interface MoveToMessage { x:number; z:number }`
  - `distance2D(ax:number, az:number, bx:number, bz:number): number`
  - `clampToBounds(x:number, z:number, b:typeof MAP_BOUNDS): { x:number; z:number }`
  - `stepTowards(cx:number, cz:number, tx:number, tz:number, maxDist:number): { x:number; z:number; arrived:boolean }`

- [ ] **Step 1: Crear el root `package.json` con workspaces**

```json
{
  "name": "aden-web",
  "private": true,
  "type": "module",
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "dev": "npm run dev --workspace @aden/server & npm run dev --workspace @aden/client"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

- [ ] **Step 3: Crear `shared/package.json` y `shared/tsconfig.json`**

`shared/package.json`:
```json
{
  "name": "@aden/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  }
}
```

`shared/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 4: Escribir el test que falla (`shared/src/math.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { distance2D, stepTowards, clampToBounds } from "./math.js";
import { MAP_BOUNDS } from "./constants.js";

describe("distance2D", () => {
  it("calcula distancia euclídea en el plano XZ", () => {
    expect(distance2D(0, 0, 3, 4)).toBe(5);
  });
});

describe("stepTowards", () => {
  it("avanza maxDist hacia el objetivo cuando está lejos", () => {
    const r = stepTowards(0, 0, 10, 0, 2);
    expect(r.x).toBeCloseTo(2);
    expect(r.z).toBeCloseTo(0);
    expect(r.arrived).toBe(false);
  });

  it("llega exacto y marca arrived si maxDist supera la distancia restante", () => {
    const r = stepTowards(0, 0, 1, 0, 5);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
    expect(r.arrived).toBe(true);
  });
});

describe("clampToBounds", () => {
  it("recorta la posición dentro de los límites del mapa", () => {
    const r = clampToBounds(9999, -9999, MAP_BOUNDS);
    expect(r.x).toBe(MAP_BOUNDS.maxX);
    expect(r.z).toBe(MAP_BOUNDS.minZ);
  });
});
```

- [ ] **Step 5: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/shared`
Expected: FAIL — no existen `./math.js` ni `./constants.js`.

- [ ] **Step 6: Implementar `shared/src/constants.ts`**

```ts
export const TICK_RATE = 15; // Hz
export const MOVE_SPEED = 5; // unidades por segundo

export const MAP_BOUNDS = {
  minX: -50,
  maxX: 50,
  minZ: -50,
  maxZ: 50,
} as const;
```

- [ ] **Step 7: Implementar `shared/src/protocol.ts`**

```ts
export const MessageType = {
  MoveTo: "moveTo",
} as const;

export interface MoveToMessage {
  x: number;
  z: number;
}
```

- [ ] **Step 8: Implementar `shared/src/math.ts`**

```ts
export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

export function clampToBounds(
  x: number,
  z: number,
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
): { x: number; z: number } {
  return {
    x: Math.min(b.maxX, Math.max(b.minX, x)),
    z: Math.min(b.maxZ, Math.max(b.minZ, z)),
  };
}

export function stepTowards(
  cx: number,
  cz: number,
  tx: number,
  tz: number,
  maxDist: number,
): { x: number; z: number; arrived: boolean } {
  const dist = distance2D(cx, cz, tx, tz);
  if (dist <= maxDist || dist === 0) {
    return { x: tx, z: tz, arrived: true };
  }
  const ratio = maxDist / dist;
  return { x: cx + (tx - cx) * ratio, z: cz + (tz - cz) * ratio, arrived: false };
}
```

- [ ] **Step 9: Implementar `shared/src/index.ts`**

```ts
export * from "./constants.js";
export * from "./protocol.js";
export * from "./math.js";
```

- [ ] **Step 10: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/shared`
Expected: PASS (los 4 tests en verde).

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.base.json shared/
git commit -m "feat(shared): monorepo + protocolo, constantes y fórmulas de movimiento"
```

---

### Task 2: Sistema de movimiento autoritativo (lógica pura del servidor)

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`
- Create: `server/src/systems/MovementSystem.ts`
- Test: `server/src/systems/MovementSystem.test.ts`

**Interfaces:**
- Consumes: `stepTowards`, `MOVE_SPEED`, `TICK_RATE` de `@aden/shared`.
- Produces:
  - `interface Movable { x:number; z:number; targetX:number; targetZ:number; moving:boolean }`
  - `advanceMovable(m: Movable, dtSeconds: number, speed?: number): void` — muta `m` avanzando hacia el target; al llegar pone `moving=false`.

- [ ] **Step 1: Crear `server/package.json` y `server/tsconfig.json`**

`server/package.json`:
```json
{
  "name": "@aden/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@aden/shared": "*",
    "@colyseus/schema": "^2.0.0",
    "colyseus": "^0.15.0"
  },
  "devDependencies": {
    "@colyseus/testing": "^0.15.0",
    "tsx": "^4.7.0"
  }
}
```

`server/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

Luego instalar dependencias del workspace:
Run: `npm install`

- [ ] **Step 2: Escribir el test que falla (`server/src/systems/MovementSystem.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { advanceMovable, type Movable } from "./MovementSystem.js";
import { MOVE_SPEED } from "@aden/shared";

function makeMovable(over: Partial<Movable> = {}): Movable {
  return { x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, ...over };
}

describe("advanceMovable", () => {
  it("avanza MOVE_SPEED*dt hacia el target en 1 segundo", () => {
    const m = makeMovable({ targetX: 100, moving: true });
    advanceMovable(m, 1);
    expect(m.x).toBeCloseTo(MOVE_SPEED);
    expect(m.moving).toBe(true);
  });

  it("no se pasa del target y apaga moving al llegar", () => {
    const m = makeMovable({ targetX: 1, moving: true });
    advanceMovable(m, 1); // avanzaría 5, pero target está a 1
    expect(m.x).toBeCloseTo(1);
    expect(m.moving).toBe(false);
  });

  it("no hace nada si moving es false", () => {
    const m = makeMovable({ targetX: 100, moving: false });
    advanceMovable(m, 1);
    expect(m.x).toBe(0);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/server`
Expected: FAIL — no existe `./MovementSystem.js`.

- [ ] **Step 4: Implementar `server/src/systems/MovementSystem.ts`**

```ts
import { stepTowards, MOVE_SPEED } from "@aden/shared";

export interface Movable {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export function advanceMovable(m: Movable, dtSeconds: number, speed = MOVE_SPEED): void {
  if (!m.moving) return;
  const maxDist = speed * dtSeconds;
  const next = stepTowards(m.x, m.z, m.targetX, m.targetZ, maxDist);
  m.x = next.x;
  m.z = next.z;
  if (next.arrived) m.moving = false;
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/server`
Expected: PASS (3 tests en verde).

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): MovementSystem autoritativo con tests"
```

---

### Task 3: Estado Colyseus + GameRoom autoritativa

**Files:**
- Create: `server/src/state/PlayerState.ts`, `server/src/state/GameState.ts`
- Create: `server/src/rooms/GameRoom.ts`
- Create: `server/src/index.ts`
- Test: `server/src/rooms/GameRoom.test.ts`

**Interfaces:**
- Consumes: `advanceMovable`, `Movable` (Task 2); `MoveToMessage`, `MessageType`, `MAP_BOUNDS`, `TICK_RATE`, `clampToBounds` de `@aden/shared`.
- Produces:
  - `class PlayerState extends Schema` con campos `@type("number") x`, `z`, `targetX`, `targetZ`, `@type("boolean") moving`, `@type("string") name`.
  - `class GameState extends Schema` con `@type({ map: PlayerState }) players = new MapSchema<PlayerState>()`.
  - `class GameRoom extends Room<GameState>` que registra `moveTo` y corre el tick a `TICK_RATE`.

- [ ] **Step 1: Implementar `server/src/state/PlayerState.ts`**

```ts
import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") name = "";
}
```

- [ ] **Step 2: Implementar `server/src/state/GameState.ts`**

```ts
import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
```

- [ ] **Step 3: Implementar `server/src/rooms/GameRoom.ts`**

```ts
import { Room, Client } from "colyseus";
import {
  MessageType,
  type MoveToMessage,
  MAP_BOUNDS,
  TICK_RATE,
  clampToBounds,
} from "@aden/shared";
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { advanceMovable } from "../systems/MovementSystem.js";

export class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const target = clampToBounds(msg.x, msg.z, MAP_BOUNDS);
      player.targetX = target.x;
      player.targetZ = target.z;
      player.moving = true;
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  tick(dt: number) {
    this.state.players.forEach((p) => advanceMovable(p, dt));
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
```

- [ ] **Step 4: Implementar `server/src/index.ts`**

```ts
import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT ?? 2567);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: createServer() }),
});

gameServer.define("game", GameRoom);
gameServer.listen(port);
console.log(`[aden] game server escuchando en ws://localhost:${port}`);
```

Agregar la dependencia del transporte:
Run: `npm install @colyseus/ws-transport@^0.15.0 --workspace @aden/server`

- [ ] **Step 5: Escribir el test de integración que falla (`server/src/rooms/GameRoom.test.ts`)**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType } from "@aden/shared";
import appConfig from "../testServer.js";

describe("GameRoom", () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => { colyseus = await boot(appConfig); });
  afterAll(async () => { await colyseus.shutdown(); });
  beforeEach(async () => { await colyseus.cleanup(); });

  it("crea un jugador al unirse", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Zeus" });
    await room.waitForNextPatch();
    expect(room.state.players.get(client.sessionId)?.name).toBe("Zeus");
  });

  it("mueve al jugador hacia el target tras recibir moveTo", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Zeus" });
    await room.waitForNextPatch();

    client.send(MessageType.MoveTo, { x: 100, z: 0 });
    // avanzar ~0.5s de simulación
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();

    const p = room.state.players.get(client.sessionId)!;
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThanOrEqual(50); // recortado a MAP_BOUNDS
  });
});
```

- [ ] **Step 6: Crear `server/src/testServer.ts` (config de app para @colyseus/testing)**

```ts
import { GameRoom } from "./rooms/GameRoom.js";

export default {
  initializeGameServer: (gameServer: any) => {
    gameServer.define("game", GameRoom);
  },
};
```

- [ ] **Step 7: Correr el test y verificar que falla, luego pasa**

Run: `npm test --workspace @aden/server`
Expected: primero FAIL si falta algún import; corregir imports/paths hasta PASS (los tests de sala en verde, además de los de MovementSystem).

Nota: si `@colyseus/testing` reporta que necesita `waitForNextSimulationTick`, y no avanza posición, verificar que `setSimulationInterval` esté activo; en tests podés forzar avance con `room.waitForNextSimulationTick()` que dispara el intervalo.

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat(server): GameRoom autoritativa con estado y tick sincronizado"
```

---

### Task 4: Cliente — mapping puro input→mensaje

**Files:**
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`
- Create: `client/src/input/mapping.ts`
- Test: `client/src/input/mapping.test.ts`

**Interfaces:**
- Consumes: `MoveToMessage` de `@aden/shared`.
- Produces:
  - `groundPointToMove(point: { x:number; y:number; z:number }): MoveToMessage` — descarta la Y y devuelve `{x,z}`.

- [ ] **Step 1: Crear `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`**

`client/package.json`:
```json
{
  "name": "@aden/client",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@aden/shared": "*",
    "colyseus.js": "^0.15.0",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "vite": "^5.2.0"
  }
}
```

`client/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client"] },
  "include": ["src"]
}
```

`client/vite.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
});
```

`client/index.html`:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aden Web</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #0b0b12; }
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Luego:
Run: `npm install`

- [ ] **Step 2: Escribir el test que falla (`client/src/input/mapping.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { groundPointToMove } from "./mapping.js";

describe("groundPointToMove", () => {
  it("convierte un punto 3D del suelo en un mensaje moveTo (descarta Y)", () => {
    expect(groundPointToMove({ x: 3.2, y: 12.5, z: -7.8 })).toEqual({ x: 3.2, z: -7.8 });
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test --workspace @aden/client`
Expected: FAIL — no existe `./mapping.js`.

- [ ] **Step 4: Implementar `client/src/input/mapping.ts`**

```ts
import type { MoveToMessage } from "@aden/shared";

export function groundPointToMove(point: { x: number; y: number; z: number }): MoveToMessage {
  return { x: point.x, z: point.z };
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test --workspace @aden/client`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/
git commit -m "feat(client): scaffold Vite + mapping input→moveTo con test"
```

---

### Task 5: Cliente — render Three.js, red y click-to-move (integración)

**Files:**
- Create: `client/src/render/Renderer.ts`
- Create: `client/src/render/EntityViews.ts`
- Create: `client/src/net/NetworkClient.ts`
- Create: `client/src/input/InputController.ts`
- Create: `client/src/main.ts`

**Interfaces:**
- Consumes: `groundPointToMove` (Task 4); `MessageType`, `MoveToMessage` de `@aden/shared`; estado de sala de `@aden/server` (solo tipos vía duck-typing del schema de colyseus.js).
- Produces: aplicación ejecutable; sin unit tests nuevos (código de I/O WebGL/red), se valida manualmente en el Step final.

- [ ] **Step 1: Implementar `client/src/render/Renderer.ts`**

```ts
import * as THREE from "three";

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly raycaster = new THREE.Raycaster();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly ground: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x1a1a2a);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x33443a }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    window.addEventListener("resize", () => this.onResize());
  }

  /** Devuelve el punto del suelo bajo el click en NDC, o null. */
  pickGround(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.intersectObject(this.ground)[0];
    return hit ? hit.point : null;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
```

- [ ] **Step 2: Implementar `client/src/render/EntityViews.ts`**

```ts
import * as THREE from "three";

/** Mantiene sincronizados los cubos 3D con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, THREE.Mesh>();

  constructor(private readonly scene: THREE.Scene) {}

  add(id: string, isSelf: boolean) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: isSelf ? 0x4fa3ff : 0xff7043 }),
    );
    mesh.position.y = 1;
    this.scene.add(mesh);
    this.views.set(id, mesh);
  }

  update(id: string, x: number, z: number) {
    const mesh = this.views.get(id);
    if (!mesh) return;
    // interpolación suave hacia la posición del servidor
    mesh.position.x += (x - mesh.position.x) * 0.2;
    mesh.position.z += (z - mesh.position.z) * 0.2;
  }

  remove(id: string) {
    const mesh = this.views.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.views.delete(id);
    }
  }
}
```

- [ ] **Step 3: Implementar `client/src/net/NetworkClient.ts`**

```ts
import { Client, Room } from "colyseus.js";
import { MessageType, type MoveToMessage } from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean) => void;
  onChange: (id: string, x: number, z: number) => void;
  onRemove: (id: string) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name });
    const selfId = this.room.sessionId;

    this.room.state.players.onAdd((player: any, id: string) => {
      cb.onAdd(id, id === selfId);
      cb.onChange(id, player.x, player.z);
      player.onChange(() => cb.onChange(id, player.x, player.z));
    });
    this.room.state.players.onRemove((_player: any, id: string) => cb.onRemove(id));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }
}
```

- [ ] **Step 4: Implementar `client/src/input/InputController.ts`**

```ts
import type { Renderer } from "../render/Renderer.js";
import { groundPointToMove } from "./mapping.js";
import type { MoveToMessage } from "@aden/shared";

export class InputController {
  constructor(
    private readonly renderer: Renderer,
    private readonly onMove: (msg: MoveToMessage) => void,
  ) {}

  attach(dom: HTMLElement) {
    dom.addEventListener("click", (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const point = this.renderer.pickGround(ndcX, ndcY);
      if (point) this.onMove(groundPointToMove(point));
    });
  }
}
```

- [ ] **Step 5: Implementar `client/src/main.ts`**

```ts
import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);
  const views = new EntityViews(renderer.scene);
  const net = new NetworkClient();

  const name = prompt("Nombre de tu personaje:") ?? "Adventurer";

  await net.connect(name, {
    onAdd: (id, isSelf) => views.add(id, isSelf),
    onChange: (id, x, z) => views.update(id, x, z),
    onRemove: (id) => views.remove(id),
  });

  const input = new InputController(renderer, (msg) => net.sendMove(msg));
  input.attach(renderer.scene ? document.body : document.body);

  function loop() {
    renderer.render();
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
```

- [ ] **Step 6: Verificación manual end-to-end**

1. En una terminal: `npm run start --workspace @aden/server` (arranca el server en 2567).
2. En otra: `npm run dev --workspace @aden/client` (Vite en 5173).
3. Abrir `http://localhost:5173` en **dos** pestañas/navegadores, poner nombres distintos.
4. En una pestaña, hacer click en el suelo → tu cubo azul camina hacia ahí.
5. Verificar en la **otra** pestaña que el cubo naranja (el otro jugador) se mueve en tiempo real hacia el mismo punto.

Expected: ambas pestañas muestran el movimiento sincronizado con interpolación suave; el server es quien decide la posición (si mandás un target fuera de ±50, el cubo se frena en el borde).

- [ ] **Step 7: Commit**

```bash
git add client/
git commit -m "feat(client): render Three.js + red Colyseus + click-to-move sincronizado"
```

---

## Self-Review (cobertura vs spec)

- **Server autoritativo / netcode (spec §3, §6, riesgo §11):** cubierto por Tasks 2–3 (MovementSystem + GameRoom + tick 15 Hz + validación de bounds).
- **Click-to-move (spec §4 Movimiento):** cubierto por Tasks 4–5 (raycast → moveTo → server valida).
- **Ver a otros jugadores en tiempo real (spec §2 v1):** cubierto por Task 5 (EntityViews + onAdd/onChange/onRemove).
- **Una sola fuente de verdad para constantes/fórmulas (spec §6):** `@aden/shared` importado por server y client.
- **Config por env, cloud-ready (spec §10):** `PORT` y `VITE_SERVER_URL`.
- **Fuera de alcance de Etapa 0 (van en planes posteriores):** modelos glTF/animaciones (Etapa 1), mobs/combate (Etapa 2), EXP/loot/persistencia Supabase (Etapa 3), HUD/pueblo/deploy (Etapa 4). Correcto: esta etapa valida solo el esqueleto de red.

**Placeholder scan:** sin TBD/TODO; todo el código de cada step es real.
**Type consistency:** `Movable` (Task 2) reusado por `advanceMovable` en `GameRoom` (Task 3); `groundPointToMove` (Task 4) consumido por `InputController` (Task 5); `MoveToMessage`/`MessageType` consistentes desde `shared`.
