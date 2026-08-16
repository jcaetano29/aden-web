# Etapa 2a — Mobs y AI (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poblar el mundo con mobs (esqueletos KayKit) que el servidor spawnea en zonas, deambulan (wander), detectan al jugador por proximidad (aggro) y lo persiguen (chase), volviendo a su zona si el jugador se aleja (leash). El cliente los renderiza con animación idle/walk. Sin combate todavía (eso es Etapa 2b).

**Architecture:** El servidor autoritativo suma dos sistemas nuevos y puros — `SpawnSystem` (crea mobs en zonas) y `MobAISystem` (máquina de estados wander/chase que decide el `target`/`moving` de cada mob) — más un `MobState` en el estado sincronizado. El movimiento reusa `advanceMovable` (los mobs son estructuralmente `Movable`). El cliente reusa `CharacterFactory`/`CharacterView` para renderizar mobs (mismos que los jugadores, distinto modelo). Toda la lógica de IA/spawn es pura y testeable; el render es I/O verificado por smoke test.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15 (server), Three.js 0.160 (client), Vitest. Assets: KayKit Skeletons 1.0 (CC0).

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§4 Mobs)

## Global Constraints

- ESM, TypeScript `strict: true`. TDD en toda la lógica pura (shared + los sistemas del server).
- El servidor sigue siendo la única autoridad: los mobs se mueven y deciden 100% server-side; el cliente solo renderiza el estado sincronizado. En Etapa 2a **no hay mensajes cliente→servidor nuevos**.
- Tick del server: 15 Hz (`TICK_RATE`, ya existe). Mobs se mueven con `advanceMovable` (ya existe) a una velocidad propia `MOB_MOVE_SPEED`.
- Los timers/estado interno de IA de un mob NO se sincronizan: en `MobState`, solo los campos visibles (`x,z,targetX,targetZ,moving,templateId,aiState`) llevan `@type`; los internos (cooldowns, home, aggroTargetId) son propiedades planas server-only.
- La aleatoriedad (wander, spawn) usa un RNG inyectable (`() => number`) para tests deterministas; en producción se pasa `Math.random`.
- Assets: **KayKit Skeletons 1.0**, CC0. GLB autocontenidos desde GitHub raw:
  `https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf/<Nombre>.glb`
  Nombres usados en 2a: `Skeleton_Minion` (~4.81 MB), `Skeleton_Warrior` (~4.86 MB).
- No romper Etapa 0/1: los jugadores siguen funcionando igual. El `YAW_OFFSET=0` y el pipeline de `CharacterView` aplican también a los mobs (mismo rig KayKit).

---

## File Structure

```
shared/src/mobs.ts               (NUEVO) MobTemplate, MOB_TEMPLATES, SPAWN_ZONES, MOB_MOVE_SPEED, AGGRO/LEASH/WANDER config, getTemplate()
shared/src/mobs.test.ts          (NUEVO)
shared/src/index.ts              (MODIFICAR) re-export de mobs

server/src/state/MobState.ts     (NUEVO) Schema del mob (campos sync + props internas server-only)
server/src/state/GameState.ts    (MODIFICAR) agrega mobs: MapSchema<MobState>
server/src/systems/SpawnSystem.ts        (NUEVO) createSpawns(zones, rng) → mobs iniciales
server/src/systems/SpawnSystem.test.ts   (NUEVO)
server/src/systems/MobAISystem.ts        (NUEVO) stepMobAI(mob, players, cfg, rng, dtMs) — decide target/moving/aiState
server/src/systems/MobAISystem.test.ts   (NUEVO)
server/src/rooms/GameRoom.ts     (MODIFICAR) spawnea mobs en onCreate; en tick corre stepMobAI + advanceMovable por mob

client/public/models/Skeleton_Minion.glb, Skeleton_Warrior.glb   (NUEVOS assets)
client/public/models/LICENSES.md (MODIFICAR) agrega KayKit Skeletons
client/src/assets/manifest.ts    (MODIFICAR) MOB_MODEL_NAMES + modelUrl reusado; mapea templateId→modelo
client/src/assets/manifest.test.ts (MODIFICAR)
client/src/net/NetworkClient.ts  (MODIFICAR) suscribe state.mobs (onAdd/onChange/onRemove) → callbacks de mob
client/src/render/EntityViews.ts (MODIFICAR) soporta agregar/actualizar/quitar mobs (reusa CharacterView)
client/src/main.ts               (MODIFICAR) wire de callbacks de mobs
```

**Decomposición:** la IA y el spawn son funciones puras testeables sin Colyseus. `MobState` es estructuralmente `Movable`, así que `advanceMovable` se reusa tal cual. El cliente reusa `CharacterView` (que solo depende de `{x,z,targetX,targetZ,moving}`), así que renderizar un mob es casi idéntico a un jugador con otro modelo.

---

### Task 1: Shared — templates de mobs, zonas de spawn y config de IA (puro, TDD)

**Files:**
- Create: `shared/src/mobs.ts`, `shared/src/mobs.test.ts`
- Modify: `shared/src/index.ts`

**Interfaces:**
- Produces:
  - `MOB_MOVE_SPEED: number` (unidades/seg, p.ej. 3.5 — más lento que el jugador 5).
  - `interface MobTemplate { id: string; name: string; model: string }` y `MOB_TEMPLATES: Record<string, MobTemplate>` con `skeleton_minion` (model "Skeleton_Minion") y `skeleton_warrior` (model "Skeleton_Warrior").
  - `getTemplate(id: string): MobTemplate` — lanza si no existe.
  - `interface SpawnZone { id: string; templateId: string; centerX: number; centerZ: number; radius: number; count: number }` y `SPAWN_ZONES: SpawnZone[]` (2 zonas dentro de MAP_BOUNDS ±50, lejos del origen/pueblo).
  - `AI_CONFIG = { aggroRadius: 8, leashRadius: 16, wanderRadius: 6, wanderPauseMs: 2000 }` (readonly).

- [ ] **Step 1: Escribir el test que falla (`shared/src/mobs.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { MOB_TEMPLATES, getTemplate, SPAWN_ZONES, AI_CONFIG, MOB_MOVE_SPEED } from "./mobs.js";
import { MAP_BOUNDS } from "./constants.js";

describe("MOB_TEMPLATES / getTemplate", () => {
  it("incluye skeleton_minion y skeleton_warrior con su modelo", () => {
    expect(getTemplate("skeleton_minion").model).toBe("Skeleton_Minion");
    expect(getTemplate("skeleton_warrior").model).toBe("Skeleton_Warrior");
  });
  it("lanza para un template desconocido", () => {
    expect(() => getTemplate("dragon")).toThrow();
  });
});

describe("SPAWN_ZONES", () => {
  it("referencian templates válidos y caen dentro del mapa", () => {
    for (const z of SPAWN_ZONES) {
      expect(MOB_TEMPLATES[z.templateId]).toBeDefined();
      expect(z.count).toBeGreaterThan(0);
      expect(z.centerX - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minX);
      expect(z.centerX + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
      expect(z.centerZ - z.radius).toBeGreaterThanOrEqual(MAP_BOUNDS.minZ);
      expect(z.centerZ + z.radius).toBeLessThanOrEqual(MAP_BOUNDS.maxZ);
    }
  });
});

describe("config", () => {
  it("aggroRadius < leashRadius y velocidades positivas", () => {
    expect(AI_CONFIG.aggroRadius).toBeLessThan(AI_CONFIG.leashRadius);
    expect(MOB_MOVE_SPEED).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test --workspace @aden/shared`
Expected: FAIL — no existe `./mobs.js`.

- [ ] **Step 3: Implementar `shared/src/mobs.ts`**

```ts
export const MOB_MOVE_SPEED = 3.5; // unidades/seg (más lento que el jugador)

export interface MobTemplate {
  id: string;
  name: string;
  model: string; // nombre de modelo en client/public/models
}

export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  skeleton_minion: { id: "skeleton_minion", name: "Skeleton Minion", model: "Skeleton_Minion" },
  skeleton_warrior: { id: "skeleton_warrior", name: "Skeleton Warrior", model: "Skeleton_Warrior" },
};

export function getTemplate(id: string): MobTemplate {
  const t = MOB_TEMPLATES[id];
  if (!t) throw new Error(`getTemplate: template desconocido: ${id}`);
  return t;
}

export interface SpawnZone {
  id: string;
  templateId: string;
  centerX: number;
  centerZ: number;
  radius: number;
  count: number;
}

export const SPAWN_ZONES: SpawnZone[] = [
  { id: "minions_norte", templateId: "skeleton_minion", centerX: 20, centerZ: -20, radius: 8, count: 4 },
  { id: "warriors_este", templateId: "skeleton_warrior", centerX: -25, centerZ: 20, radius: 8, count: 3 },
];

export const AI_CONFIG = {
  aggroRadius: 8,
  leashRadius: 16,
  wanderRadius: 6,
  wanderPauseMs: 2000,
} as const;
```

- [ ] **Step 4: Modificar `shared/src/index.ts`** — agregar `export * from "./mobs.js";`

- [ ] **Step 5: Correr y verificar que pasa**

Run: `npm test --workspace @aden/shared`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat(shared): templates de mobs, zonas de spawn y config de IA"
```

---

### Task 2: Server — MobState + GameState.mobs

**Files:**
- Create: `server/src/state/MobState.ts`
- Modify: `server/src/state/GameState.ts`

**Interfaces:**
- Produces:
  - `class MobState extends Schema` con `@type` para `x, z, targetX, targetZ` (number), `moving` (boolean), `templateId` (string), `aiState` (string, default "wander"); y propiedades planas server-only (sin `@type`): `homeX, homeZ, wanderCooldownMs, aggroTargetId` (`string`, default "").
  - `GameState` agrega `@type({ map: MobState }) mobs = new MapSchema<MobState>()`.

- [ ] **Step 1: Implementar `server/src/state/MobState.ts`**

```ts
import { Schema, type } from "@colyseus/schema";

export class MobState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") templateId = "";
  @type("string") aiState = "wander";

  // Estado interno server-only (NO sincronizado — sin @type)
  homeX = 0;
  homeZ = 0;
  wanderCooldownMs = 0;
  aggroTargetId = "";
}
```

- [ ] **Step 2: Modificar `server/src/state/GameState.ts`**

```ts
import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";
import { MobState } from "./MobState.js";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MobState }) mobs = new MapSchema<MobState>();
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p server/tsconfig.json`
Expected: sin errores. (Los tests existentes del server siguen verdes: `npm test --workspace @aden/server`.)

- [ ] **Step 4: Commit**

```bash
git add server/
git commit -m "feat(server): MobState schema + mobs en GameState"
```

---

### Task 3: Server — SpawnSystem (puro, TDD) + wiring

**Files:**
- Create: `server/src/systems/SpawnSystem.ts`, `server/src/systems/SpawnSystem.test.ts`
- Modify: `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `SPAWN_ZONES`, `SpawnZone` de `@aden/shared`.
- Produces:
  - `interface SpawnedMob { id: string; templateId: string; x: number; z: number }`
  - `createSpawns(zones: SpawnZone[], rng: () => number): SpawnedMob[]` — por cada zona genera `count` mobs con id único (`${zone.id}_${i}`) y posición aleatoria dentro del radio (usando rng), posición = home.

- [ ] **Step 1: Escribir el test que falla (`server/src/systems/SpawnSystem.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { createSpawns } from "./SpawnSystem.js";
import { distance2D } from "@aden/shared";

const ZONES = [
  { id: "z1", templateId: "skeleton_minion", centerX: 10, centerZ: 0, radius: 5, count: 3 },
  { id: "z2", templateId: "skeleton_warrior", centerX: -10, centerZ: 0, radius: 4, count: 2 },
];

describe("createSpawns", () => {
  it("crea count mobs por zona con ids únicos", () => {
    const mobs = createSpawns(ZONES, () => 0.5);
    expect(mobs).toHaveLength(5);
    expect(new Set(mobs.map((m) => m.id)).size).toBe(5);
  });
  it("posiciona cada mob dentro del radio de su zona", () => {
    const mobs = createSpawns(ZONES, Math.random);
    for (const m of mobs) {
      const z = ZONES.find((zz) => m.id.startsWith(zz.id))!;
      expect(distance2D(m.x, m.z, z.centerX, z.centerZ)).toBeLessThanOrEqual(z.radius + 1e-9);
    }
  });
  it("asigna el templateId de la zona", () => {
    const mobs = createSpawns(ZONES, () => 0.5);
    expect(mobs.find((m) => m.id.startsWith("z1"))!.templateId).toBe("skeleton_minion");
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test --workspace @aden/server`
Expected: FAIL — no existe `./SpawnSystem.js`.

- [ ] **Step 3: Implementar `server/src/systems/SpawnSystem.ts`**

```ts
import type { SpawnZone } from "@aden/shared";

export interface SpawnedMob {
  id: string;
  templateId: string;
  x: number;
  z: number;
}

export function createSpawns(zones: SpawnZone[], rng: () => number): SpawnedMob[] {
  const mobs: SpawnedMob[] = [];
  for (const zone of zones) {
    for (let i = 0; i < zone.count; i++) {
      // punto aleatorio uniforme dentro del disco de la zona
      const angle = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * zone.radius;
      mobs.push({
        id: `${zone.id}_${i}`,
        templateId: zone.templateId,
        x: zone.centerX + Math.cos(angle) * dist,
        z: zone.centerZ + Math.sin(angle) * dist,
      });
    }
  }
  return mobs;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test --workspace @aden/server`
Expected: PASS.

- [ ] **Step 5: Wire en `GameRoom.onCreate`** — tras `setState`, spawnear los mobs:

```ts
import { SPAWN_ZONES, getTemplate } from "@aden/shared";
import { MobState } from "../state/MobState.js";
import { createSpawns } from "../systems/SpawnSystem.js";
// ...dentro de onCreate(), después de this.setState(new GameState()):
for (const s of createSpawns(SPAWN_ZONES, Math.random)) {
  const mob = new MobState();
  mob.templateId = s.templateId;
  mob.x = s.x; mob.z = s.z;
  mob.homeX = s.x; mob.homeZ = s.z;
  mob.targetX = s.x; mob.targetZ = s.z;
  this.state.mobs.set(s.id, mob);
}
```

- [ ] **Step 6: Typecheck + tests**

Run: `npx tsc --noEmit -p server/tsconfig.json` y `npm test --workspace @aden/server`
Expected: sin errores; tests verdes.

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat(server): SpawnSystem + spawn de mobs en la sala"
```

---

### Task 4: Server — MobAISystem (puro, TDD) + wiring del tick

**Files:**
- Create: `server/src/systems/MobAISystem.ts`, `server/src/systems/MobAISystem.test.ts`
- Modify: `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `AI_CONFIG`, `distance2D` de `@aden/shared`.
- Produces:
  - `interface AIMob { x:number; z:number; targetX:number; targetZ:number; moving:boolean; aiState:string; homeX:number; homeZ:number; wanderCooldownMs:number; aggroTargetId:string }`
  - `interface PlayerPos { id:string; x:number; z:number }`
  - `stepMobAI(mob: AIMob, players: PlayerPos[], cfg: typeof AI_CONFIG, rng: () => number, dtMs: number): void` — decide estado/target del mob (NO lo mueve; el movimiento lo hace `advanceMovable` aparte). Reglas:
    - Busca el jugador más cercano dentro de `aggroRadius` (distancia mob→jugador).
    - Si hay uno → `aiState="chase"`, `aggroTargetId=id`, target = pos del jugador, `moving=true`.
    - Si está en chase: si el `aggroTargetId` sigue presente y el mob está dentro de `leashRadius` de su HOME → sigue persiguiendo (target = pos actual del jugador). Si el jugador ya no está, o el mob quedó a más de `leashRadius` de su home → suelta aggro: `aiState="wander"`, `aggroTargetId=""`, target = home, `moving=true`.
    - Si wander: si `moving` y llegó (`moving===false` tras el movimiento), arranca cooldown; descuenta `dtMs`; cuando `wanderCooldownMs<=0` elige un punto random dentro de `wanderRadius` del home, target=ese punto, `moving=true`, resetea cooldown a `wanderPauseMs`.

- [ ] **Step 1: Escribir el test que falla (`server/src/systems/MobAISystem.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { stepMobAI, type AIMob } from "./MobAISystem.js";
import { AI_CONFIG } from "@aden/shared";

function mob(over: Partial<AIMob> = {}): AIMob {
  return {
    x: 0, z: 0, targetX: 0, targetZ: 0, moving: false, aiState: "wander",
    homeX: 0, homeZ: 0, wanderCooldownMs: 0, aggroTargetId: "", ...over,
  };
}

describe("stepMobAI — aggro", () => {
  it("entra en chase y apunta al jugador dentro de aggroRadius", () => {
    const m = mob();
    stepMobAI(m, [{ id: "p1", x: 3, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("chase");
    expect(m.aggroTargetId).toBe("p1");
    expect(m.targetX).toBeCloseTo(3);
    expect(m.moving).toBe(true);
  });

  it("ignora jugadores fuera de aggroRadius", () => {
    const m = mob();
    stepMobAI(m, [{ id: "p1", x: 100, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
  });
});

describe("stepMobAI — leash", () => {
  it("suelta aggro y vuelve al home si el mob supera leashRadius del home", () => {
    const m = mob({ aiState: "chase", aggroTargetId: "p1", x: AI_CONFIG.leashRadius + 5, z: 0, homeX: 0, homeZ: 0 });
    stepMobAI(m, [{ id: "p1", x: AI_CONFIG.leashRadius + 6, z: 0 }], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
    expect(m.targetX).toBeCloseTo(0); // home
  });

  it("suelta aggro si el jugador desaparece", () => {
    const m = mob({ aiState: "chase", aggroTargetId: "p1", x: 2, z: 0 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.aiState).toBe("wander");
    expect(m.aggroTargetId).toBe("");
  });
});

describe("stepMobAI — wander", () => {
  it("tras el cooldown elige un nuevo target dentro de wanderRadius del home", () => {
    const m = mob({ moving: false, wanderCooldownMs: 0, homeX: 10, homeZ: 10, x: 10, z: 10 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.moving).toBe(true);
    const dx = m.targetX - 10, dz = m.targetZ - 10;
    expect(Math.sqrt(dx * dx + dz * dz)).toBeLessThanOrEqual(AI_CONFIG.wanderRadius + 1e-9);
    expect(m.wanderCooldownMs).toBeGreaterThan(0);
  });

  it("mientras el cooldown corre, descuenta dtMs y no se mueve", () => {
    const m = mob({ moving: false, wanderCooldownMs: 1000, homeX: 0, homeZ: 0 });
    stepMobAI(m, [], AI_CONFIG, () => 0.5, 16);
    expect(m.wanderCooldownMs).toBeCloseTo(984);
    expect(m.moving).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test --workspace @aden/server`
Expected: FAIL — no existe `./MobAISystem.js`.

- [ ] **Step 3: Implementar `server/src/systems/MobAISystem.ts`**

```ts
import { distance2D, type AI_CONFIG as AiConfigType } from "@aden/shared";

export interface AIMob {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  aiState: string;
  homeX: number;
  homeZ: number;
  wanderCooldownMs: number;
  aggroTargetId: string;
}

export interface PlayerPos {
  id: string;
  x: number;
  z: number;
}

export function stepMobAI(
  mob: AIMob,
  players: PlayerPos[],
  cfg: typeof AiConfigType,
  rng: () => number,
  dtMs: number,
): void {
  // 1) ¿Hay jugador dentro de aggroRadius? (el más cercano)
  let nearest: PlayerPos | null = null;
  let nearestD = Infinity;
  for (const p of players) {
    const d = distance2D(mob.x, mob.z, p.x, p.z);
    if (d < nearestD) { nearestD = d; nearest = p; }
  }

  const leashedOut = distance2D(mob.x, mob.z, mob.homeX, mob.homeZ) > cfg.leashRadius;

  if (nearest && nearestD <= cfg.aggroRadius && !leashedOut) {
    mob.aiState = "chase";
    mob.aggroTargetId = nearest.id;
    mob.targetX = nearest.x;
    mob.targetZ = nearest.z;
    mob.moving = true;
    return;
  }

  if (mob.aiState === "chase") {
    // seguir persiguiendo si el objetivo existe y no nos pasamos del leash
    const target = players.find((p) => p.id === mob.aggroTargetId);
    if (target && !leashedOut) {
      mob.targetX = target.x;
      mob.targetZ = target.z;
      mob.moving = true;
      return;
    }
    // soltar aggro → volver al home
    mob.aiState = "wander";
    mob.aggroTargetId = "";
    mob.targetX = mob.homeX;
    mob.targetZ = mob.homeZ;
    mob.moving = true;
    mob.wanderCooldownMs = 0;
    return;
  }

  // wander
  if (mob.moving) return; // sigue yendo hacia su punto de wander (advanceMovable apagará moving al llegar)
  if (mob.wanderCooldownMs > 0) {
    mob.wanderCooldownMs -= dtMs;
    return;
  }
  const angle = rng() * Math.PI * 2;
  const dist = Math.sqrt(rng()) * cfg.wanderRadius;
  mob.targetX = mob.homeX + Math.cos(angle) * dist;
  mob.targetZ = mob.homeZ + Math.sin(angle) * dist;
  mob.moving = true;
  mob.wanderCooldownMs = cfg.wanderPauseMs;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test --workspace @aden/server`
Expected: PASS.

- [ ] **Step 5: Wire en `GameRoom.tick`** — tras mover jugadores, correr IA + movimiento de mobs:

```ts
import { MOB_MOVE_SPEED, AI_CONFIG } from "@aden/shared";
import { stepMobAI } from "../systems/MobAISystem.js";
// ...en tick(dt) (dt en segundos), después de mover players:
const players = [...this.state.players.entries()].map(([id, p]) => ({ id, x: p.x, z: p.z }));
const dtMs = dt * 1000;
this.state.mobs.forEach((mob) => {
  stepMobAI(mob, players, AI_CONFIG, Math.random, dtMs);
  advanceMovable(mob, dt, MOB_MOVE_SPEED);
});
```

- [ ] **Step 6: Typecheck + tests + humo de arranque**

Run: `npx tsc --noEmit -p server/tsconfig.json` ; `npm test --workspace @aden/server` ; arrancar el server (`npm run dev:server`) y confirmar que bootea sin errores.
Expected: sin errores; tests verdes; server escuchando.

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat(server): MobAISystem (wander/aggro/chase/leash) en el tick"
```

---

### Task 5: Client — assets de esqueletos + manifest de mobs (TDD)

**Files:**
- Create (binarios): `client/public/models/Skeleton_Minion.glb`, `Skeleton_Warrior.glb`
- Modify: `client/public/models/LICENSES.md`, `client/src/assets/manifest.ts`, `client/src/assets/manifest.test.ts`

**Interfaces:**
- Produces:
  - `MOB_MODEL_NAMES: readonly string[]` = `["Skeleton_Minion","Skeleton_Warrior"]`.
  - `modelForTemplate(templateId: string): string` — usa `getTemplate(templateId).model` de `@aden/shared`.
  - (`modelUrl` ya existe y sirve para `/models/Skeleton_Minion.glb`.)

- [ ] **Step 1: Descargar los 2 GLB de esqueletos**

```bash
BASE="https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf"
for m in Skeleton_Minion Skeleton_Warrior; do
  curl -sfL "$BASE/$m.glb" -o "client/public/models/$m.glb" || { echo "FALLO $m"; exit 1; }
done
for m in Skeleton_Minion Skeleton_Warrior; do printf "%s: " "$m"; head -c 4 "client/public/models/$m.glb"; echo " ($(wc -c < client/public/models/$m.glb) bytes)"; done
```
Expected: cada archivo imprime `glTF` y ~4.8 MB (>4.000.000 bytes). Si falla, abortar (no commitear assets rotos).

- [ ] **Step 2: Agregar a `client/public/models/LICENSES.md`** una sección "KayKit Character Pack — Skeletons 1.0" (CC0, fuente GitHub, archivos Skeleton_Minion.glb / Skeleton_Warrior.glb).

- [ ] **Step 3: Escribir el test que falla — agregar a `client/src/assets/manifest.test.ts`**

```ts
import { MOB_MODEL_NAMES, modelForTemplate } from "./manifest.js";

describe("mobs", () => {
  it("MOB_MODEL_NAMES incluye los esqueletos", () => {
    expect(MOB_MODEL_NAMES).toContain("Skeleton_Minion");
    expect(MOB_MODEL_NAMES).toContain("Skeleton_Warrior");
  });
  it("modelForTemplate mapea el templateId a su modelo", () => {
    expect(modelForTemplate("skeleton_minion")).toBe("Skeleton_Minion");
    expect(modelForTemplate("skeleton_warrior")).toBe("Skeleton_Warrior");
  });
});
```

- [ ] **Step 4: Correr y verificar que falla**

Run: `npm test --workspace @aden/client`
Expected: FAIL — `MOB_MODEL_NAMES`/`modelForTemplate` no existen.

- [ ] **Step 5: Implementar en `client/src/assets/manifest.ts`**

```ts
import { getTemplate } from "@aden/shared";

export const MOB_MODEL_NAMES = ["Skeleton_Minion", "Skeleton_Warrior"] as const;

export function modelForTemplate(templateId: string): string {
  return getTemplate(templateId).model;
}
```

- [ ] **Step 6: Correr y verificar que pasa**

Run: `npm test --workspace @aden/client`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/public/models client/src/assets
git commit -m "feat(client): assets KayKit Skeletons + mapping template→modelo"
```

---

### Task 6: Client — renderizar mobs (integración)

**Files:**
- Modify: `client/src/net/NetworkClient.ts`, `client/src/render/EntityViews.ts`, `client/src/main.ts`

**Interfaces:**
- Consumes: `CharacterFactory`/`CharacterView` (E1), `MOB_MODEL_NAMES`/`modelForTemplate` (Task 5), `PlayerSnapshot`/`ServerState` shape.
- Produces:
  - `NetworkClient`: además de players, suscribe `this.room.state.mobs` con callbacks `onMobAdd(id, templateId, snap)`, `onMobChange(id, snap)`, `onMobRemove(id)` (snap = `{x,z,targetX,targetZ,moving}`).
  - `EntityViews`: `addMob(id, modelName, snap)`, `updateMob(id, snap)`, `removeMob(id)` — reusa `CharacterView`; los mobs entran en el mismo `updateAll(dt)`.

- [ ] **Step 1: Ampliar `NetworkClient` con callbacks de mobs**

Agregar a `RoomCallbacks`: `onMobAdd(id: string, templateId: string, snap: PlayerSnapshot): void`, `onMobChange(id: string, snap: PlayerSnapshot): void`, `onMobRemove(id: string): void`. En `connect`, tras cablear players:
```ts
this.room.state.mobs.onAdd((mob: any, id: string) => {
  cb.onMobAdd(id, mob.templateId, snapMob(mob));
  mob.onChange(() => cb.onMobChange(id, snapMob(mob)));
});
this.room.state.mobs.onRemove((_m: any, id: string) => cb.onMobRemove(id));
```
donde `snapMob(m)` arma `{ name:"", x, z, targetX, targetZ, moving }` (reusa el mismo shape; los mobs no usan nombre en 2a).

- [ ] **Step 2: Ampliar `EntityViews` con soporte de mobs**

Mantener los mobs en el MISMO mapa de `CharacterView`s (o un segundo mapa `mobViews`). Recomendado: un segundo `Map<string, CharacterView>` `mobViews` para no colisionar ids con players. `addMob(id, modelName, snap)` crea `CharacterView` con `factory.create(modelName)`, `snapTo(snap.x,snap.z)`, `setServerState(snap)`, agrega a la escena. `updateMob`/`removeMob` análogos. En `updateAll(dt)`, actualizar también `mobViews`. Los mobs NO llevan nameplate ni anillo en 2a.

- [ ] **Step 3: Precargar modelos de mobs y cablear en `main.ts`**

En `main.ts`, ampliar el preload: `await factory.preload([...MODEL_NAMES, ...MOB_MODEL_NAMES])`. Agregar callbacks:
```ts
onMobAdd: (id, templateId, snap) => views.addMob(id, modelForTemplate(templateId), snap),
onMobChange: (id, snap) => views.updateMob(id, snap),
onMobRemove: (id) => views.removeMob(id),
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit -p client/tsconfig.json` ; `npm run build --workspace @aden/client`
Expected: sin errores; build OK. (Tests unitarios previos siguen verdes.)

- [ ] **Step 5: Smoke test (un navegador)**

`npm run dev` (server+cliente), abrir el cliente, entrar. Verificar: aparecen **esqueletos** en las zonas de spawn, **deambulan** (idle/walk), y cuando tu personaje se **acerca (< ~8u)** el esqueleto cercano **te persigue**; si te alejás bastante, **vuelve** a su zona. Consola sin errores; `/models/Skeleton_*.glb` cargan 200. (La correctitud visual fina la confirma el usuario/controller.)

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "feat(client): render de mobs (esqueletos) con IA sincronizada"
```

---

### Task 7: Verificación E2E (controller)

**Files:** ninguno.

- [ ] **Step 1: Regresión de red + IA con script de 2 clientes**
Levantar el server; con un script tipo el de E1, conectar 2 clientes y verificar vía estado sincronizado: `room.state.mobs.size > 0`; al mover un cliente cerca de un mob (mandando `moveTo` hacia su zona), tras unos ticks el `aiState` de ese mob pasa a `"chase"` y su `targetX/targetZ` sigue al jugador; al alejarse, vuelve a `"wander"`. Documentar PASS/FAIL.

- [ ] **Step 2: Boot del cliente**
Cargar el cliente en el browser y confirmar (network/console) que los GLB de esqueletos cargan 200 y no hay errores. (La verificación visual —esqueletos deambulando y persiguiendo— queda para el usuario en local, por la limitación de compositing del entorno.)

---

## Self-Review (cobertura vs spec)

- **Mobs con zonas de spawn (spec §4 Mobs):** Task 1 (SPAWN_ZONES) + Task 3 (SpawnSystem).
- **Wander / aggro por proximidad / persecución / leash (spec §4):** Task 4 (MobAISystem, testeado por estado).
- **Movimiento autoritativo de mobs:** reusa `advanceMovable` con `MOB_MOVE_SPEED` (Task 4 wiring).
- **Render de mobs con animación:** Tasks 5–6 (assets KayKit Skeletons + CharacterView reusado).
- **Estado sincronizado a todos los clientes:** `GameState.mobs` (Task 2) + suscripción cliente (Task 6), verificado en Task 7.
- **Fuera de alcance de 2a (va en 2b):** ataque de mobs, daño, HP, muerte/respawn, target del jugador, auto-attack, Power Strike, barras de vida, números de daño. NO se implementan aquí. EXP/loot son Etapa 3.

**Placeholder scan:** sin TBD/TODO; el código de cada step es real.
**Type consistency:** `AIMob`/`SpawnedMob` (server) ↔ campos de `MobState`; `MobState` es estructuralmente `Movable` (usado por `advanceMovable`); el cliente reusa el shape `{x,z,targetX,targetZ,moving}` de `ServerState`/`PlayerSnapshot` para mobs.
