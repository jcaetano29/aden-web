# Etapa 9c — Boss contestado (last-hit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la guild del jugador que da el golpe final al jefe se lleve el crédito (`bossKills++` persistido) y se anuncie a todo el servidor, para que las guilds se disputen el boss.

**Architecture:** El jefe (`skeleton_king`) ya existe, respawnea por timer, dropea su botín, y `killMob` ya recibe el `killerId` correcto (last-hit) desde el auto-ataque, las skills y el DoT. 9c solo agrega, dentro de `killMob`: si el mob es boss y el que remató tiene guild, incrementar `guild.bossKills` (sincronizado + persistido con `saveGuild`) y broadcastear un evento `BossKilled` que el cliente muestra como toast. El PvP de 9a ya está activo en la arena del jefe (fuera del pueblo), así que la disputa a los golpes sale sin lógica nueva.

**Tech Stack:** TypeScript monorepo (npm workspaces), Colyseus 0.15, Three.js client, vitest, @colyseus/testing (E2E), Supabase.

**Spec:** `docs/superpowers/specs/2026-08-18-arco-competitivo-pvp-guilds-boss-design.md` (sección "9c — Boss contestado").

## Global Constraints

- Campos sincronizados con `@type(...)`; server-only sin `@type`.
- Verificación estricta: `npx tsc -p <ws>/tsconfig.json --noEmit` limpio en shared/server/client + tests.
- 0 artefactos.
- Este plan cubre SOLO 9c. El leaderboard (topGuilds/topCharacters, panel) es 9d — NO acá.
- `bossKills` YA existe como campo `@type` en `GuildState` y como columna Supabase (creados en 9b). Acá recién se INCREMENTA.
- Solo se acredita/anuncia si el que remata tiene guild (`guildId !== ""`). Un jugador sin guild puede matar al jefe (dropea y sube nivel como siempre) pero no genera crédito ni anuncio.

---

### Task 1: server — crédito de guild al matar al jefe + broadcast

**Files:**
- Modify: `shared/src/protocol.ts` (`MessageType.BossKilled` + `BossKilledEvent`)
- Modify: `server/src/rooms/GameRoom.ts` (`killMob`: crédito de guild + persistencia + broadcast; imports `isBoss`, `getTemplate`)
- Test: `server/src/rooms/GameRoom.test.ts`

**Interfaces:**
- Produces:
  - `MessageType.BossKilled = "bossKilled"`.
  - `export interface BossKilledEvent { bossName: string; guildTag: string; guildName: string; }`
- Consumes: `isBoss`/`getTemplate` de `@aden/shared`; `this.state.guilds` (GuildState de 9b); `this.persistence.saveGuild` (9b); `killMob(mob, mobId, killerId?)` existente.

- [ ] **Step 1: Write the failing E2E tests**

Agregar a `server/src/rooms/GameRoom.test.ts`:

```ts
describe("Boss contestado (Etapa 9c)", () => {
  function findBoss(room: any): string {
    let id = "";
    room.state.mobs.forEach((m: any, k: string) => { if (m.templateId === "skeleton_king") id = k; });
    return id;
  }

  it("el golpe final al jefe acredita bossKills a la guild del que remata", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Campeon", className: "knight" });
    a.send("createGuild", { name: "Los Reyes", tag: "KING" });
    await room.waitForNextSimulationTick();
    const pa = room.state.players.get(a.sessionId)!;
    const gid = pa.guildId;
    const bossId = findBoss(room);
    const boss = room.state.mobs.get(bossId)!;
    boss.hp = 1;
    pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
    a.send("setTarget", { targetId: bossId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(boss.dead).toBe(true);
    expect(room.state.guilds.get(gid)!.bossKills).toBe(1);
  });

  it("si el que remata no tiene guild, no incrementa nada ni crashea", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Solitario", className: "knight" });
    const pa = room.state.players.get(a.sessionId)!;
    const bossId = findBoss(room);
    const boss = room.state.mobs.get(bossId)!;
    boss.hp = 1;
    pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
    a.send("setTarget", { targetId: bossId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(boss.dead).toBe(true); // no crash, muere normal
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: FAIL (el primer test: `bossKills` sigue en 0).

- [ ] **Step 3: Implement**

En `shared/src/protocol.ts`: agregar a `MessageType`

```ts
  BossKilled: "bossKilled",
```

y la interfaz:

```ts
export interface BossKilledEvent {
  bossName: string;
  guildTag: string;
  guildName: string;
}
```

En `server/src/rooms/GameRoom.ts`:
- Imports: agregar `isBoss`, `getTemplate` al bloque de `@aden/shared`.
- En `killMob`, DENTRO del bloque existente `if (killer && !killer.dead) { ... }` (después de la exp y el progreso de misión), agregar:

```ts
// Etapa 9c: crédito de guild por matar al jefe (last-hit)
if (isBoss(mob.templateId) && killer.guildId !== "") {
  const g = this.state.guilds.get(killer.guildId);
  if (g) {
    g.bossKills += 1;
    this.persistence
      .saveGuild({ id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills })
      .catch((e) => console.error("[aden] saveGuild fail", g.id, e));
    this.broadcast(MessageType.BossKilled, {
      bossName: getTemplate(mob.templateId).name,
      guildTag: g.tag,
      guildName: g.name,
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: PASS.

- [ ] **Step 5: Full server suite + strict tsc**

Run: `npm test --workspace @aden/server`
Run: `npx tsc -p server/tsconfig.json --noEmit`
Run: `npx tsc -p shared/tsconfig.json --noEmit`
Expected: verde y sin errores.

- [ ] **Step 6: Commit**

```bash
git add shared/src/protocol.ts server/src/rooms/GameRoom.ts server/src/rooms/GameRoom.test.ts
git commit -m "feat(server): boss contestado — crédito de guild al last-hit + evento BossKilled"
```

---

### Task 2: cliente — toast al abatir al jefe

**Files:**
- Modify: `client/src/net/NetworkClient.ts` (registrar handler de `BossKilled` + callback `onBossKilled`)
- Modify: `client/src/main.ts` (mostrar toast al recibir `BossKilled`)

**Interfaces:**
- Consumes: `MessageType.BossKilled`, `BossKilledEvent` (Task 1); el mecanismo de toast/HUD existente que usa `main.ts` (el mismo que ya muestra feedback como el de usar poción o "¡Esquivado!").
- Produces: `NetworkClient.onBossKilled(cb: (ev: BossKilledEvent) => void): void` (o el patrón de callbacks ya usado por NetworkClient para otros eventos).

- [ ] **Step 1: Implementar (sin unit test nuevo — es wiring de red→HUD; se verifica por tsc+smoke)**

- En `client/src/net/NetworkClient.ts`: leer cómo se registran hoy los handlers de mensajes del server (p.ej. `Damage`/`LevelUp`/`Death` via `room.onMessage(...)`) y exponer un callback. Agregar:
  - un campo/registro `onBossKilled` siguiendo el MISMO patrón que los otros callbacks del cliente (p.ej. `onLevelUp`),
  - `this.room.onMessage(MessageType.BossKilled, (ev: BossKilledEvent) => this._onBossKilled?.(ev));`
- En `client/src/main.ts`: registrar el callback y mostrar un toast con el texto:
  `⚔ ¡La guild [${ev.guildTag}] abatió al ${ev.bossName}!`
  usando el MISMO mecanismo de toast/HUD que ya se usa para otros mensajes (leer cómo `main.ts` muestra los toasts actuales y reusarlo; no inventar un sistema nuevo).

- [ ] **Step 2: Verificar tsc del cliente + smoke**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Run: `npm test --workspace @aden/client`
Expected: sin errores; suite existente verde (no se agregan tests nuevos, pero no debe romperse nada).

Smoke opcional (no bloqueante; WS no conecta en el sandbox): el cliente bootea sin errores de consola. El toast en vivo necesita conexión → pendiente-usuario.

- [ ] **Step 3: Commit**

```bash
git add client/src/net/NetworkClient.ts client/src/main.ts
git commit -m "feat(client): toast server-wide al abatir al jefe"
```

---

### Task 3: verificación final + merge

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa**

Run: `npm test --workspace @aden/shared && npm test --workspace @aden/server && npm test --workspace @aden/client`
Expected: todo verde.

- [ ] **Step 2: tsc estricto en los tres workspaces**

Run: `npx tsc -p shared/tsconfig.json --noEmit && npx tsc -p server/tsconfig.json --noEmit && npx tsc -p client/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: Chequear 0 artefactos**

Run: `git status --porcelain`
Expected: limpio.

- [ ] **Step 4: Merge a master**

```bash
git checkout master
git merge --no-ff etapa-9c-boss-contestado -m "merge: Etapa 9c — Boss contestado (last-hit → crédito de guild + anuncio)"
```

- [ ] **Step 5: Actualizar el ledger SDD** con tests totales y commits.

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (9c):** last-hit → guild.bossKills++ (Task 1), persistido con saveGuild (Task 1), broadcast BossKilled server-wide + toast (Task 1 evento / Task 2 toast), sin lógica de "zona boss" nueva porque el PvP de 9a ya cubre la arena (transversal, sin código). Drop ya existente (sin cambios). Solo acredita con guild (guard `guildId !== ""`). topGuilds/leaderboard correctamente FUERA de alcance (9d). ✓
- **Sin placeholders:** todo el código real; el único paso descriptivo (Task 2) referencia patrones existentes concretos (onLevelUp/toast) a imitar. ✓
- **Consistencia de tipos:** `BossKilledEvent{bossName,guildTag,guildName}` igual en Task 1 (server broadcast) y Task 2 (client handler); `saveGuild({id,name,tag,leaderName,bossKills})` coincide con `GuildSave` de 9b; `isBoss`/`getTemplate` firmas de mobs.ts. ✓
