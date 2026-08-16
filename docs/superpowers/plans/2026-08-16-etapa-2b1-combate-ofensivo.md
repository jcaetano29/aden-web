# Etapa 2b-1 — Combate ofensivo (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El jugador puede seleccionar un mob como objetivo y auto-atacarlo (server-autoritativo, por timer de velocidad de ataque). El daño se calcula con una fórmula estilo L2. Los mobs tienen HP; al llegar a 0 mueren (animación de muerte) y respawnean tras un timer en su zona con HP full. El cliente muestra barras de HP sobre los mobs, números de daño flotantes, resalta el objetivo y reproduce la animación de ataque. Los mobs NO contraatacan todavía (eso es Etapa 2b-2).

**Architecture:** Sobre la base autoritativa de E2a. Nuevo mensaje `setTarget` (cliente→servidor). `PlayerState`/`MobState` suman campos de combate (hp, stats, target). Un `CombatSystem` puro decide cuándo un atacante puede pegar (rango + cooldown + objetivo vivo) y `computeDamage` (puro, en shared) calcula el daño. El `GameRoom` tick resuelve el auto-attack del jugador y programa muerte/respawn de mobs; emite eventos `damage`/`death` por mensajes de Colyseus. El cliente escucha esos eventos y el estado sincronizado para HUD/feedback. La lógica de combate es pura y testeable; el render/HUD es I/O verificado por smoke test.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js 0.160, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§4 Combate)

## Global Constraints

- ESM, `strict: true`. TDD en toda la lógica pura (shared formula + CombatSystem).
- Server autoritativo: el cliente solo manda intención (`moveTo`, `setTarget`); el servidor decide daño, muerte y respawn. El cliente nunca calcula HP ni resultados.
- Tick 15 Hz existente. Cooldowns de ataque en ms, descontados por `dt*1000` en el tick.
- Fórmula de daño (pura, en `shared`): `computeDamage(pAtk, pDef, factor, variance) = max(1, round(pAtk * factor * (100 / (100 + pDef)) * variance))`. `variance ∈ [0.9,1.1]` (server, RNG inyectable en tests).
- Stats (rulings, en shared): Jugador `maxHp 100, pAtk 15, pDef 10, attackCooldownMs 1500, attackRange 2.5`. `skeleton_minion`: `maxHp 30, pAtk 8, pDef 5, attackCooldownMs 2000`. `skeleton_warrior`: `maxHp 60, pAtk 14, pDef 12, attackCooldownMs 1800`. `MOB_RESPAWN_MS 5000`, `ATTACK_RANGE 2.5`.
- En 2b-1 los mobs NO atacan (sin daño al jugador, sin HP de jugador consumible). El jugador no muere. Eso es 2b-2.
- No romper E0/E1/E2a. Reusar `MobState`/`PlayerState` existentes (extender), `advanceMovable`, `CharacterView`, el pipeline de mobs.

---

## File Structure

```
shared/src/combat.ts              (NUEVO) computeDamage, COMBAT config (stats jugador/mobs, ATTACK_RANGE, MOB_RESPAWN_MS), getMobCombat(templateId)
shared/src/combat.test.ts         (NUEVO)
shared/src/protocol.ts            (MODIFICAR) MessageType.SetTarget + SetTargetMessage; eventos servidor→cliente DamageEvent/DeathEvent (tipos)
shared/src/index.ts               (MODIFICAR) export combat

server/src/state/PlayerState.ts   (MODIFICAR) hp,maxHp,pAtk,pDef (@type) + targetId(@type) + attackCooldownMs (plano)
server/src/state/MobState.ts      (MODIFICAR) hp,maxHp,pAtk,pDef,dead (@type) + attackCooldownMs,respawnMs (planos)
server/src/systems/CombatSystem.ts       (NUEVO) canAttack(attacker, target, rangeCfg), applyAttack(...) usando computeDamage
server/src/systems/CombatSystem.test.ts  (NUEVO)
server/src/rooms/GameRoom.ts      (MODIFICAR) init stats al spawnear/join; handler setTarget; tick: auto-attack del jugador; muerte→respawn de mobs; broadcast de damage/death

client/src/net/NetworkClient.ts   (MODIFICAR) sendSetTarget; exponer hp/dead en snapshots; onDamage/onDeath (room.onMessage)
client/src/input/InputController.ts (MODIFICAR) click sobre un mob → setTarget (raycast a meshes de mobs) vs click en suelo → moveTo
client/src/render/EntityViews.ts  (MODIFICAR) resaltar target; barra de HP sobre mobs; ocultar/mostrar en muerte/respawn; disparar animación de ataque/hit
client/src/render/HealthBar.ts    (NUEVO) barra de HP billboard (CSS2D o sprite) sobre una entidad
client/src/render/DamageNumbers.ts(NUEVO) números de daño flotantes (CSS2D) que suben y se desvanecen
client/src/main.ts                (MODIFICAR) wire de setTarget, onDamage/onDeath, update de HUD
```

**Decomposición:** `computeDamage` y `CombatSystem.canAttack` son puros y testeables sin Colyseus. El resto (state, wiring, HUD) es integración verificada por smoke test + E2E.

---

### Task 1: Shared — fórmula de daño, config de combate y protocolo (puro, TDD)

**Files:**
- Create: `shared/src/combat.ts`, `shared/src/combat.test.ts`
- Modify: `shared/src/protocol.ts`, `shared/src/index.ts`

**Interfaces:**
- Produces:
  - `computeDamage(pAtk: number, pDef: number, factor: number, variance: number): number` — `max(1, round(pAtk*factor*(100/(100+pDef))*variance))`.
  - `interface CombatStats { maxHp: number; pAtk: number; pDef: number; attackCooldownMs: number }`.
  - `PLAYER_COMBAT: CombatStats` (maxHp 100, pAtk 15, pDef 10, attackCooldownMs 1500).
  - `MOB_COMBAT: Record<string, CombatStats>` para `skeleton_minion` (30/8/5/2000) y `skeleton_warrior` (60/14/12/1800); `getMobCombat(templateId): CombatStats` (lanza si falta).
  - `ATTACK_RANGE = 2.5`, `MOB_RESPAWN_MS = 5000`.
  - Protocolo: `MessageType.SetTarget = "setTarget"`; `interface SetTargetMessage { targetId: string }`; `MessageType.Damage = "damage"`, `MessageType.Death = "death"`; `interface DamageEvent { targetId: string; amount: number; hp: number }`, `interface DeathEvent { entityId: string }`.

- [ ] **Step 1: Escribir el test que falla (`shared/src/combat.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { computeDamage, PLAYER_COMBAT, getMobCombat, ATTACK_RANGE } from "./combat.js";

describe("computeDamage", () => {
  it("baja con más pDef y sube con más pAtk/factor", () => {
    const low = computeDamage(15, 50, 1, 1);
    const high = computeDamage(15, 5, 1, 1);
    expect(high).toBeGreaterThan(low);
  });
  it("nunca es menor a 1", () => {
    expect(computeDamage(1, 1000, 1, 0.9)).toBeGreaterThanOrEqual(1);
  });
  it("es determinístico con variance fija y devuelve entero", () => {
    const d = computeDamage(15, 10, 1, 1);
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBe(Math.round(15 * 1 * (100 / 110) * 1));
  });
  it("Power Strike (factor mayor) pega más que auto-attack", () => {
    expect(computeDamage(15, 10, 2.5, 1)).toBeGreaterThan(computeDamage(15, 10, 1, 1));
  });
});

describe("config", () => {
  it("PLAYER_COMBAT y mobs tienen valores esperados", () => {
    expect(PLAYER_COMBAT.maxHp).toBe(100);
    expect(getMobCombat("skeleton_minion").maxHp).toBe(30);
    expect(getMobCombat("skeleton_warrior").pDef).toBe(12);
    expect(ATTACK_RANGE).toBe(2.5);
  });
  it("getMobCombat lanza para template desconocido", () => {
    expect(() => getMobCombat("dragon")).toThrow();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla** — `npm test --workspace @aden/shared` → FAIL (no existe `./combat.js`).

- [ ] **Step 3: Implementar `shared/src/combat.ts`**

```ts
export function computeDamage(pAtk: number, pDef: number, factor: number, variance: number): number {
  const raw = pAtk * factor * (100 / (100 + pDef)) * variance;
  return Math.max(1, Math.round(raw));
}

export interface CombatStats {
  maxHp: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
}

export const PLAYER_COMBAT: CombatStats = { maxHp: 100, pAtk: 15, pDef: 10, attackCooldownMs: 1500 };

export const MOB_COMBAT: Record<string, CombatStats> = {
  skeleton_minion: { maxHp: 30, pAtk: 8, pDef: 5, attackCooldownMs: 2000 },
  skeleton_warrior: { maxHp: 60, pAtk: 14, pDef: 12, attackCooldownMs: 1800 },
};

export function getMobCombat(templateId: string): CombatStats {
  const c = MOB_COMBAT[templateId];
  if (!c) throw new Error(`getMobCombat: sin stats para ${templateId}`);
  return c;
}

export const ATTACK_RANGE = 2.5;
export const MOB_RESPAWN_MS = 5000;
```

- [ ] **Step 4: Modificar `shared/src/protocol.ts`** — agregar:

```ts
// añadir a MessageType:
//   SetTarget: "setTarget", Damage: "damage", Death: "death"
export interface SetTargetMessage { targetId: string }
export interface DamageEvent { targetId: string; amount: number; hp: number }
export interface DeathEvent { entityId: string }
```
(Extender el objeto `MessageType` existente con `SetTarget`, `Damage`, `Death` sin romper `MoveTo`.)

- [ ] **Step 5: Modificar `shared/src/index.ts`** — `export * from "./combat.js";` (protocol ya se exporta).

- [ ] **Step 6: Correr y verificar que pasa** — `npm test --workspace @aden/shared` → PASS.

- [ ] **Step 7: Commit**

```bash
git add shared/
git commit -m "feat(shared): fórmula de daño, config de combate y protocolo setTarget/damage/death"
```

---

### Task 2: Server — campos de combate en PlayerState y MobState

**Files:**
- Modify: `server/src/state/PlayerState.ts`, `server/src/state/MobState.ts`

**Interfaces:**
- `PlayerState` agrega `@type("number") hp, maxHp, pAtk, pDef` y `@type("string") targetId = ""`; plano: `attackCooldownMs = 0`.
- `MobState` agrega `@type("number") hp, maxHp, pAtk, pDef` y `@type("boolean") dead = false`; plano: `attackCooldownMs = 0`, `respawnMs = 0`.

- [ ] **Step 1: Modificar `PlayerState.ts`** — agregar los campos `@type` (hp, maxHp, pAtk, pDef, targetId) y el plano `attackCooldownMs`. Defaults 0 (se setean al join desde `PLAYER_COMBAT`).

- [ ] **Step 2: Modificar `MobState.ts`** — agregar `@type` (hp, maxHp, pAtk, pDef, dead) y planos `attackCooldownMs`, `respawnMs`.

- [ ] **Step 3: Typecheck + tests** — `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (los tests previos siguen verdes).

- [ ] **Step 4: Commit**

```bash
git add server/
git commit -m "feat(server): campos de combate en PlayerState y MobState"
```

---

### Task 3: Server — CombatSystem (puro, TDD)

**Files:**
- Create: `server/src/systems/CombatSystem.ts`, `server/src/systems/CombatSystem.test.ts`

**Interfaces:**
- Consumes: `computeDamage`, `ATTACK_RANGE` de `@aden/shared`; `distance2D`.
- Produces:
  - `interface Combatant { x:number; z:number; hp:number; pAtk:number; pDef:number; attackCooldownMs:number }`
  - `canAttack(attacker: Combatant, target: { x:number; z:number; hp:number; dead?:boolean }, range: number): boolean` — true si el cooldown del atacante llegó a 0, el objetivo está vivo (hp>0 y no dead) y dentro de `range`.
  - `resolveAttack(attacker: Combatant, target: { hp:number; pDef:number }, factor: number, variance: number, cooldownMs: number): number` — aplica daño: calcula con `computeDamage(attacker.pAtk, target.pDef, factor, variance)`, resta a `target.hp` (clamp a 0), resetea `attacker.attackCooldownMs = cooldownMs`, y devuelve el daño aplicado.
  - `tickCooldown(c: { attackCooldownMs:number }, dtMs: number): void` — descuenta el cooldown hasta 0.

- [ ] **Step 1: Escribir el test que falla (`server/src/systems/CombatSystem.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { canAttack, resolveAttack, tickCooldown, type Combatant } from "./CombatSystem.js";
import { ATTACK_RANGE } from "@aden/shared";

function atk(over: Partial<Combatant> = {}): Combatant {
  return { x: 0, z: 0, hp: 100, pAtk: 15, pDef: 10, attackCooldownMs: 0, ...over };
}

describe("canAttack", () => {
  it("true en rango, objetivo vivo y cooldown listo", () => {
    expect(canAttack(atk(), { x: 1, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(true);
  });
  it("false fuera de rango", () => {
    expect(canAttack(atk(), { x: 100, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(false);
  });
  it("false si el cooldown no llegó a 0", () => {
    expect(canAttack(atk({ attackCooldownMs: 500 }), { x: 1, z: 0, hp: 30 }, ATTACK_RANGE)).toBe(false);
  });
  it("false si el objetivo está muerto", () => {
    expect(canAttack(atk(), { x: 1, z: 0, hp: 0 }, ATTACK_RANGE)).toBe(false);
    expect(canAttack(atk(), { x: 1, z: 0, hp: 30, dead: true }, ATTACK_RANGE)).toBe(false);
  });
});

describe("resolveAttack", () => {
  it("aplica daño, resetea cooldown y devuelve el daño", () => {
    const a = atk();
    const t = { hp: 30, pDef: 5 };
    const dmg = resolveAttack(a, t, 1, 1, 1500);
    expect(dmg).toBeGreaterThan(0);
    expect(t.hp).toBe(30 - dmg);
    expect(a.attackCooldownMs).toBe(1500);
  });
  it("no baja el hp por debajo de 0", () => {
    const t = { hp: 5, pDef: 0 };
    resolveAttack(atk({ pAtk: 999 }), t, 1, 1, 1500);
    expect(t.hp).toBe(0);
  });
});

describe("tickCooldown", () => {
  it("descuenta hasta 0 sin pasarse", () => {
    const c = { attackCooldownMs: 100 };
    tickCooldown(c, 66);
    expect(c.attackCooldownMs).toBeCloseTo(34);
    tickCooldown(c, 100);
    expect(c.attackCooldownMs).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla** — `npm test --workspace @aden/server` → FAIL.

- [ ] **Step 3: Implementar `server/src/systems/CombatSystem.ts`**

```ts
import { computeDamage, distance2D } from "@aden/shared";

export interface Combatant {
  x: number;
  z: number;
  hp: number;
  pAtk: number;
  pDef: number;
  attackCooldownMs: number;
}

export function canAttack(
  attacker: Combatant,
  target: { x: number; z: number; hp: number; dead?: boolean },
  range: number,
): boolean {
  if (attacker.attackCooldownMs > 0) return false;
  if (target.hp <= 0 || target.dead) return false;
  return distance2D(attacker.x, attacker.z, target.x, target.z) <= range;
}

export function resolveAttack(
  attacker: Combatant,
  target: { hp: number; pDef: number },
  factor: number,
  variance: number,
  cooldownMs: number,
): number {
  const dmg = computeDamage(attacker.pAtk, target.pDef, factor, variance);
  target.hp = Math.max(0, target.hp - dmg);
  attacker.attackCooldownMs = cooldownMs;
  return dmg;
}

export function tickCooldown(c: { attackCooldownMs: number }, dtMs: number): void {
  if (c.attackCooldownMs > 0) c.attackCooldownMs = Math.max(0, c.attackCooldownMs - dtMs);
}
```

- [ ] **Step 4: Correr y verificar que pasa** — `npm test --workspace @aden/server` → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): CombatSystem (canAttack/resolveAttack/tickCooldown)"
```

---

### Task 4: Server — wiring de combate en GameRoom (init stats, setTarget, tick de ataque, muerte/respawn)

**Files:**
- Modify: `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `CombatSystem` (Task 3); `PLAYER_COMBAT`, `getMobCombat`, `ATTACK_RANGE`, `MOB_RESPAWN_MS`, `MessageType`, `SetTargetMessage`, `getTemplate` de `@aden/shared`; `SpawnSystem`/`MobAISystem` existentes.
- Produces: comportamiento server-autoritativo de combate ofensivo. Sin nuevas interfaces exportadas.

- [ ] **Step 1: Inicializar stats de combate**
  - En `onJoin`: setear `player.hp = player.maxHp = PLAYER_COMBAT.maxHp; player.pAtk = PLAYER_COMBAT.pAtk; player.pDef = PLAYER_COMBAT.pDef; player.attackCooldownMs = 0; player.targetId = ""`.
  - Al spawnear cada mob (onCreate) y en cada respawn: `const c = getMobCombat(s.templateId); mob.hp = mob.maxHp = c.hp... ` (pAtk/pDef/maxHp/hp), `mob.dead = false`, `mob.attackCooldownMs = 0`. (Refactorizar el spawn de mob a un helper `spawnMob(id, templateId, x, z)` reutilizable por onCreate y respawn.)

- [ ] **Step 2: Handler `setTarget`**
```ts
this.onMessage(MessageType.SetTarget, (client, msg: SetTargetMessage) => {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;
  // objetivo válido: un mob existente y vivo, o "" para limpiar
  if (msg.targetId === "" || (this.state.mobs.has(msg.targetId) && !this.state.mobs.get(msg.targetId)!.dead)) {
    player.targetId = msg.targetId;
  }
});
```

- [ ] **Step 3: Tick — auto-attack del jugador + cooldowns + muerte/respawn**
  En `tick(dt)` (dt seg; `dtMs = dt*1000`), tras mover players y correr IA/mover mobs:
```ts
// cooldowns de jugadores
this.state.players.forEach((p) => tickCooldown(p, dtMs));
// auto-attack del jugador sobre su target
this.state.players.forEach((p) => {
  if (!p.targetId) return;
  const mob = this.state.mobs.get(p.targetId);
  if (!mob || mob.dead) { p.targetId = ""; return; }
  if (canAttack(p, mob, ATTACK_RANGE)) {
    const variance = 0.9 + Math.random() * 0.2;
    const dmg = resolveAttack(p, mob, 1, variance, PLAYER_COMBAT.attackCooldownMs);
    this.broadcast(MessageType.Damage, { targetId: p.targetId, amount: dmg, hp: mob.hp });
    if (mob.hp <= 0) {
      mob.dead = true;
      mob.moving = false;
      mob.respawnMs = MOB_RESPAWN_MS;
      this.broadcast(MessageType.Death, { entityId: p.targetId });
    }
  }
});
// cooldowns/respawn de mobs
this.state.mobs.forEach((mob, id) => {
  tickCooldown(mob, dtMs);
  if (mob.dead) {
    mob.respawnMs -= dtMs;
    if (mob.respawnMs <= 0) {
      const c = getMobCombat(mob.templateId);
      mob.hp = mob.maxHp = c.maxHp; mob.dead = false;
      mob.x = mob.homeX; mob.z = mob.homeZ; mob.targetX = mob.homeX; mob.targetZ = mob.homeZ;
      mob.moving = false; mob.aiState = "wander"; mob.aggroTargetId = ""; mob.wanderCooldownMs = 0;
    }
  }
});
```
  Además: en el loop de IA de mobs, saltear los `dead` (un mob muerto no deambula/persigue). Guardar: `if (mob.dead) return;` al inicio del `forEach` de `stepMobAI`/`advanceMovable`.

- [ ] **Step 4: Typecheck + tests + boot** — `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server`; arrancar `npm run dev:server` y confirmar boot sin crash.

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): auto-attack del jugador, daño autoritativo y muerte/respawn de mobs"
```

---

### Task 5: Client — selección de objetivo (targeting)

**Files:**
- Modify: `client/src/net/NetworkClient.ts`, `client/src/input/InputController.ts`, `client/src/render/EntityViews.ts`, `client/src/render/Renderer.ts`, `client/src/main.ts`

**Interfaces:**
- `NetworkClient`: `sendSetTarget(targetId: string)` (envía `MessageType.SetTarget`). Snapshot de mob incluye `hp`, `maxHp`, `dead`.
- `InputController`: en el click, primero raycast contra los meshes de mobs; si pega uno → `onPickMob(mobId)`; si no → comportamiento actual (moveTo al suelo).
- `EntityViews`: `setTargetHighlight(mobId | null)` (anillo/emisivo sobre el mob objetivo); expone un método para obtener los objetos de mobs raycasteables y mapear mesh→mobId.

- [ ] **Step 1: `Renderer.pickMobs`** — método que raycastea contra una lista de objetos de mobs y devuelve el `mobId` del más cercano o null (recibe un `Map<Object3D, string>` o similar desde EntityViews).

- [ ] **Step 2: `EntityViews`** — mantener un mapa `mesh(root)→mobId`; `raycastTargets(): {objects: Object3D[], idOf: (o)=>string}`; `setTargetHighlight(mobId|null)` que pone un anillo/color emisivo bajo/rodeando el mob objetivo y lo saca del anterior.

- [ ] **Step 3: `InputController`** — en el handler de click: computa NDC, primero `renderer.pickMobs(...)`; si hay mob → `this.onPickMob(mobId)`; si no → `pickGround` → `onMove` (como ahora). Constructor recibe callbacks `onMove` y `onPickMob`.

- [ ] **Step 4: `main.ts` / `NetworkClient`** — `onPickMob: (id) => { net.sendSetTarget(id); views.setTargetHighlight(id); }`. Al recibir `death` de ese target o cambiar, limpiar highlight.

- [ ] **Step 5: Typecheck + build** — `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.

- [ ] **Step 6: Smoke test** — click sobre un esqueleto lo marca como objetivo (resaltado) y el server registra `player.targetId` (verificable por estado). Consola limpia.

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): selección de objetivo (click en mob → setTarget + resaltado)"
```

---

### Task 6: Client — barras de HP, números de daño y animación de ataque/muerte

**Files:**
- Create: `client/src/render/HealthBar.ts`, `client/src/render/DamageNumbers.ts`
- Modify: `client/src/render/EntityViews.ts`, `client/src/render/CharacterView.ts`, `client/src/net/NetworkClient.ts`, `client/src/main.ts`

**Interfaces:**
- `HealthBar` (CSS2D): `attach(parent, getRatio)` muestra una barra sobre la entidad; `update()` refleja hp/maxHp; `remove()`.
- `DamageNumbers` (CSS2D): `spawn(worldPos, amount)` crea un número que sube y se desvanece (se auto-remueve).
- `CharacterView`: `playOnce(clipName)` para reproducir una animación no-loop (ataque/hit/muerte) y volver a idle/walk.
- `EntityViews`: barra de HP sobre cada mob (update en `updateMob`); en `onDeath` reproducir animación de muerte y ocultar; en respawn (hp vuelve, dead=false) mostrar de nuevo.

- [ ] **Step 1: `HealthBar.ts`** (CSS2D) — div con fondo + relleno proporcional a `hp/maxHp`, color verde→rojo; posición ~y=2.6 sobre el mob.

- [ ] **Step 2: `DamageNumbers.ts`** (CSS2D) — `spawn(worldPos, amount)`: crea un `CSS2DObject` con el número, lo anima subiendo (via requestAnimationFrame o registrando en el update loop) y lo remueve a ~800ms.

- [ ] **Step 3: `CharacterView.playOnce`** — reproduce un clip una vez (`selectClip`-style por nombre "attack"/"hit"/"death"; usar coincidencia por substring del pool de 90+ clips), con `LoopOnce`, `clampWhenFinished`, y al terminar volver a idle/walk según `moving`.

- [ ] **Step 4: `EntityViews`** — crear `HealthBar` por mob en `addMob`; en `updateMob` refrescar ratio; al recibir daño (evento) hacer `playOnce("hit")` en el mob; en muerte `playOnce("death")` + ocultar barra + (opcional) fade; en respawn restaurar. Reproducir `playOnce("attack")` en el jugador atacante cuando pega (a partir del evento damage cuyo atacante es el self, o inferido).

- [ ] **Step 5: `NetworkClient` / `main.ts`** — suscribir `room.onMessage(MessageType.Damage, ...)` y `Death`; enrutar a EntityViews: `onDamage(ev) => { views.onMobDamage(ev.targetId, ev.amount); damageNumbers.spawn(worldPosOf(ev.targetId), ev.amount); }`, `onDeath(ev) => views.onMobDeath(ev.entityId)`. Actualizar `DamageNumbers` en el render loop.

- [ ] **Step 6: Typecheck + build + smoke** — `npx tsc --noEmit`; `npm run build`; `npm run dev`, seleccionar un esqueleto y confirmar (introspección/DOM + lo que sea observable): la barra de HP baja, aparecen números de daño, el mob muere (dead=true) y respawnea a los ~5s. Consola limpia.

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "feat(client): barras de HP, números de daño y animaciones de combate"
```

---

### Task 7: Verificación E2E (controller)

**Files:** ninguno.

- [ ] **Step 1: Script de 2 clientes** — levantar server; cliente A se acerca a un mob, manda `setTarget(mobId)` y `moveTo` para quedar en rango; verificar por estado (visto por B también): el `hp` del mob baja tick a tick, llega a 0, `dead` pasa a true, y tras `MOB_RESPAWN_MS` el mob vuelve con `hp==maxHp` y `dead==false` en su home. Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — confirmar (network/console) que carga sin errores y que los mensajes `damage`/`death` llegan. (Visual —barras, números, animación de muerte— queda para el usuario en local.)

---

## Self-Review (cobertura vs spec)

- **Target-based combat / auto-attack (spec §4 Combate):** Tasks 1,3,4 (setTarget + canAttack + auto-attack en el tick).
- **Fórmula de daño estilo L2 (spec §4):** Task 1 (`computeDamage`, testeada).
- **Mobs con HP, muerte y respawn (spec §4 Mobs):** Tasks 2,4 (HP en MobState; muerte→respawn en el tick).
- **Feedback visual (barras/números/animación):** Tasks 5,6 (targeting, HealthBar, DamageNumbers, playOnce).
- **Server autoritativo:** el cliente solo manda `setTarget`/`moveTo`; daño/muerte/respawn 100% server; eventos `damage`/`death` son broadcast del server.
- **Fuera de alcance (Etapa 2b-2):** mobs que atacan al jugador, HP/MP del jugador consumibles, muerte/respawn del jugador, Power Strike, HUD de self. NO se implementan aquí. EXP/loot son Etapa 3.

**Placeholder scan:** sin TBD/TODO; el código de cada step con lógica está completo (los steps de integración describen el cambio con precisión).
**Type consistency:** `Combatant` (CombatSystem) ↔ campos de `PlayerState`/`MobState`; `computeDamage`/`ATTACK_RANGE`/`MOB_RESPAWN_MS`/`getMobCombat` de shared usados por server; `SetTargetMessage`/`DamageEvent`/`DeathEvent` compartidos cliente/servidor vía protocol.
