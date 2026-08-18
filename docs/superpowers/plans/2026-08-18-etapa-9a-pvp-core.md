# Etapa 9a — PvP core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los jugadores se puedan pegar entre sí fuera del pueblo, con muerte PvP que cuesta oro/exp y suma kills al asesino.

**Architecture:** Se generaliza el targeting: `SetTarget` y el motor de daño (ya usados para mobs) aceptan también un `sessionId` de jugador. Un helper `resolveTarget` distingue mob de jugador. La zona segura (`SAFE_RADIUS` alrededor de `TOWN`) desactiva el PvP: un golpe entre jugadores solo conecta si **ambos** están afuera. La muerte PvP reusa el loop de respawn existente y aplica una penalidad pura y testeable calculada en shared.

**Tech Stack:** TypeScript monorepo (npm workspaces), Colyseus 0.15 (Schema/@type), Three.js client, vitest, @colyseus/testing (E2E), Supabase (persistencia).

**Spec:** `docs/superpowers/specs/2026-08-18-arco-competitivo-pvp-guilds-boss-design.md`

## Global Constraints

- Campos sincronizados al cliente van con `@type(...)`; los server-only van SIN `@type` (patrón de `PlayerState.ts`).
- Verificación estricta obligatoria: `npx tsc -p <ws>/tsconfig.json --noEmit` en shared/server/client debe quedar limpio, además de los tests. `client/tsconfig.json` ya tiene `noEmit`.
- 0 artefactos generados por la verificación (no debe quedar `dist/` ni `.js` sueltos en `src/`).
- Este plan cubre SOLO 9a. Guilds, boss contestado y leaderboard son sub-etapas posteriores.
- El daño se resuelve con `resolveAttack`/`computeDamage` existentes; no se reescribe el motor.
- Los ataques de jugador siguen instantáneos (sin wind-up): el telegraph es solo de mobs.

---

### Task 1: shared — módulo PvP (constantes + penalidad de muerte)

**Files:**
- Create: `shared/src/pvp.ts`
- Modify: `shared/src/index.ts` (re-export del nuevo módulo)
- Test: `shared/src/pvp.test.ts`

**Interfaces:**
- Produces:
  - `export const PVP_GOLD_LOSS_PCT = 0.10;`
  - `export const PVP_EXP_LOSS_PCT = 0.05;`
  - `export function applyPvpDeathPenalty(gold: number, exp: number, level: number): { gold: number; exp: number }` — devuelve el oro y la exp ya penalizados (exp con piso en 0, sin delevel).
- Consumes: `expToNextLevel(level)` de `shared/src/progression.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/pvp.test.ts
import { describe, it, expect } from "vitest";
import { applyPvpDeathPenalty, PVP_GOLD_LOSS_PCT, PVP_EXP_LOSS_PCT } from "./pvp.js";
import { expToNextLevel } from "./progression.js";

describe("applyPvpDeathPenalty", () => {
  it("descuenta 10% del oro (floor)", () => {
    expect(applyPvpDeathPenalty(105, 0, 1).gold).toBe(94); // floor(105*0.9)=94
  });

  it("descuenta 5% de la exp del nivel actual (floor), sin bajar de 0", () => {
    const lvl = 5;
    const band = expToNextLevel(lvl);
    const exp = Math.floor(band * 0.5);
    const loss = Math.floor(band * PVP_EXP_LOSS_PCT);
    expect(applyPvpDeathPenalty(0, exp, lvl).exp).toBe(exp - loss);
  });

  it("nunca deja la exp negativa (no delevel)", () => {
    expect(applyPvpDeathPenalty(0, 3, 1).exp).toBe(0);
  });

  it("con 0 oro y 0 exp queda en 0/0", () => {
    expect(applyPvpDeathPenalty(0, 0, 3)).toEqual({ gold: 0, exp: 0 });
  });

  it("las constantes tienen los valores del spec", () => {
    expect(PVP_GOLD_LOSS_PCT).toBe(0.10);
    expect(PVP_EXP_LOSS_PCT).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/shared -- pvp`
Expected: FAIL (no existe `./pvp.js`).

- [ ] **Step 3: Write minimal implementation**

```ts
// shared/src/pvp.ts
import { expToNextLevel } from "./progression.js";

/** % del oro que pierde la víctima al morir en PvP. */
export const PVP_GOLD_LOSS_PCT = 0.10;
/** % de la exp del nivel actual que pierde la víctima al morir en PvP. */
export const PVP_EXP_LOSS_PCT = 0.05;

/**
 * Penalidad de muerte PvP. `exp` es el progreso dentro del nivel actual
 * (se resetea al subir de nivel, ver progression.gainExp), así que restar un
 * % de expToNextLevel(level) con piso en 0 nunca produce delevel.
 */
export function applyPvpDeathPenalty(
  gold: number,
  exp: number,
  level: number,
): { gold: number; exp: number } {
  const newGold = Math.floor(gold * (1 - PVP_GOLD_LOSS_PCT));
  const loss = Math.floor(expToNextLevel(level) * PVP_EXP_LOSS_PCT);
  const newExp = Math.max(0, exp - loss);
  return { gold: newGold, exp: newExp };
}
```

Agregar a `shared/src/index.ts` la línea de re-export (junto a los demás `export * from "./..."`):

```ts
export * from "./pvp.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/shared -- pvp`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify strict tsc**

Run: `npx tsc -p shared/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add shared/src/pvp.ts shared/src/pvp.test.ts shared/src/index.ts
git commit -m "feat(shared): módulo PvP — constantes + penalidad de muerte"
```

---

### Task 2: server — pvpKills sincronizado + persistencia

**Files:**
- Modify: `server/src/state/PlayerState.ts` (nuevo campo `@type("number") pvpKills = 0;`)
- Modify: `server/src/persistence/CharacterSave.ts` (`CharacterSave.pvpKills`, `Persistable.pvpKills`, `toCharacterSave`)
- Modify: `server/src/rooms/GameRoom.ts` (`onJoin`: default `pvpKills = 0` e hidratar del save)
- Modify: `server/src/persistence/SupabasePersistence.ts` (agregar `pvpKills` al select/return del load y al upsert del save, siguiendo el precedente de `className`)
- Test: `server/src/persistence/PersistenceService.test.ts` (agregar `pvpKills` a los fixtures existentes + un caso de round-trip)
- Migración Supabase: columna `characters."pvpKills" int not null default 0`.

**Interfaces:**
- Consumes: patrón de campos sincronizados de `PlayerState.ts`; `CharacterSave` de Task previo (no PvP) tal como está hoy.
- Produces: `PlayerState.pvpKills: number` (sincronizado); `CharacterSave.pvpKills: number`; persistido en load/save.

- [ ] **Step 1: Add the failing test (round-trip de pvpKills)**

En `server/src/persistence/PersistenceService.test.ts`, agregar `pvpKills` a cada fixture `CharacterSave` existente (poner `pvpKills: 0` salvo donde el caso lo amerite) y agregar este test dentro del describe de `InMemoryPersistence`:

```ts
it("persiste y devuelve pvpKills", async () => {
  const svc = new InMemoryPersistence();
  await svc.save("Boromir", {
    level: 3, exp: 10, pos_x: 1, pos_z: 2, inventory: {}, gold: 50,
    questId: "q1", questProgress: 0, className: "knight", pvpKills: 7,
  });
  const loaded = await svc.load("Boromir");
  expect(loaded?.pvpKills).toBe(7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: FAIL de tipo (TS2741 / `pvpKills` no existe en `CharacterSave`) o assertion `undefined`.

- [ ] **Step 3: Implement**

En `server/src/persistence/CharacterSave.ts` agregar el campo a las dos interfaces y al mapper:

```ts
// en interface CharacterSave: (junto a className)
  pvpKills: number;

// en interface Persistable:
  pvpKills: number;

// en toCharacterSave(...) return { ... , className: p.className, pvpKills: p.pvpKills };
```

En `server/src/state/PlayerState.ts`, junto a los demás campos sincronizados de combate:

```ts
  @type("number") pvpKills = 0;
```

En `server/src/rooms/GameRoom.ts`, `onJoin`: default y hidratación desde el save.
- Junto a los defaults (después de `player.exp = 0;`): `player.pvpKills = 0;`
- Dentro de `if (save) { ... }`: `player.pvpKills = save.pvpKills ?? 0;`

En `server/src/persistence/SupabasePersistence.ts`, replicar el patrón de `className`:
- Agregar `"pvpKills"` a la lista de columnas del `.select(...)` del `load`.
- Incluir `pvpKills: (row.pvpKills as number) ?? 0` en el objeto `CharacterSave` devuelto.
- Incluir `pvpKills: data.pvpKills` en el objeto del `.upsert(...)` del `save`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: PASS.

- [ ] **Step 5: Verify strict tsc (captura fixtures/objetos faltantes)**

Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: sin errores. (Si falta `pvpKills` en algún fixture o en el objeto de Supabase, acá salta TS2741.)

- [ ] **Step 6: Migración Supabase**

Aplicar (vía MCP `apply_migration`, name `add_pvpkills_column`):

```sql
alter table public.characters
  add column if not exists "pvpKills" integer not null default 0;
```

- [ ] **Step 7: Commit**

```bash
git add server/src/state/PlayerState.ts server/src/persistence/CharacterSave.ts server/src/persistence/SupabasePersistence.ts server/src/persistence/PersistenceService.test.ts server/src/rooms/GameRoom.ts
git commit -m "feat(server): pvpKills sincronizado + persistido"
```

---

### Task 3: server — combate PvP (target jugador, zona segura, muerte)

**Files:**
- Modify: `server/src/rooms/GameRoom.ts` (helper `resolveTarget`; `SetTarget` acepta jugador; auto-ataque y skill `damage` contra jugador; helper `killPlayer`; regla de zona segura)
- Test: `server/src/rooms/GameRoom.test.ts` (E2E con @colyseus/testing)

**Interfaces:**
- Consumes: `applyPvpDeathPenalty` (Task 1); `PlayerState.pvpKills` (Task 2); `SAFE_RADIUS`, `TOWN`, `ATTACK_RANGE`, `distance2D`, `PLAYER_RESPAWN_MS`, `resolveAttack`, `computeDamage` (ya importados en `GameRoom.ts`).
- Produces:
  - `private resolveTarget(id: string): { kind: "mob"; entity: MobState } | { kind: "player"; entity: PlayerState; sessionId: string } | null`
  - `private inPvpZone(p: { x: number; z: number }): boolean` — `distance2D(p.x,p.z,TOWN.x,TOWN.z) > SAFE_RADIUS`
  - `private killPlayer(victim: PlayerState, victimId: string, killerId?: string): void`

- [ ] **Step 1: Write the failing E2E tests**

Agregar a `server/src/rooms/GameRoom.test.ts` (usa el patrón existente de `boot`/`colyseus`/`Client` del archivo; posicionar jugadores seteando `x/z` en su `PlayerState`):

```ts
describe("PvP (Etapa 9a)", () => {
  it("un jugador puede pegarle a otro fuera del pueblo y le baja la HP", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Atacante", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Victima", className: "knight" });
    // ambos fuera del pueblo, pegados
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0; pa.moving = false;
    pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0; pb.moving = false;
    const hp0 = pb.hp;
    a.send("setTarget", { targetId: b.sessionId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(pb.hp).toBeLessThan(hp0);
  });

  it("no hay daño si la víctima está en el pueblo (zona segura)", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Atk2", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Vic2", className: "knight" });
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    pa.x = 7; pa.z = 0; pa.targetX = 7; pa.targetZ = 0;   // atacante fuera del radio? no: dentro
    pb.x = 0; pb.z = 0; pb.targetX = 0; pb.targetZ = 0;   // víctima en el centro del pueblo
    const hp0 = pb.hp;
    a.send("setTarget", { targetId: b.sessionId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(pb.hp).toBe(hp0);
  });

  it("al morir en PvP: víctima muere, pierde oro y el asesino suma pvpKills", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Killer", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Dead", className: "knight" });
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0;
    pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0;
    pb.hp = 1; pb.gold = 100;
    a.send("setTarget", { targetId: b.sessionId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(pb.dead).toBe(true);
    expect(pb.gold).toBe(90);       // floor(100*0.9)
    expect(pa.pvpKills).toBe(1);
  });

  it("no se puede targetear a uno mismo", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Solo", className: "knight" });
    const pa = room.state.players.get(a.sessionId)!;
    a.send("setTarget", { targetId: a.sessionId });
    await room.waitForNextSimulationTick();
    expect(pa.targetId).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: FAIL (hoy `SetTarget` rechaza ids de jugador y no hay PvP).

- [ ] **Step 3: Implement**

En `server/src/rooms/GameRoom.ts`:

1) Helpers privados (agregar cerca de `addToInventory`):

```ts
/** Resuelve un targetId a un mob vivo o a un jugador vivo (o null). */
private resolveTarget(id: string):
  | { kind: "mob"; entity: MobState }
  | { kind: "player"; entity: PlayerState; sessionId: string }
  | null {
  if (!id) return null;
  const mob = this.state.mobs.get(id);
  if (mob && !mob.dead) return { kind: "mob", entity: mob };
  const pl = this.state.players.get(id);
  if (pl && !pl.dead) return { kind: "player", entity: pl, sessionId: id };
  return null;
}

/** true si la posición está fuera de la zona segura del pueblo (PvP habilitado). */
private inPvpZone(p: { x: number; z: number }): boolean {
  return distance2D(p.x, p.z, TOWN.x, TOWN.z) > SAFE_RADIUS;
}

/** Centraliza la muerte de un jugador (por mob o por PvP). Aplica penalidad si es PvP. */
private killPlayer(victim: PlayerState, victimId: string, killerId?: string): void {
  victim.dead = true;
  victim.moving = false;
  victim.respawnMs = PLAYER_RESPAWN_MS;
  victim.targetId = "";
  this.broadcast(MessageType.Death, { entityId: victimId });
  if (killerId) {
    const pen = applyPvpDeathPenalty(victim.gold, victim.exp, victim.level);
    victim.gold = pen.gold;
    victim.exp = pen.exp;
    const killer = this.state.players.get(killerId);
    if (killer && !killer.dead) killer.pvpKills += 1;
  }
}
```

Importar `applyPvpDeathPenalty` desde `@aden/shared` (agregar al bloque de imports existente).

2) `SetTarget` — aceptar jugador (existente, vivo, distinto de uno mismo):

```ts
this.onMessage(MessageType.SetTarget, (client, msg: SetTargetMessage) => {
  const player = this.state.players.get(client.sessionId);
  if (!player || player.dead) return;
  if (msg.targetId === "") { player.targetId = ""; return; }
  const mobOk = this.state.mobs.has(msg.targetId) && !this.state.mobs.get(msg.targetId)!.dead;
  const other = this.state.players.get(msg.targetId);
  const playerOk = msg.targetId !== client.sessionId && !!other && !other.dead;
  if (mobOk || playerOk) player.targetId = msg.targetId;
});
```

3) Auto-ataque (loop `this.state.players.forEach((p, sessionId) => {...}` del tick): reemplazar el cuerpo que asume mob por uno que resuelve el target:

```ts
this.state.players.forEach((p, sessionId) => {
  if (p.dead || !p.targetId) return;
  const t = this.resolveTarget(p.targetId);
  if (!t) { p.targetId = ""; return; }
  if (t.kind === "mob") {
    const mob = t.entity;
    if (canAttack(p, mob, ATTACK_RANGE)) {
      const variance = 0.9 + Math.random() * 0.2;
      const dmg = resolveAttack(p, mob, 1, variance, getClass(p.className).base.attackCooldownMs);
      this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
      if (mob.hp <= 0) this.killMob(mob, p.targetId, sessionId);
    }
  } else {
    // PvP: ambos fuera del pueblo
    const victim = t.entity;
    if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
    if (canAttack(p, victim, ATTACK_RANGE)) {
      const variance = 0.9 + Math.random() * 0.2;
      const dmg = resolveAttack(p, victim, 1, variance, getClass(p.className).base.attackCooldownMs);
      this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: victim.hp });
      if (victim.hp <= 0) this.killPlayer(victim, p.targetId, sessionId);
    }
  }
});
```

Nota: `resolveAttack(attacker, target, factor, variance, cd)` ya opera sobre cualquier cosa con `hp/pAtk/pDef` y setea el cooldown del atacante; sirve igual para víctima jugador.

4) Skill `damage` (handler `UseSkill`, rama `if (skill.type === "damage")`): permitir target jugador con las mismas reglas. Reemplazar la resolución de mob por:

```ts
if (skill.type === "damage") {
  const t = p.targetId ? this.resolveTarget(p.targetId) : null;
  if (!t) return;
  if (t.kind === "mob") {
    const mob = t.entity;
    if (!canAttack(p, mob, ATTACK_RANGE)) return;
    p.mp -= skill.mpCost;
    p.skillCooldowns.set(skill.id, skill.cooldownMs);
    const variance = 0.9 + Math.random() * 0.2;
    const dmg = resolveAttack(p, mob, skill.factor ?? 1, variance, getClass(p.className).base.attackCooldownMs);
    this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
    if (mob.hp <= 0) this.killMob(mob, p.targetId, client.sessionId);
  } else {
    const victim = t.entity;
    if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
    if (!canAttack(p, victim, ATTACK_RANGE)) return;
    p.mp -= skill.mpCost;
    p.skillCooldowns.set(skill.id, skill.cooldownMs);
    const variance = 0.9 + Math.random() * 0.2;
    const dmg = resolveAttack(p, victim, skill.factor ?? 1, variance, getClass(p.className).base.attackCooldownMs);
    this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: victim.hp });
    if (victim.hp <= 0) this.killPlayer(victim, p.targetId, client.sessionId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: PASS (los 4 casos PvP nuevos + los existentes).

- [ ] **Step 5: Full server suite + strict tsc**

Run: `npm test --workspace @aden/server`
Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: todo verde, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add server/src/rooms/GameRoom.ts server/src/rooms/GameRoom.test.ts
git commit -m "feat(server): combate PvP — target jugador, zona segura, muerte con penalidad"
```

---

### Task 4: cliente — targetear jugador + indicador de zona

**Files:**
- Modify: `client/src/main.ts` (permitir click sobre otro jugador para targetearlo; indicador de zona)
- Modify: `client/src/render/EntityViews.ts` (raycast/registro de jugadores como objetivos clickeables, si hace falta)
- Create: `client/src/render/ZoneIndicator.ts` (HUD chico "Zona segura" / "Zona PvP")

**Interfaces:**
- Consumes: `SAFE_RADIUS`, `TOWN`, `distance2D` de `@aden/shared`; el `NetworkClient`/estado con la posición del jugador propio; el patrón existente de picking de mobs en `main.ts`.
- Produces: `ZoneIndicator` con `update(inPvp: boolean): void` y `mount(parent: HTMLElement): void`.

- [ ] **Step 1: Crear el indicador de zona (unit test de la clase de HUD)**

Test: `client/src/render/ZoneIndicator.test.ts` (vitest + jsdom, patrón de los otros tests de render del cliente):

```ts
import { describe, it, expect } from "vitest";
import { ZoneIndicator } from "./ZoneIndicator.js";

describe("ZoneIndicator", () => {
  it("muestra 'Zona segura' cuando no está en PvP", () => {
    const zi = new ZoneIndicator();
    zi.update(false);
    expect(zi.el.textContent).toContain("segura");
  });
  it("muestra 'Zona PvP' cuando está en zona PvP", () => {
    const zi = new ZoneIndicator();
    zi.update(true);
    expect(zi.el.textContent).toContain("PvP");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/client -- ZoneIndicator`
Expected: FAIL (no existe la clase).

- [ ] **Step 3: Implementar ZoneIndicator**

```ts
// client/src/render/ZoneIndicator.ts
export class ZoneIndicator {
  readonly el: HTMLDivElement;
  constructor() {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:absolute;bottom:12px;left:50%;transform:translateX(-50%);" +
      "padding:4px 10px;border-radius:6px;font:600 12px/1.2 sans-serif;" +
      "color:#fff;pointer-events:none;user-select:none;";
    this.update(false);
  }
  mount(parent: HTMLElement) { parent.appendChild(this.el); }
  update(inPvp: boolean) {
    this.el.textContent = inPvp ? "⚔ Zona PvP" : "🛡 Zona segura";
    this.el.style.background = inPvp ? "rgba(200,40,40,0.75)" : "rgba(40,120,60,0.7)";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/client -- ZoneIndicator`
Expected: PASS.

- [ ] **Step 5: Cablear en main.ts**

- Instanciar `ZoneIndicator`, `mount` sobre el contenedor del HUD, y en el loop de render llamar `zoneIndicator.update(distance2D(self.x, self.z, TOWN.x, TOWN.z) > SAFE_RADIUS)` usando la posición del jugador propio.
- En el handler de click/picking de mobs de `main.ts`: si el rayo golpea el mesh de **otro jugador** (no el propio), enviar `SetTarget { targetId: <sessionId de ese jugador> }`. Reusar el registro de vistas de `EntityViews` (mapa sessionId→objeto3D de jugadores) para el raycast; si los jugadores no están registrados como pickeables, agregarlos al array de objetos del raycaster igual que los mobs. El anillo de objetivo rojo existente se reutiliza sobre el jugador targeteado.

- [ ] **Step 6: Verificar tsc del cliente + smoke**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

Smoke (dev server ya corriendo en :5173): con las tools del navegador, `read_page`/`javascript_tool` para confirmar que el HUD del indicador de zona existe en el DOM y que no hay errores de consola al bootear. (La conexión WS al server no completa en el sandbox → el targeting de jugador en vivo queda pendiente-usuario, como en etapas previas.)

- [ ] **Step 7: Commit**

```bash
git add client/src/render/ZoneIndicator.ts client/src/render/ZoneIndicator.test.ts client/src/main.ts client/src/render/EntityViews.ts
git commit -m "feat(client): targetear jugador + indicador de zona PvP/segura"
```

---

### Task 5: verificación final + merge

**Files:** ninguno nuevo (verificación).

- [ ] **Step 1: Suite completa**

Run: `npm test --workspace @aden/shared && npm test --workspace @aden/server && npm test --workspace @aden/client`
Expected: todo verde.

- [ ] **Step 2: tsc estricto en los tres workspaces**

Run: `npx tsc -p shared/tsconfig.json --noEmit && npx tsc -p server/tsconfig.json --noEmit && npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: Chequear 0 artefactos**

Run: `git status --porcelain`
Expected: limpio (sin `.js`/`dist` sueltos en `src/`).

- [ ] **Step 4: Merge a master**

```bash
git checkout master
git merge --no-ff etapa-9a-pvp-core -m "merge: Etapa 9a — PvP core (pueblo seguro, PvP afuera, muerte con penalidad)"
```

- [ ] **Step 5: Actualizar el ledger SDD** con el resultado (tests totales, commits) en `.superpowers/sdd/2026-08-18-etapa-9a-pvp-core/progress.md`.

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (9a):** targeting unificado (Task 3), zona segura (Task 3), ataques instantáneos de jugador (Task 3, sin wind-up), muerte con penalidad oro/exp (Task 1+3), `pvpKills` sincronizado+persistido (Task 2), cliente target+indicador de zona (Task 4). DoT-en-PvP correctamente fuera de alcance. ✓
- **Sin placeholders:** todos los steps tienen código real. ✓
- **Consistencia de tipos:** `applyPvpDeathPenalty(gold,exp,level)` (Task 1) usada igual en Task 3; `resolveTarget`/`inPvpZone`/`killPlayer` firmadas en Interfaces y usadas con esas firmas; `pvpKills` mismo nombre en PlayerState/CharacterSave/Supabase/fixtures. ✓
