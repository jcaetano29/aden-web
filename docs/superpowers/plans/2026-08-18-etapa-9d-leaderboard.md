# Etapa 9d — Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un panel de ranking (tecla `L`) con dos tablas — Jugadores (por nivel, desempate por kills PvP) y Guilds (por jefes matados) — que incluye a los offline, para cerrar el arco competitivo dándole a la gente una razón para volver a subir.

**Architecture:** El servidor calcula el ranking desde la persistencia (`topCharacters`/`topGuilds`, que incluyen a los offline) y lo MEZCLA con el estado vivo (jugadores online y guilds vivas, que pueden ir adelante del último save), lo ordena y sincroniza un snapshot chico (top 10 de cada uno) en `GameState.leaderboard` cada ~15s. El cliente lee ese snapshot y lo dibuja en un panel.

**Tech Stack:** TypeScript monorepo (npm workspaces), Colyseus 0.15 (Schema/@type/ArraySchema), Three.js client, vitest, @colyseus/testing (E2E), Supabase.

**Spec:** `docs/superpowers/specs/2026-08-18-arco-competitivo-pvp-guilds-boss-design.md` (sección "9d — Leaderboard").

## Global Constraints

- Campos sincronizados con `@type(...)`; server-only sin `@type`.
- Verificación estricta: `npx tsc -p <ws>/tsconfig.json --noEmit` limpio en shared/server/client + tests.
- 0 artefactos.
- Este plan cubre SOLO 9d y CIERRA el arco competitivo. No hay migración nueva (se leen columnas ya existentes: characters.level/pvpKills/className, guilds.bossKills/name/tag).
- No se agregan mensajes nuevos al protocolo: el ranking viaja como estado sincronizado (`GameState.leaderboard`), no por request/response.

---

### Task 1: server — consultas de ranking en la persistencia

**Files:**
- Modify: `server/src/persistence/PersistenceService.ts` (interfaz + `InMemoryPersistence`: `topCharacters`/`topGuilds` + tipos `CharacterRank`/`GuildRank`)
- Modify: `server/src/persistence/SupabasePersistence.ts` (implementar ambos con `.order().limit()`)
- Test: `server/src/persistence/PersistenceService.test.ts`

**Interfaces:**
- Produces:
  - `export interface CharacterRank { name: string; level: number; pvpKills: number; className: string; }`
  - `export interface GuildRank { name: string; tag: string; bossKills: number; }`
  - `PersistenceService.topCharacters(limit: number): Promise<CharacterRank[]>` — orden nivel desc, desempate pvpKills desc.
  - `PersistenceService.topGuilds(limit: number): Promise<GuildRank[]>` — orden bossKills desc.
- Consumes: el `store: Map<string, CharacterSave>` y `guilds: Map<string, GuildSave>` ya existentes en `InMemoryPersistence`.

- [ ] **Step 1: Write the failing tests**

Agregar a `server/src/persistence/PersistenceService.test.ts` (dentro del describe de `InMemoryPersistence`):

```ts
it("topCharacters ordena por nivel desc, desempata por pvpKills desc y respeta el límite", async () => {
  const svc = new InMemoryPersistence();
  const base = { exp: 0, pos_x: 0, pos_z: 0, inventory: {}, gold: 0, questId: "q1", questProgress: 0, className: "knight", guildId: "", guildName: "", guildTag: "" };
  await svc.save("Bajo",  { ...base, level: 2, pvpKills: 0 });
  await svc.save("AltoA", { ...base, level: 9, pvpKills: 1 });
  await svc.save("AltoB", { ...base, level: 9, pvpKills: 7 });
  const top = await svc.topCharacters(2);
  expect(top.map((c) => c.name)).toEqual(["AltoB", "AltoA"]); // mismo nivel, más pvpKills primero; "Bajo" queda fuera por el límite
  expect(top[0]).toEqual({ name: "AltoB", level: 9, pvpKills: 7, className: "knight" });
});

it("topGuilds ordena por bossKills desc y respeta el límite", async () => {
  const svc = new InMemoryPersistence();
  await svc.saveGuild({ id: "a", name: "A", tag: "AAA", leaderName: "x", bossKills: 1 });
  await svc.saveGuild({ id: "b", name: "B", tag: "BBB", leaderName: "y", bossKills: 5 });
  await svc.saveGuild({ id: "c", name: "C", tag: "CCC", leaderName: "z", bossKills: 3 });
  const top = await svc.topGuilds(2);
  expect(top.map((g) => g.tag)).toEqual(["BBB", "CCC"]);
  expect(top[0]).toEqual({ name: "B", tag: "BBB", bossKills: 5 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: FAIL (métodos inexistentes).

- [ ] **Step 3: Implement**

En `server/src/persistence/PersistenceService.ts`:
- Agregar los tipos exportados y los métodos a la interfaz:

```ts
export interface CharacterRank { name: string; level: number; pvpKills: number; className: string; }
export interface GuildRank { name: string; tag: string; bossKills: number; }
```

```ts
// dentro de interface PersistenceService:
  topCharacters(limit: number): Promise<CharacterRank[]>;
  topGuilds(limit: number): Promise<GuildRank[]>;
```

- En `InMemoryPersistence`:

```ts
async topCharacters(limit: number): Promise<CharacterRank[]> {
  return [...this.store.entries()]
    .map(([name, c]) => ({ name, level: c.level, pvpKills: c.pvpKills, className: c.className }))
    .sort((a, b) => b.level - a.level || b.pvpKills - a.pvpKills)
    .slice(0, limit);
}

async topGuilds(limit: number): Promise<GuildRank[]> {
  return [...this.guilds.values()]
    .map((g) => ({ name: g.name, tag: g.tag, bossKills: g.bossKills }))
    .sort((a, b) => b.bossKills - a.bossKills)
    .slice(0, limit);
}
```

(Nota: el nombre del store de guilds en InMemory es `this.guilds`; si el campo tiene otro nombre, usar ese. El store de personajes es `this.store` con clave = nombre.)

En `server/src/persistence/SupabasePersistence.ts` (importar `CharacterRank`/`GuildRank`):

```ts
async topCharacters(limit: number): Promise<CharacterRank[]> {
  const { data, error } = await this.client
    .from("characters")
    .select("name,level,pvpKills,className")
    .order("level", { ascending: false })
    .order("pvpKills", { ascending: false })
    .limit(limit);
  if (error) { console.error("[aden] SupabasePersistence.topCharacters error:", error.message); return []; }
  return (data ?? []).map((r) => ({ name: r.name, level: r.level, pvpKills: (r.pvpKills as number) ?? 0, className: r.className ?? "knight" }));
}

async topGuilds(limit: number): Promise<GuildRank[]> {
  const { data, error } = await this.client
    .from("guilds")
    .select("name,tag,bossKills")
    .order("bossKills", { ascending: false })
    .limit(limit);
  if (error) { console.error("[aden] SupabasePersistence.topGuilds error:", error.message); return []; }
  return (data ?? []).map((r) => ({ name: r.name, tag: r.tag, bossKills: (r.bossKills as number) ?? 0 }));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --workspace @aden/server -- PersistenceService`
Expected: PASS.

- [ ] **Step 5: Strict tsc**

Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add server/src/persistence/PersistenceService.ts server/src/persistence/SupabasePersistence.ts server/src/persistence/PersistenceService.test.ts
git commit -m "feat(server): consultas de ranking (topCharacters/topGuilds)"
```

---

### Task 2: server — estado del leaderboard + refresco periódico

**Files:**
- Create: `server/src/state/LeaderboardState.ts` (LeaderPlayerEntry, LeaderGuildEntry, LeaderboardState)
- Modify: `server/src/state/GameState.ts` (`@type(LeaderboardState) leaderboard`)
- Modify: `server/src/rooms/GameRoom.ts` (`refreshLeaderboard()` + intervalo 15s + refresco inicial)
- Test: `server/src/rooms/GameRoom.test.ts`

**Interfaces:**
- Consumes: `topCharacters`/`topGuilds`/`CharacterRank`/`GuildRank` (Task 1); `this.state.players` (online) y `this.state.guilds` (vivas).
- Produces:
  - `LeaderboardState` con `@type([LeaderPlayerEntry]) players` y `@type([LeaderGuildEntry]) guilds` (ArraySchema).
  - `GameState.leaderboard: LeaderboardState`.
  - `private refreshLeaderboard(): Promise<void>` (mezcla persistencia + estado vivo, ordena, top 10, reescribe los ArraySchema).

- [ ] **Step 1: Write the failing E2E tests**

Agregar a `server/src/rooms/GameRoom.test.ts`:

```ts
describe("Leaderboard (Etapa 9d)", () => {
  it("incluye guilds vivas y jugadores online con sus stats actuales", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Campeon", className: "knight" });
    a.send("createGuild", { name: "Los Reyes", tag: "KING" });
    await room.waitForNextSimulationTick();
    const pa = room.state.players.get(a.sessionId)!;
    pa.level = 9;
    room.state.guilds.get(pa.guildId)!.bossKills = 5;
    await (room as any).refreshLeaderboard();
    const guilds = [...room.state.leaderboard.guilds];
    const players = [...room.state.leaderboard.players];
    expect(guilds.some((g: any) => g.tag === "KING" && g.bossKills === 5)).toBe(true);
    expect(players.some((p: any) => p.name === "Campeon" && p.level === 9)).toBe(true);
  });

  it("ordena jugadores por nivel desc y guilds por bossKills desc", async () => {
    const room = await colyseus.createRoom("game", {});
    const a = await colyseus.connectTo(room, { name: "Nivel3", className: "knight" });
    const b = await colyseus.connectTo(room, { name: "Nivel8", className: "mage" });
    room.state.players.get(a.sessionId)!.level = 3;
    room.state.players.get(b.sessionId)!.level = 8;
    await (room as any).refreshLeaderboard();
    const players = [...room.state.leaderboard.players].map((p: any) => p.name);
    expect(players.indexOf("Nivel8")).toBeLessThan(players.indexOf("Nivel3"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: FAIL (no existe `leaderboard`/`refreshLeaderboard`).

- [ ] **Step 3: Implement**

Crear `server/src/state/LeaderboardState.ts`:

```ts
import { Schema, type, ArraySchema } from "@colyseus/schema";

export class LeaderPlayerEntry extends Schema {
  @type("string") name = "";
  @type("number") level = 1;
  @type("number") pvpKills = 0;
  @type("string") className = "knight";
}

export class LeaderGuildEntry extends Schema {
  @type("string") name = "";
  @type("string") tag = "";
  @type("number") bossKills = 0;
}

export class LeaderboardState extends Schema {
  @type([LeaderPlayerEntry]) players = new ArraySchema<LeaderPlayerEntry>();
  @type([LeaderGuildEntry]) guilds = new ArraySchema<LeaderGuildEntry>();
}
```

En `server/src/state/GameState.ts`: importar `LeaderboardState` y agregar

```ts
  @type(LeaderboardState) leaderboard = new LeaderboardState();
```

En `server/src/rooms/GameRoom.ts`:
- Imports: `LeaderboardState, LeaderPlayerEntry, LeaderGuildEntry` de `../state/LeaderboardState.js`.
- En `onCreate`, junto al otro `clock.setInterval` (el de `saveAll`), agregar el refresco periódico y uno inicial:

```ts
this.clock.setInterval(() => { void this.refreshLeaderboard(); }, 15000);
void this.refreshLeaderboard();
```

- Método (junto a los otros helpers privados):

```ts
/** Recalcula el snapshot del leaderboard: persistencia (incluye offline) mezclada con el estado vivo (online), ordenada, top 10. */
private async refreshLeaderboard(): Promise<void> {
  const [chars, guilds] = await Promise.all([
    this.persistence.topCharacters(20),
    this.persistence.topGuilds(20),
  ]);

  // Jugadores: mezcla por nombre, el estado vivo pisa al persistido (stats más frescas).
  const pByName = new Map<string, CharacterRank>();
  for (const c of chars) pByName.set(c.name, c);
  this.state.players.forEach((pl) => {
    pByName.set(pl.name, { name: pl.name, level: pl.level, pvpKills: pl.pvpKills, className: pl.className });
  });
  const players = [...pByName.values()]
    .sort((a, b) => b.level - a.level || b.pvpKills - a.pvpKills)
    .slice(0, 10);

  // Guilds: mezcla por tag, las guilds vivas pisan a las persistidas.
  const gByTag = new Map<string, GuildRank>();
  for (const g of guilds) gByTag.set(g.tag, g);
  this.state.guilds.forEach((g) => {
    gByTag.set(g.tag, { name: g.name, tag: g.tag, bossKills: g.bossKills });
  });
  const gl = [...gByTag.values()]
    .sort((a, b) => b.bossKills - a.bossKills)
    .slice(0, 10);

  this.state.leaderboard.players.splice(0);
  for (const p of players) {
    const e = new LeaderPlayerEntry();
    e.name = p.name; e.level = p.level; e.pvpKills = p.pvpKills; e.className = p.className;
    this.state.leaderboard.players.push(e);
  }
  this.state.leaderboard.guilds.splice(0);
  for (const g of gl) {
    const e = new LeaderGuildEntry();
    e.name = g.name; e.tag = g.tag; e.bossKills = g.bossKills;
    this.state.leaderboard.guilds.push(e);
  }
}
```

Importar `CharacterRank`, `GuildRank` de `../persistence/PersistenceService.js`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --workspace @aden/server -- GameRoom`
Expected: PASS.

- [ ] **Step 5: Full server suite + strict tsc**

Run: `npm test --workspace @aden/server`
Run: `npx tsc -p server/tsconfig.json --noEmit`
Expected: verde y sin errores.

- [ ] **Step 6: Commit**

```bash
git add server/src/state/LeaderboardState.ts server/src/state/GameState.ts server/src/rooms/GameRoom.ts server/src/rooms/GameRoom.test.ts
git commit -m "feat(server): estado del leaderboard + refresco periódico (persistencia + vivo)"
```

---

### Task 3: cliente — panel de leaderboard (tecla L)

**Files:**
- Create: `client/src/render/LeaderboardPanel.ts`
- Create: `client/src/render/LeaderboardPanel.test.ts`
- Modify: `client/src/net/NetworkClient.ts` (`getLeaderboardData()`)
- Modify: `client/src/main.ts` (instanciar, tecla `L` toggle, update)

**Interfaces:**
- Consumes: `GameState.leaderboard.players` (name/level/pvpKills/className) y `.guilds` (name/tag/bossKills) del estado sincronizado; el patrón de paneles DOM existente (`GuildPanel.ts`) y el guard de foco en hotkeys ya agregado en 9b.
- Produces:
  - `NetworkClient.getLeaderboardData(): { players: {name,level,pvpKills,className}[]; guilds: {name,tag,bossKills}[] }`.
  - `LeaderboardPanel` con `mount(parent)`, `setVisible(v)`, `update(data)` (con signature-guard para no redibujar por frame).

- [ ] **Step 1: Unit test del panel (jsdom)**

Test: `client/src/render/LeaderboardPanel.test.ts` (usa `// @vitest-environment jsdom`, jsdom ya es devDependency):

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { LeaderboardPanel } from "./LeaderboardPanel.js";

describe("LeaderboardPanel", () => {
  it("dibuja filas de jugadores y de guilds", () => {
    const panel = new LeaderboardPanel();
    panel.update({
      players: [{ name: "Aragorn", level: 9, pvpKills: 4, className: "knight" }],
      guilds: [{ name: "Los Lobos", tag: "WOLF", bossKills: 3 }],
    });
    expect(panel.el.textContent).toContain("Aragorn");
    expect(panel.el.textContent).toContain("9");
    expect(panel.el.textContent).toContain("WOLF");
    expect(panel.el.textContent).toContain("Los Lobos");
  });

  it("con listas vacías muestra un placeholder y no crashea", () => {
    const panel = new LeaderboardPanel();
    panel.update({ players: [], guilds: [] });
    expect(panel.el).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @aden/client -- LeaderboardPanel`
Expected: FAIL (no existe).

- [ ] **Step 3: Implement `LeaderboardPanel.ts`**

Panel DOM al estilo de `GuildPanel.ts` (posición absoluta centrado, fondo semitransparente, oculto por defecto). API:

```ts
export interface LeaderPlayerRow { name: string; level: number; pvpKills: number; className: string; }
export interface LeaderGuildRow { name: string; tag: string; bossKills: number; }
export interface LeaderboardData { players: LeaderPlayerRow[]; guilds: LeaderGuildRow[]; }

export class LeaderboardPanel {
  readonly el: HTMLDivElement;
  private lastSignature: string | null = null;
  constructor() { /* contenedor con dos secciones: "Jugadores" y "Guilds" */ }
  mount(parent: HTMLElement): void { parent.appendChild(this.el); }
  setVisible(v: boolean): void { this.el.style.display = v ? "block" : "none"; }
  update(data: LeaderboardData): void {
    const sig = JSON.stringify(data);
    if (sig === this.lastSignature) return; // no redibujar si no cambió
    this.lastSignature = sig;
    /* render: tabla Jugadores (# / Nombre / Nivel / Kills PvP) y tabla Guilds (# / [TAG] Nombre / Jefes); placeholder "Sin datos" si una lista está vacía */
  }
}
```

Requisitos concretos para los tests: con datos, el `textContent` incluye el nombre del jugador, su nivel (como texto), el tag y el nombre de la guild. Con listas vacías, no lanza y el elemento existe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @aden/client -- LeaderboardPanel`
Expected: PASS.

- [ ] **Step 5: Wiring en NetworkClient + main.ts**

- `NetworkClient.getLeaderboardData()`: leer `this.room.state.leaderboard` y devolver `{ players: [...leaderboard.players].map(...), guilds: [...leaderboard.guilds].map(...) }` (mapear cada entry a objeto plano). Guardar contra `leaderboard` indefinido antes del primer sync (devolver `{players:[],guilds:[]}`).
- `main.ts`: instanciar `LeaderboardPanel`, `mount` en el HUD, tecla `L`/`l` toggle `setVisible` (el guard de foco de inputs ya agregado en 9b cubre esta tecla), y cuando esté visible llamar `panel.update(net.getLeaderboardData())` cada frame (el signature-guard evita el redibujo constante).

- [ ] **Step 6: Verificar tsc del cliente + smoke**

Run: `npx tsc -p client/tsconfig.json --noEmit`
Run: `npm test --workspace @aden/client`
Expected: sin errores; suite verde.

Smoke opcional (WS no conecta en el sandbox): la tecla `L` muestra el panel en el DOM sin errores de consola. Datos en vivo → pendiente-usuario.

- [ ] **Step 7: Commit**

```bash
git add client/src/render/LeaderboardPanel.ts client/src/render/LeaderboardPanel.test.ts client/src/net/NetworkClient.ts client/src/main.ts
git commit -m "feat(client): panel de leaderboard (tecla L)"
```

---

### Task 4: verificación final + merge

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
git merge --no-ff etapa-9d-leaderboard -m "merge: Etapa 9d — Leaderboard (ranking de jugadores y guilds) — cierra el arco competitivo"
```

- [ ] **Step 5: Actualizar el ledger SDD** con tests totales y commits.

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (9d):** topCharacters/topGuilds en persistencia InMemory+Supabase (Task 1), incluye offline (persistencia) + online (mezcla con estado vivo) (Task 2), snapshot sincronizado `GameState.leaderboard` con refresco ~15s (Task 2), panel tecla `L` con 2 tablas Jugadores/Guilds (Task 3). Sin mensaje nuevo (viaja como estado). Sin migración. ✓
- **Sin placeholders:** todo el código real; los bloques `/* ... */` de los paneles listan los requisitos exactos que exigen los tests (nombre/nivel/tag/nombre-guild presentes; placeholder si vacío). ✓
- **Consistencia de tipos:** `CharacterRank{name,level,pvpKills,className}` / `GuildRank{name,tag,bossKills}` (Task 1) consumidos en `refreshLeaderboard` (Task 2); `LeaderPlayerEntry`/`LeaderGuildEntry` campos == `getLeaderboardData` == `LeaderPlayerRow`/`LeaderGuildRow` del panel (Task 3). El intervalo usa `refreshLeaderboard` (mismo nombre que el test invoca vía `(room as any)`). ✓
