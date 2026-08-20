# Etapa 9b — Guilds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guilds mínimas (crear/unirse/salir, tag en el nameplate, roster) con fuego amigo protegido entre miembros, como base para el boss disputado (9c) y el leaderboard (9d).

**Architecture:** La identidad de guild (id/name/tag) se persiste en el personaje (`CharacterSave`) y se sincroniza al cliente vía `PlayerState`. El `GameState.guilds` es un registro VIVO (`MapSchema<GuildState>`) que existe mientras ≥1 miembro esté online; se reconstruye al conectarse un miembro (hidratando líder/bossKills desde una tabla `guilds` persistida) y se poda cuando queda vacío. El combate PvP (9a) suma un gate: mismo `guildId` no vacío → sin daño.

**Tech Stack:** TypeScript monorepo (npm workspaces), Colyseus 0.15 (Schema/@type/MapSchema), Three.js client, vitest, @colyseus/testing (E2E), Supabase (persistencia).

**Spec:** `docs/superpowers/specs/2026-08-18-arco-competitivo-pvp-guilds-boss-design.md` (sección "9b — Guilds (mínimo)").

## Global Constraints

- Campos sincronizados al cliente van con `@type(...)`; los server-only van SIN `@type`.
- Verificación estricta obligatoria: `npx tsc -p <ws>/tsconfig.json --noEmit` limpio en shared/server/client, además de los tests.
- 0 artefactos generados por la verificación.
- Este plan cubre SOLO 9b. `bossKills` se crea (columna + campo) pero NO se incrementa acá — eso es 9c. `topGuilds`/leaderboard es 9d: NO agregarlo acá (YAGNI).
- El líder NO es un rol persistido aparte: se deriva de `guild.leaderName === player.name`. No agregar `guildRole`.
- No romper 9a: el PvP fuera del pueblo sigue igual; solo se agrega el gate de fuego amigo.

---

### Task 1: shared — validación de guild

**Files:**
- Create: `shared/src/guilds.ts`
- Modify: `shared/src/index.ts` (re-export)
- Test: `shared/src/guilds.test.ts`

**Interfaces:**
- Produces:
  - `export const GUILD_TAG_MIN = 2; export const GUILD_TAG_MAX = 4;`
  - `export const GUILD_NAME_MAX = 24;`
  - `export function isValidGuildTag(tag: string): boolean` — 2–4 chars, solo A–Z y 0–9 (ya en mayúsculas).
  - `export function isValidGuildName(name: string): boolean` — 1–24 chars tras trim, no vacío.

- [ ] **Step 1: Write the failing test**

```ts
// shared/src/guilds.test.ts
import { describe, it, expect } from "vitest";
import { isValidGuildTag, isValidGuildName } from "./guilds.js";

describe("isValidGuildTag", () => {
  it("acepta 2–4 alfanuméricos en mayúscula", () => {
    expect(isValidGuildTag("AB")).toBe(true);
    expect(isValidGuildTag("WOLF")).toBe(true);
    expect(isValidGuildTag("X9")).toBe(true);
  });
  it("rechaza vacío, muy corto, muy largo, o con símbolos/minúsculas", () => {
    expect(isValidGuildTag("")).toBe(false);
    expect(isValidGuildTag("A")).toBe(false);
    expect(isValidGuildTag("TOOLONG")).toBe(false);
    expect(isValidGuildTag("ab")).toBe(false);      // minúsculas
    expect(isValidGuildTag("A-B")).toBe(false);      // símbolo
  });
});

describe("isValidGuildName", () => {
  it("acepta 1–24 chars tras trim", () => {
    expect(isValidGuildName("Los Lobos")).toBe(true);
    expect(isValidGuildName("x")).toBe(true);
  });
  it("rechaza vacío/espacios o >24", () => {
    expect(isValidGuildName("   ")).toBe(false);
    expect(isValidGuildName("a".repeat(25))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/shared -- guilds`
Expected: FAIL (no existe `./guilds.js`).

- [ ] **Step 3: Write minimal implementation**

```ts
// shared/src/guilds.ts
export const GUILD_TAG_MIN = 2;
export const GUILD_TAG_MAX = 4;
export const GUILD_NAME_MAX = 24;

const TAG_RE = /^[A-Z0-9]{2,4}$/;

/** Tag de guild: 2–4 caracteres, solo A–Z y 0–9 (ya en mayúsculas). */
export function isValidGuildTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

/** Nombre de guild: 1–24 caracteres tras trim, no vacío. */
export function isValidGuildName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= GUILD_NAME_MAX;
}
```

Agregar a `shared/src/index.ts`:

```ts
export * from "./guilds.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/shared -- guilds`
Expected: PASS.

- [ ] **Step 5: Verify strict tsc**

Run: `npx tsc -p shared/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add shared/src/guilds.ts shared/src/guilds.test.ts shared/src/index.ts
git commit -m "feat(shared): validación de guild (tag/nombre)"
```

---

### Task 2: server — persistencia de guild + identidad de guild en el personaje

**Files:**
- Create: `server/src/persistence/GuildSave.ts`
- Modify: `server/src/persistence/PersistenceService.ts` (interfaz + `InMemoryPersistence` gana `loadGuild`/`saveGuild`)
- Modify: `server/src/persistence/SupabasePersistence.ts` (implementar `loadGuild`/`saveGuild`; agregar `guildId,guildName,guildTag` al select/return y upsert de characters)
- Modify: `server/src/persistence/CharacterSave.ts` (`guildId`/`guildName`/`guildTag` en `CharacterSave` + `Persistable` + `toCharacterSave`)
- Test: `server/src/persistence/PersistenceService.test.ts`
- Migraciones Supabase (las aplica el controller, NO el implementer): tabla `guilds` + 3 columnas de guild en `characters`.

**Interfaces:**
- Produces:
  - `// GuildSave.ts` — `export interface GuildSave { id: string; name: string; tag: string; leaderName: string; bossKills: number; }`
  - `PersistenceService.loadGuild(id: string): Promise<GuildSave | null>`
  - `PersistenceService.saveGuild(g: GuildSave): Promise<void>`
  - `CharacterSave` gana `guildId: string; guildName: string; guildTag: string;` (default `""`).
- Consumes: patrón existente de `pvpKills`/`className` en estos mismos archivos.

- [ ] **Step 1: Write the failing tests**

En `server/src/persistence/PersistenceService.test.ts`: agregar `guildId: "", guildName: "", guildTag: ""` a los fixtures `CharacterSave` existentes, y agregar estos tests dentro del describe de `InMemoryPersistence`:

```ts
it("persiste y devuelve la identidad de guild del personaje", async () => {
  const svc = new InMemoryPersistence();
  await svc.save("Aragorn", {
    level: 1, exp: 0, pos_x: 0, pos_z: 0, inventory: {}, gold: 0,
    questId: "q1", questProgress: 0, className: "knight", pvpKills: 0,
    guildId: "wolf-abc123", guildName: "Los Lobos", guildTag: "WOLF",
  });
  const loaded = await svc.load("Aragorn");
  expect(loaded?.guildId).toBe("wolf-abc123");
  expect(loaded?.guildName).toBe("Los Lobos");
  expect(loaded?.guildTag).toBe("WOLF");
});

it("guarda y carga una guild (round-trip)", async () => {
  const svc = new InMemoryPersistence();
  await svc.saveGuild({ id: "wolf-abc123", name: "Los Lobos", tag: "WOLF", leaderName: "Aragorn", bossKills: 3 });
  const g = await svc.loadGuild("wolf-abc123");
  expect(g).toEqual({ id: "wolf-abc123", name: "Los Lobos", tag: "WOLF", leaderName: "Aragorn", bossKills: 3 });
});

it("loadGuild devuelve null si no existe", async () => {
  const svc = new InMemoryPersistence();
  expect(await svc.loadGuild("nope")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: FAIL (TS: `loadGuild`/`saveGuild` no existen; `guildId` no existe en `CharacterSave`).

- [ ] **Step 3: Implement**

Crear `server/src/persistence/GuildSave.ts`:

```ts
export interface GuildSave {
  id: string;
  name: string;
  tag: string;
  leaderName: string;
  bossKills: number;
}
```

En `server/src/persistence/CharacterSave.ts`, agregar a `CharacterSave` y `Persistable` (junto a `pvpKills`):

```ts
  guildId: string;
  guildName: string;
  guildTag: string;
```

Y en `toCharacterSave(...)` return: `guildId: p.guildId, guildName: p.guildName, guildTag: p.guildTag,`.

En `server/src/persistence/PersistenceService.ts`:
- Importar `GuildSave`.
- Agregar a la interfaz `PersistenceService`:

```ts
  loadGuild(id: string): Promise<GuildSave | null>;
  saveGuild(g: GuildSave): Promise<void>;
```

- En `InMemoryPersistence`, agregar un store de guilds y los métodos:

```ts
  private readonly guilds = new Map<string, GuildSave>();

  async loadGuild(id: string): Promise<GuildSave | null> {
    const g = this.guilds.get(id);
    return g ? { ...g } : null;
  }

  async saveGuild(g: GuildSave): Promise<void> {
    this.guilds.set(g.id, { ...g });
  }
```

En `server/src/persistence/SupabasePersistence.ts`:
- En `load`: agregar `guildId,guildName,guildTag` a la lista del `.select(...)` y al objeto devuelto con fallback `?? ""`.
- En `save`: agregar `guildId: data.guildId, guildName: data.guildName, guildTag: data.guildTag,` al objeto del `.upsert(...)`.
- Agregar los métodos de guild (tabla `guilds`, columnas camelCase entre comillas):

```ts
async loadGuild(id: string): Promise<GuildSave | null> {
  const { data, error } = await this.client
    .from("guilds")
    .select("id,name,tag,leaderName,bossKills")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.error("[aden] SupabasePersistence.loadGuild error:", error.message); return null; }
  if (!data) return null;
  return { id: data.id, name: data.name, tag: data.tag, leaderName: data.leaderName ?? "", bossKills: (data.bossKills as number) ?? 0 };
}

async saveGuild(g: GuildSave): Promise<void> {
  const { error } = await this.client.from("guilds").upsert(
    { id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) console.error("[aden] SupabasePersistence.saveGuild error:", error.message);
}
```

Importar `GuildSave` en `SupabasePersistence.ts`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: PASS.

- [ ] **Step 5: Verify strict tsc (captura fixtures/objetos faltantes)**

Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: sin errores. (Si falta un campo de guild en algún fixture, `CharacterSave.test.ts`, o el objeto de Supabase → TS2741 acá.)

Nota: `CharacterSave.test.ts` también construye `CharacterSave` — actualizar su fixture/expected con `guildId/guildName/guildTag: ""` si tsc lo marca.

- [ ] **Step 6: Commit** (la migración Supabase la corre el controller aparte)

```bash
git add server/src/persistence/GuildSave.ts server/src/persistence/PersistenceService.ts server/src/persistence/SupabasePersistence.ts server/src/persistence/CharacterSave.ts server/src/persistence/PersistenceService.test.ts server/src/persistence/CharacterSave.test.ts
git commit -m "feat(server): persistencia de guild + identidad de guild en el personaje"
```

---

### Task 3: server — estado, mensajes y fuego amigo de guild

**Files:**
- Create: `server/src/state/GuildState.ts`
- Modify: `server/src/state/GameState.ts` (`@type({ map: GuildState }) guilds`)
- Modify: `server/src/state/PlayerState.ts` (`@type("string") guildId/guildTag` + server-only `guildName`)
- Modify: `shared/src/protocol.ts` (MessageTypes + interfaces de mensaje de guild)
- Modify: `server/src/rooms/GameRoom.ts` (handlers CreateGuild/JoinGuild/LeaveGuild; hidratación del registro vivo en onJoin; poda en LeaveGuild/onLeave; gate de fuego amigo en las 2 ramas PvP)
- Test: `server/src/rooms/GameRoom.test.ts`

**Interfaces:**
- Consumes: `isValidGuildTag`/`isValidGuildName` (Task 1); `loadGuild`/`saveGuild`/`GuildSave` (Task 2); `CharacterSave.guildId/guildName/guildTag` (Task 2); helpers `resolveTarget`/`inPvpZone` (9a).
- Produces:
  - `GuildState` schema: `id, name, tag, leaderName` (string) + `bossKills` (number), todos `@type`.
  - `GameState.guilds: MapSchema<GuildState>`.
  - `PlayerState.guildId`/`guildTag` sincronizados; `guildName` server-only.
  - MessageTypes `CreateGuild`/`JoinGuild`/`LeaveGuild` + `CreateGuildMessage {name,tag}`, `JoinGuildMessage {guildId}`.
  - `private pruneGuildIfEmpty(guildId: string): void`.

- [ ] **Step 1: Write the failing E2E tests**

Agregar a `server/src/rooms/GameRoom.test.ts`:

```ts
describe("Guilds (Etapa 9b)", () => {
  it("crear guild setea id/tag/name en el jugador y la registra viva", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Lider", className: "knight" });
    a.send("createGuild", { name: "Los Lobos", tag: "WOLF" });
    await room.waitForNextSimulationTick();
    const pa = room.state.players.get(a.sessionId)!;
    expect(pa.guildTag).toBe("WOLF");
    expect(pa.guildId).not.toBe("");
    const g = room.state.guilds.get(pa.guildId)!;
    expect(g.name).toBe("Los Lobos");
    expect(g.leaderName).toBe("Lider");
  });

  it("rechaza tag inválido y tag duplicado", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "L1", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "L2", className: "knight" });
    a.send("createGuild", { name: "AAA", tag: "toolong" }); // inválido
    await room.waitForNextSimulationTick();
    expect(room.state.players.get(a.sessionId)!.guildId).toBe("");
    a.send("createGuild", { name: "Uno", tag: "WOLF" });
    await room.waitForNextSimulationTick();
    b.send("createGuild", { name: "Dos", tag: "WOLF" }); // duplicado
    await room.waitForNextSimulationTick();
    expect(room.state.players.get(b.sessionId)!.guildId).toBe("");
  });

  it("unirse copia la identidad de la guild", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Jefe", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Miembro", className: "knight" });
    a.send("createGuild", { name: "Halcones", tag: "HAWK" });
    await room.waitForNextSimulationTick();
    const gid = room.state.players.get(a.sessionId)!.guildId;
    b.send("joinGuild", { guildId: gid });
    await room.waitForNextSimulationTick();
    expect(room.state.players.get(b.sessionId)!.guildId).toBe(gid);
    expect(room.state.players.get(b.sessionId)!.guildTag).toBe("HAWK");
  });

  it("miembros de la misma guild NO se hacen daño (fuego amigo)", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Aliado1", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Aliado2", className: "knight" });
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0;
    pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0;
    a.send("createGuild", { name: "Pactados", tag: "PAX" });
    await room.waitForNextSimulationTick();
    b.send("joinGuild", { guildId: pa.guildId });
    await room.waitForNextSimulationTick();
    const hp0 = pb.hp;
    a.send("setTarget", { targetId: b.sessionId });
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();
    expect(pb.hp).toBe(hp0); // sin daño entre aliados
  });

  it("salir limpia la identidad y poda la guild vacía", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Solo", className: "knight" });
    a.send("createGuild", { name: "Efímera", tag: "TMP" });
    await room.waitForNextSimulationTick();
    const gid = room.state.players.get(a.sessionId)!.guildId;
    expect(room.state.guilds.has(gid)).toBe(true);
    a.send("leaveGuild", {});
    await room.waitForNextSimulationTick();
    expect(room.state.players.get(a.sessionId)!.guildId).toBe("");
    expect(room.state.guilds.has(gid)).toBe(false); // podada (sin miembros online)
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: FAIL (no existen los handlers/estado).

- [ ] **Step 3: Implement**

Crear `server/src/state/GuildState.ts`:

```ts
import { Schema, type } from "@colyseus/schema";

export class GuildState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") tag = "";
  @type("string") leaderName = "";
  @type("number") bossKills = 0;
}
```

En `server/src/state/GameState.ts`: importar `GuildState` y agregar

```ts
  @type({ map: GuildState }) guilds = new MapSchema<GuildState>();
```

En `server/src/state/PlayerState.ts`, junto a los campos sincronizados:

```ts
  @type("string") guildId = "";
  @type("string") guildTag = "";
```

y entre los server-only (sin `@type`, junto a `loaded`):

```ts
  // Guild — server-only (el cliente obtiene el nombre desde GuildState)
  guildName = "";
```

En `shared/src/protocol.ts`: agregar a `MessageType`

```ts
  CreateGuild: "createGuild",
  JoinGuild: "joinGuild",
  LeaveGuild: "leaveGuild",
```

y las interfaces:

```ts
export interface CreateGuildMessage { name: string; tag: string; }
export interface JoinGuildMessage { guildId: string; }
```

En `server/src/rooms/GameRoom.ts`:

1) Imports: agregar `GuildState` (de `../state/GuildState.js`), `isValidGuildTag`, `isValidGuildName` (de `@aden/shared`), y los tipos de mensaje `CreateGuildMessage`, `JoinGuildMessage`.

2) Handlers (registrarlos en `onCreate`, junto a los otros `onMessage`):

```ts
this.onMessage(MessageType.CreateGuild, (client, msg: CreateGuildMessage) => {
  const p = this.state.players.get(client.sessionId);
  if (!p || p.guildId !== "") return;
  const name = (msg?.name ?? "").trim();
  const tag = (msg?.tag ?? "").trim().toUpperCase();
  if (!isValidGuildName(name) || !isValidGuildTag(tag)) return;
  let taken = false;
  this.state.guilds.forEach((g) => { if (g.tag === tag) taken = true; });
  if (taken) return;
  const id = `${tag.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  const g = new GuildState();
  g.id = id; g.name = name; g.tag = tag; g.leaderName = p.name; g.bossKills = 0;
  this.state.guilds.set(id, g);
  p.guildId = id; p.guildName = name; p.guildTag = tag;
  this.persistence.saveGuild({ id, name, tag, leaderName: p.name, bossKills: 0 })
    .catch((e) => console.error("[aden] saveGuild fail", id, e));
});

this.onMessage(MessageType.JoinGuild, (client, msg: JoinGuildMessage) => {
  const p = this.state.players.get(client.sessionId);
  if (!p || p.guildId !== "") return;
  const g = this.state.guilds.get(msg?.guildId ?? "");
  if (!g) return;
  p.guildId = g.id; p.guildName = g.name; p.guildTag = g.tag;
});

this.onMessage(MessageType.LeaveGuild, (client) => {
  const p = this.state.players.get(client.sessionId);
  if (!p || p.guildId === "") return;
  const gid = p.guildId;
  p.guildId = ""; p.guildName = ""; p.guildTag = "";
  this.pruneGuildIfEmpty(gid);
});
```

3) Helper de poda (junto a los otros helpers privados):

```ts
/** Borra la GuildState viva si ya no hay ningún jugador online con ese guildId. La fila persistida queda. */
private pruneGuildIfEmpty(guildId: string): void {
  let anyOnline = false;
  this.state.players.forEach((pl) => { if (pl.guildId === guildId) anyOnline = true; });
  if (!anyOnline) this.state.guilds.delete(guildId);
}
```

4) onJoin — defaults e hidratación del registro vivo. Junto a los otros defaults: `player.guildId = ""; player.guildTag = ""; player.guildName = "";`. Dentro del `if (save) { ... }`: 

```ts
player.guildId = save.guildId ?? "";
player.guildName = save.guildName ?? "";
player.guildTag = save.guildTag ?? "";
```

Y AL FINAL de onJoin (después de `player.loaded = true;`), reconstruir la guild viva si hace falta:

```ts
if (player.guildId !== "" && !this.state.guilds.has(player.guildId)) {
  const row = await this.persistence.loadGuild(player.guildId);
  const g = new GuildState();
  g.id = player.guildId;
  g.name = row?.name ?? player.guildName;
  g.tag = row?.tag ?? player.guildTag;
  g.leaderName = row?.leaderName ?? player.name;
  g.bossKills = row?.bossKills ?? 0;
  this.state.guilds.set(player.guildId, g);
}
```

5) onLeave — podar la guild del que se va. Capturar el guildId ANTES de `this.state.players.delete(client.sessionId)`, borrar el player, y luego `this.pruneGuildIfEmpty(gid)` (si tenía guild).

6) Fuego amigo — en las DOS ramas PvP de combate (auto-ataque en `tick` y skill `damage` en `UseSkill`), justo después de obtener `victim` y ANTES del gate de zona/rango, agregar:

```ts
if (p.guildId !== "" && p.guildId === victim.guildId) return; // aliados no se pegan
```

(En el auto-ataque el atacante es `p`; en el handler de skill el atacante es `p` también. Usar el nombre correcto de la variable del jugador atacante en cada bloque.)

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: PASS (los 5 casos de guild + todos los de 9a y previos).

- [ ] **Step 5: Full server suite + strict tsc**

Run: `npm test --workspace @aden/server`
Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: verde y sin errores.

- [ ] **Step 6: Commit**

```bash
git add server/src/state/GuildState.ts server/src/state/GameState.ts server/src/state/PlayerState.ts shared/src/protocol.ts server/src/rooms/GameRoom.ts server/src/rooms/GameRoom.test.ts
git commit -m "feat(server): guilds — estado, crear/unirse/salir, fuego amigo"
```

---

### Task 4: cliente — tag en nameplate + panel de guild

**Files:**
- Modify: `client/src/render/EntityViews.ts` y/o `client/src/render/Nameplates.ts` (mostrar `[TAG] Nombre` cuando el jugador tiene `guildTag`)
- Create: `client/src/render/GuildPanel.ts` (panel DOM: crear, unirse a una guild viva, salir, ver roster)
- Modify: `client/src/main.ts` (instanciar panel, tecla `g` para abrir/cerrar, wiring de mensajes)
- Modify: `client/src/net/NetworkClient.ts` (métodos `sendCreateGuild`/`sendJoinGuild`/`sendLeaveGuild` + un getter para enumerar guilds vivas y el roster)
- Test: `client/src/render/GuildPanel.test.ts` (unit, jsdom)

**Interfaces:**
- Consumes: `PlayerState.guildTag`/`guildId` sincronizados; `GameState.guilds` (GuildState id/name/tag/leaderName/bossKills); MessageTypes de guild (Task 3). El patrón existente de otros paneles DOM (`ShopPanel.ts`, `InventoryPanel.ts`) y de nameplates.
- Produces: `GuildPanel` con `mount(parent)`, `update(data)` y callbacks `onCreate(name,tag)`, `onJoin(guildId)`, `onLeave()`.

- [ ] **Step 1: Unit test del panel (jsdom)**

Test: `client/src/render/GuildPanel.test.ts` — usar `// @vitest-environment jsdom` (ya hay `jsdom` como devDependency desde 9a).

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { GuildPanel } from "./GuildPanel.js";

describe("GuildPanel", () => {
  it("sin guild muestra el formulario de crear y dispara onCreate", () => {
    const onCreate = vi.fn();
    const panel = new GuildPanel({ onCreate, onJoin: vi.fn(), onLeave: vi.fn() });
    panel.update({ myGuildId: "", guilds: [], roster: [] });
    const name = panel.el.querySelector<HTMLInputElement>("[data-guild-name]")!;
    const tag = panel.el.querySelector<HTMLInputElement>("[data-guild-tag]")!;
    name.value = "Los Lobos"; tag.value = "WOLF";
    panel.el.querySelector<HTMLButtonElement>("[data-guild-create]")!.click();
    expect(onCreate).toHaveBeenCalledWith("Los Lobos", "WOLF");
  });

  it("con guild muestra el roster y el botón de salir", () => {
    const onLeave = vi.fn();
    const panel = new GuildPanel({ onCreate: vi.fn(), onJoin: vi.fn(), onLeave });
    panel.update({ myGuildId: "wolf-1", guilds: [{ id: "wolf-1", name: "Los Lobos", tag: "WOLF", leaderName: "A", bossKills: 0 }], roster: ["A", "B"] });
    expect(panel.el.textContent).toContain("Los Lobos");
    expect(panel.el.textContent).toContain("B");
    panel.el.querySelector<HTMLButtonElement>("[data-guild-leave]")!.click();
    expect(onLeave).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/client -- GuildPanel`
Expected: FAIL (no existe `GuildPanel`).

- [ ] **Step 3: Implement `GuildPanel.ts`**

Crear un panel DOM siguiendo el estilo de `ShopPanel.ts`/`InventoryPanel.ts` (posición absoluta, fondo semitransparente, `pointer-events:auto` en inputs/botones). API:

```ts
export interface GuildRow { id: string; name: string; tag: string; leaderName: string; bossKills: number; }
export interface GuildPanelData { myGuildId: string; guilds: GuildRow[]; roster: string[]; }
export interface GuildPanelHandlers { onCreate(name: string, tag: string): void; onJoin(guildId: string): void; onLeave(): void; }

export class GuildPanel {
  readonly el: HTMLDivElement;
  constructor(private handlers: GuildPanelHandlers) { /* construye el contenedor */ }
  mount(parent: HTMLElement): void { parent.appendChild(this.el); }
  setVisible(v: boolean): void { this.el.style.display = v ? "block" : "none"; }
  update(data: GuildPanelData): void { /* re-renderiza: si myGuildId==="" → form crear (inputs [data-guild-name],[data-guild-tag], botón [data-guild-create]) + lista de guilds vivas con botón unirse [data-guild-join="<id>"]; si tiene guild → nombre+tag+roster (lista de nombres) + botón salir [data-guild-leave] */ }
}
```

Requisitos concretos para que pasen los tests:
- Inputs con atributos `data-guild-name` y `data-guild-tag`; botón `data-guild-create` que llama `onCreate(nameInput.value, tagInput.value.toUpperCase())`.
- Con guild: el `textContent` incluye el nombre de la guild y cada nombre del roster; botón `data-guild-leave` que llama `onLeave()`.
- Cada guild viva en la lista de unirse: botón `data-guild-join="<id>"` que llama `onJoin(id)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/client -- GuildPanel`
Expected: PASS.

- [ ] **Step 5: Nameplate con tag + wiring en main.ts**

- Nameplate: donde se arma el texto del nameplate del jugador (en `EntityViews.ts`/`Nameplates.ts`), si el `PlayerState.guildTag` no está vacío, mostrar `[TAG] Nombre`; si cambia el `guildTag` en un update, refrescar el texto. Leer cómo se actualiza hoy el nameplate del jugador y seguir ese patrón (los otros jugadores exponen `guildTag` en su snapshot — extender el snapshot/vista de jugador con `guildTag` si hace falta, igual que se hizo con otros campos).
- `NetworkClient`: `sendCreateGuild(name,tag)`, `sendJoinGuild(id)`, `sendLeaveGuild()`; y un getter `getGuildPanelData()` que devuelva `{ myGuildId, guilds: [...state.guilds], roster: nombres de players cuyo guildId === myGuildId }`.
- `main.ts`: instanciar `GuildPanel`, `mount` en el HUD, tecla `g` toggle `setVisible`, cada frame (o al abrir) `guildPanel.update(net.getGuildPanelData())`, y cablear los 3 callbacks a los `send*`.

- [ ] **Step 6: Verificar tsc del cliente + smoke**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Run: `npm test --workspace @aden/client`
Expected: sin errores; suite verde.

Smoke opcional (no bloqueante; el WS no conecta en el sandbox): confirmar que la tecla `g` muestra el panel en el DOM sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add client/src/render/GuildPanel.ts client/src/render/GuildPanel.test.ts client/src/render/EntityViews.ts client/src/render/Nameplates.ts client/src/net/NetworkClient.ts client/src/main.ts
git commit -m "feat(client): panel de guild + tag en el nameplate"
```

---

### Task 5: verificación final + merge

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
git merge --no-ff etapa-9b-guilds -m "merge: Etapa 9b — Guilds (crear/unirse/salir, tag, fuego amigo)"
```

- [ ] **Step 5: Actualizar el ledger SDD** con tests totales y commits.

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (9b):** tabla `guilds` + loadGuild/saveGuild (Task 2), identidad de guild en el personaje (Task 2), GuildState + GameState.guilds registro vivo (Task 3), PlayerState guildId/guildTag/guildName (Task 3), mensajes crear/unirse/salir con validación de tag único (Task 3), fuego amigo (Task 3), hidratación/poda del registro vivo (Task 3), tag en nameplate + panel + roster (Task 4). `topGuilds`/bossKills-increment correctamente FUERA de alcance (9d/9c). Líder derivado de leaderName (sin guildRole). ✓
- **Sin placeholders:** todos los steps con código real; el único bloque descriptivo (GuildPanel.update) lista los atributos exactos que los tests exigen. ✓
- **Consistencia de tipos:** `GuildSave{id,name,tag,leaderName,bossKills}` igual en Task 2 y consumido en Task 3; `CharacterSave` gana los mismos 3 campos usados en onJoin/toCharacterSave; `pruneGuildIfEmpty(guildId)` misma firma; MessageTypes createGuild/joinGuild/leaveGuild consistentes cliente/servidor; `GuildState` fields (id/name/tag/leaderName/bossKills) iguales en schema y en GuildPanel `GuildRow`. ✓
- **Migraciones (controller):** tabla `guilds` (id text pk, name, tag, "leaderName", "bossKills" int default 0, created_at/updated_at) + `characters` gana "guildId"/"guildName"/"guildTag" text default ''. ✓
