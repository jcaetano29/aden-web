# Etapa 3a — EXP y niveles (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Matar un mob otorga EXP al jugador que lo mató (server-autoritativo). Al acumular suficiente EXP el jugador sube de nivel: sus stats máximos (HP/MP/P.Atk/P.Def) crecen y se rellenan HP/MP. El cliente muestra el nivel y una barra de EXP en el HUD, y un aviso de "¡Subiste de nivel!". Sin loot/inventario todavía (Etapa 3b) ni persistencia (diferida a Supabase).

**Architecture:** Sobre el combate de E2b. La curva de EXP y la lógica de subida de nivel son puras (en `shared`, testeadas). El `GameRoom` otorga EXP en el punto donde un mob muere (auto-attack y Power Strike ya comparten ese momento — se refactoriza a un helper `killMob(mob, killer)` para no duplicar). `PlayerState` suma `exp` y `level` sincronizados. El cliente extiende el HUD con nivel + barra de EXP y escucha un evento `levelUp`.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§4 EXP y nivel)

## Global Constraints

- ESM, `strict: true`. TDD en la lógica pura (curva de EXP + subida de nivel).
- Server autoritativo: el cliente nunca calcula EXP/nivel/stats; solo muestra estado sincronizado + escucha `levelUp`.
- Reusar el momento de muerte del mob (ya existe en el auto-attack loop y en `useSkill`) — refactor a un helper compartido para otorgar EXP en un solo lugar.
- Config (rulings, shared): `EXP_BASE = 100`, `EXP_POW = 1.5` → `expToNextLevel(level) = round(EXP_BASE * level^EXP_POW)` (L1→2: 100, L2→3: ~283, L3→4: ~520). Crecimiento por nivel: `HP_PER_LEVEL 20, MP_PER_LEVEL 5, ATK_PER_LEVEL 3, DEF_PER_LEVEL 2`. EXP por mob: `skeleton_minion 15`, `skeleton_warrior 40`.
- El jugador arranca nivel 1, exp 0. Al morir NO pierde EXP en v1 (campo listo para penalización futura).
- No romper etapas previas.

---

## File Structure

```
shared/src/progression.ts        (NUEVO) EXP_BASE/EXP_POW, expToNextLevel, LEVEL_GROWTH, MOB_EXP, getMobExp, gainExp (puro, muta un Leveled)
shared/src/progression.test.ts   (NUEVO)
shared/src/protocol.ts           (MODIFICAR) MessageType.LevelUp + LevelUpEvent {level}
shared/src/index.ts              (MODIFICAR) export progression

server/src/state/PlayerState.ts  (MODIFICAR) exp, level (@type)
server/src/rooms/GameRoom.ts     (MODIFICAR) init level/exp en onJoin; helper killMob(mob, killer?) que otorga EXP + sube nivel + broadcast LevelUp; usar en auto-attack y useSkill

client/src/render/Hud.ts         (MODIFICAR) muestra nivel + barra de EXP (exp/expToNextLevel)
client/src/net/NetworkClient.ts  (MODIFICAR) getSelf expone exp/level; onLevelUp (room.onMessage)
client/src/main.ts               (MODIFICAR) pasa exp/level al HUD; muestra aviso de level up
```

---

### Task 1: Shared — curva de EXP, crecimiento y subida de nivel (puro, TDD)

**Files:**
- Create: `shared/src/progression.ts`, `shared/src/progression.test.ts`
- Modify: `shared/src/protocol.ts`, `shared/src/index.ts`

**Interfaces:**
- Produces:
  - `expToNextLevel(level: number): number` = `Math.round(EXP_BASE * Math.pow(level, EXP_POW))`.
  - `LEVEL_GROWTH = { hp: 20, mp: 5, pAtk: 3, pDef: 2 }`.
  - `MOB_EXP: Record<string, number>` (`skeleton_minion:15, skeleton_warrior:40`); `getMobExp(templateId): number` (0 si no está).
  - `interface Leveled { exp:number; level:number; maxHp:number; maxMp:number; pAtk:number; pDef:number; hp:number; mp:number }`
  - `gainExp(p: Leveled, amount: number): number` — suma EXP, sube de nivel en loop (`while exp >= expToNextLevel(level)`), aplica `LEVEL_GROWTH` por nivel, rellena hp/mp al subir; devuelve niveles ganados.
  - Protocolo: `MessageType.LevelUp = "levelUp"`; `interface LevelUpEvent { level: number }`.

- [ ] **Step 1: Escribir el test que falla (`progression.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { expToNextLevel, gainExp, getMobExp, LEVEL_GROWTH, type Leveled } from "./progression.js";

function p(over: Partial<Leveled> = {}): Leveled {
  return { exp: 0, level: 1, maxHp: 100, maxMp: 50, pAtk: 15, pDef: 10, hp: 100, mp: 50, ...over };
}

describe("expToNextLevel", () => {
  it("crece con el nivel", () => {
    expect(expToNextLevel(1)).toBe(100);
    expect(expToNextLevel(2)).toBeGreaterThan(expToNextLevel(1));
  });
});

describe("gainExp", () => {
  it("acumula EXP sin subir si no alcanza", () => {
    const q = p(); const lvls = gainExp(q, 50);
    expect(lvls).toBe(0); expect(q.level).toBe(1); expect(q.exp).toBe(50);
  });
  it("sube un nivel y aplica crecimiento + rellena hp/mp", () => {
    const q = p({ hp: 10, mp: 5 });
    const lvls = gainExp(q, 100);
    expect(lvls).toBe(1); expect(q.level).toBe(2);
    expect(q.exp).toBe(0);
    expect(q.maxHp).toBe(100 + LEVEL_GROWTH.hp);
    expect(q.pAtk).toBe(15 + LEVEL_GROWTH.pAtk);
    expect(q.hp).toBe(q.maxHp); expect(q.mp).toBe(q.maxMp); // refill
  });
  it("sube varios niveles de un golpe con el remanente correcto", () => {
    const q = p();
    const lvls = gainExp(q, expToNextLevel(1) + expToNextLevel(2) + 10);
    expect(lvls).toBe(2); expect(q.level).toBe(3); expect(q.exp).toBe(10);
  });
});

describe("getMobExp", () => {
  it("devuelve EXP por template y 0 si falta", () => {
    expect(getMobExp("skeleton_minion")).toBe(15);
    expect(getMobExp("skeleton_warrior")).toBe(40);
    expect(getMobExp("dragon")).toBe(0);
  });
});
```

- [ ] **Step 2: Correr → FAIL.** `npm test --workspace @aden/shared`.

- [ ] **Step 3: Implementar `shared/src/progression.ts`**

```ts
export const EXP_BASE = 100;
export const EXP_POW = 1.5;

export function expToNextLevel(level: number): number {
  return Math.round(EXP_BASE * Math.pow(level, EXP_POW));
}

export const LEVEL_GROWTH = { hp: 20, mp: 5, pAtk: 3, pDef: 2 } as const;

export const MOB_EXP: Record<string, number> = {
  skeleton_minion: 15,
  skeleton_warrior: 40,
};
export function getMobExp(templateId: string): number {
  return MOB_EXP[templateId] ?? 0;
}

export interface Leveled {
  exp: number;
  level: number;
  maxHp: number;
  maxMp: number;
  pAtk: number;
  pDef: number;
  hp: number;
  mp: number;
}

export function gainExp(p: Leveled, amount: number): number {
  p.exp += amount;
  let gained = 0;
  while (p.exp >= expToNextLevel(p.level)) {
    p.exp -= expToNextLevel(p.level);
    p.level += 1;
    p.maxHp += LEVEL_GROWTH.hp;
    p.maxMp += LEVEL_GROWTH.mp;
    p.pAtk += LEVEL_GROWTH.pAtk;
    p.pDef += LEVEL_GROWTH.pDef;
    gained += 1;
  }
  if (gained > 0) {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  return gained;
}
```

- [ ] **Step 4: Protocolo** — `MessageType.LevelUp = "levelUp"`; `interface LevelUpEvent { level: number }`. Y `index.ts`: `export * from "./progression.js";`.

- [ ] **Step 5: Correr → PASS.**

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat(shared): curva de EXP, crecimiento por nivel y gainExp"
```

---

### Task 2: Server — exp/level en PlayerState

**Files:** Modify: `server/src/state/PlayerState.ts`

- `PlayerState` agrega `@type("number") exp = 0` y `@type("number") level = 1`.

- [ ] **Step 1:** Agregar los dos campos (`@type`, sincronizados; el cliente los muestra).
- [ ] **Step 2:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes).
- [ ] **Step 3: Commit**
```bash
git add server/
git commit -m "feat(server): exp y level en PlayerState"
```

---

### Task 3: Server — otorgar EXP + subir nivel al matar mobs

**Files:** Modify: `server/src/rooms/GameRoom.ts`

- [ ] **Step 1: Init en `onJoin`** — `player.exp = 0; player.level = 1`.
- [ ] **Step 2: Helper `killMob(mob, mobId, killer?)`** — centraliza la muerte del mob (hoy duplicada entre auto-attack y useSkill):
```ts
private killMob(mob: MobState, mobId: string, killer?: PlayerState) {
  mob.dead = true;
  mob.moving = false;
  mob.respawnMs = MOB_RESPAWN_MS;
  this.broadcast(MessageType.Death, { entityId: mobId });
  if (killer && !killer.dead) {
    const lvls = gainExp(killer, getMobExp(mob.templateId));
    if (lvls > 0) {
      // gainExp ya subió level/stats/refill; avisar al cliente del killer
      const client = this.clients.find((c) => c.sessionId === /* killer sessionId */);
      // Nota: para dirigir el mensaje al killer, guardar su sessionId. Si es
      // más simple, broadcastear LevelUp{level} y que cada cliente compare con
      // su propio sessionId — pero LevelUp no lleva id; preferible enviar al
      // client puntual. Resolver con el patrón que ya use el proyecto para
      // clients: `this.clients` + comparar sessionId.
    }
  }
}
```
Nota de implementación: para enviar `LevelUp` SOLO al killer, resolver su `Client` por sessionId (guardar el sessionId del killer al llamar `killMob`, o pasar `killerId`). `gainExp` es de `@aden/shared` y opera sobre el `PlayerState` (que estructuralmente satisface `Leveled` — tiene exp/level/maxHp/maxMp/pAtk/pDef/hp/mp). Ajustar la firma a `killMob(mob, mobId, killerId?: string)` y adentro `const killer = killerId ? this.state.players.get(killerId) : undefined` y `const client = killerId ? this.clients.find(c => c.sessionId===killerId) : undefined; client?.send(MessageType.LevelUp, { level: killer.level })`.
- [ ] **Step 3: Usar `killMob` en los dos death paths** — en el auto-attack loop (killerId = el sessionId del jugador atacante) y en `useSkill` (killerId = client.sessionId). Reemplazar el bloque inline `mob.dead=... broadcast(Death...)` por `this.killMob(mob, p.targetId, <killerId>)`.
- [ ] **Step 4:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes; el GameRoom test sigue). Boot OK.
- [ ] **Step 5: Commit**
```bash
git add server/
git commit -m "feat(server): EXP y subida de nivel al matar mobs (killMob)"
```

---

### Task 4: Client — HUD de nivel + barra de EXP + aviso de level up

**Files:** Modify: `client/src/render/Hud.ts`, `client/src/net/NetworkClient.ts`, `client/src/main.ts`

- [ ] **Step 1: `Hud`** — agregar al overlay: un texto "Nv. {level}" y una barra de EXP (relleno = `exp / expToNextLevel(level)`, usando `expToNextLevel` de `@aden/shared`). Extender `update(...)` para recibir `exp` y `level` (o un objeto). Guarda divide-by-zero.
- [ ] **Step 2: `Hud.flashLevelUp(level)`** — muestra un cartel temporal "¡Subiste a nivel {level}!" ~2s.
- [ ] **Step 3: `NetworkClient`** — `getSelf()` expone `exp` y `level`; suscribir `room.onMessage(MessageType.LevelUp, (ev) => cb.onLevelUp(ev.level))` con un callback.
- [ ] **Step 4: `main.ts`** — pasar `exp`/`level` al `hud.update` cada frame; en `onLevelUp(level)` llamar `hud.flashLevelUp(level)`.
- [ ] **Step 5:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 6: Smoke** (`npm run dev`): matar mobs sube la barra de EXP; al acumular suficiente, sube el nivel (el número cambia, HP/MP máximos suben, aparece el cartel). Verificar por estado/DOM lo observable.
- [ ] **Step 7: Commit**
```bash
git add client/src
git commit -m "feat(client): HUD de nivel y barra de EXP + aviso de level up"
```

---

### Task 5: Verificación E2E (controller)

- [ ] **Step 1: Script 2 clientes** — A mata mobs (acercándose + setTarget/useSkill); verificar por estado (visto por A y B): `A.exp` sube al matar; tras acumular ≥ `expToNextLevel(1)`, `A.level` pasa a 2, su `maxHp`/`pAtk` crecen y `hp` se rellena. Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — carga sin errores; llega el mensaje `levelUp`. (Visual del HUD queda para el usuario.)

---

## Self-Review (cobertura vs spec)

- **EXP al matar mobs (spec §4):** Tasks 1,3 (getMobExp + killMob otorga EXP al killer).
- **Curva de EXP estilo L2 (spec §4):** Task 1 (`expToNextLevel`, testeada).
- **Subida de nivel: stats suben (spec §4):** Task 1 (`gainExp` + `LEVEL_GROWTH`), Task 2 (campos), Task 3 (aplicado sobre PlayerState).
- **Feedback (nivel + barra EXP):** Task 4 (HUD + evento levelUp).
- **Server autoritativo:** EXP/nivel/stats 100% server; cliente muestra estado + escucha `levelUp`.
- **Fuera de alcance:** loot/inventario (Etapa 3b), persistencia (Supabase, diferida), penalización de EXP por muerte (campo listo, no activada).

**Placeholder scan:** el código con lógica está completo; los steps de wiring describen el cambio con precisión (incluida la nota de cómo dirigir `LevelUp` al killer por sessionId).
**Type consistency:** `Leveled` (shared) es estructuralmente satisfecho por `PlayerState` (exp/level/maxHp/maxMp/pAtk/pDef/hp/mp); `getMobExp`/`expToNextLevel`/`LevelUpEvent` compartidos cliente/servidor.
