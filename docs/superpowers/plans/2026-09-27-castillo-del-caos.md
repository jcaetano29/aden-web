# Castillo del Caos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arena todos contra todos cada 2 horas (tramos Menor 10–19 y Mayor 20+ alternados), con entrada por Sello del Caos, piso que se derrumba por anillos, puntos y premios.

**Architecture:** Reglas puras en `shared/src/chaosCastle.ts`; un `ChaosCastleSystem` server-side con reloj/azar inyectados y una interfaz `CastleHost` hacia `GameRoom`; estado visible en `ChaosCastleState` dentro de `GameState`; el cliente lo muestra en un cartel propio, el diálogo del Custodio y la arena `castillo`.

**Tech Stack:** TypeScript, Colyseus 0.15, Three.js, Vitest, `@colyseus/testing`.

**Spec:** `docs/superpowers/specs/2026-09-27-castillo-del-caos-design.md`

## Global Constraints

- Cupo 16 participantes (jugadores + Guardias); daño entre jugadores ×0,5; puntos 2 por monstruo y 1 por jugador.
- Inscripción 5 min antes; partida máxima 10 min; aviso de derrumbe 5 s; derrumbes a 12 y 8 vivos o a 2:30 y 5:00 de partida.
- Plataforma 60×60 centrada en (900, 300); anillos por distancia Chebyshev: borde 20–30, medio 10–20, centro 0–10; afuera de 30 = abismo.
- Horario: horas pares de Argentina a la media hora (UTC−3): Menor 00:30/04:30/08:30/12:30/16:30/20:30, Mayor 02:30/06:30/10:30/14:30/18:30/22:30.
- Premios: ganador 2 gemas + oro (Menor 1.500 / Mayor 4.000); 2.º y 3.º 1 gema; EXP = puntos × (120 / 400).
- Sello del Caos (`chaos_seal`): apilable, intercambiable, Raro, nivel 10; chances normal 0,5 % / élite 3 % / cofre 3 % / jefe 10 %; invasor 2 garantizados públicos; nunca dentro del castillo ni de barriles; no se vende.
- Guardias del Caos sin botín ni EXP por muerte.
- Programación automática apagada con `VITEST` o `ADEN_EVENTS=off`.
- Cambio de schema: se publica junto (push a master). Push solo con OK del usuario.
- Textos en español rioplatense. Editar con el Edit tool o el helper del scratchpad (finales de línea mixtos).

---

### Task 1: Reglas puras y contenido base

**Files:** Create `shared/src/chaosCastle.ts`, `shared/src/chaosCastle.test.ts`; Modify `shared/src/index.ts`, `shared/src/world.ts` (zona `castillo`, `Zone.hidden?`), `shared/src/npcs.ts` (`chaos_keeper`), `shared/src/items.ts` (`chaos_seal`), `shared/src/mobs.ts`, `shared/src/combat.ts`, `shared/src/progression.ts` (guardias), `server/src/rooms/GameRoom.ts` (`WarpTo` rechaza ocultas; al entrar con mapa oculto guardado → pueblo), `client/src/render/MapPanel.ts` (no lista ocultas) y lo que exijan los tests que recorren todos los mapas (música en `client/src/audio/score.ts`, ambientación, terreno).

**Interfaces — Produces:**

```ts
export type CastleBracket = 'menor' | 'mayor';
export const CASTLE_MAP = 'castillo';
export const CASTLE_CENTER = { x: 900, z: 300 };
export const CASTLE_CAPACITY = 16, CASTLE_PVP_FACTOR = 0.5, CASTLE_POINTS_MONSTER = 2, CASTLE_POINTS_PLAYER = 1;
export const CASTLE_REGISTRATION_MS = 300_000, CASTLE_DURATION_MS = 600_000, CASTLE_COLLAPSE_WARNING_MS = 5_000;
export const CASTLE_COLLAPSES: readonly { alive: number; atMs: number }[]; // [{12,150000},{8,300000}]
export const CASTLE_BRACKETS: Record<CastleBracket, { name: string; minLevel: number; maxLevel: number; guard: string; gold: number; expPerPoint: number }>;
export const CHAOS_SEAL = 'chaos_seal';
export const CHAOS_SEAL_CHANCE: Record<LootSource, number>;
export function nextCastle(now: number): { startsAt: number; bracket: CastleBracket };
export function castleBracket(level: number): CastleBracket | null;
export function ringAt(x: number, z: number): 0 | 1 | 2 | 3; // 0 = abismo, 1 borde, 2 medio, 3 centro
export function fallsAt(x: number, z: number, collapsed: number): boolean; // abismo o anillo ≤ collapsed
```

- [ ] **Step 1: Test que falla** (`chaosCastle.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { nextCastle, castleBracket, ringAt, fallsAt, CHAOS_SEAL_CHANCE, CASTLE_BRACKETS, CASTLE_CENTER, getZone, getItem, getNpc, getTemplate, ZONES } from './index.js';

describe('Chaos Castle rules', () => {
  it('opens at half past even Argentina hours, alternating brackets', () => {
    const at = (iso: string) => nextCastle(Date.parse(iso));
    expect(at('2026-09-27T03:00:00Z')).toEqual({ startsAt: Date.parse('2026-09-27T03:30:00Z'), bracket: 'menor' });   // 00:30 ART
    expect(at('2026-09-27T03:30:00Z')).toEqual({ startsAt: Date.parse('2026-09-27T05:30:00Z'), bracket: 'mayor' });   // 02:30 ART
    expect(at('2026-09-27T23:00:00Z').bracket).toBe('menor');                                                        // 20:30 ART
    expect(at('2026-09-28T00:00:00Z')).toEqual({ startsAt: Date.parse('2026-09-28T01:30:00Z'), bracket: 'mayor' });   // 22:30 ART
  });
  it('splits levels into two brackets', () => {
    expect(castleBracket(9)).toBeNull();
    expect(castleBracket(10)).toBe('menor'); expect(castleBracket(19)).toBe('menor');
    expect(castleBracket(20)).toBe('mayor'); expect(castleBracket(40)).toBe('mayor');
  });
  it('knows the rings and who falls', () => {
    const { x, z } = CASTLE_CENTER;
    expect(ringAt(x, z)).toBe(3); expect(ringAt(x + 15, z - 5)).toBe(2); expect(ringAt(x - 25, z + 29)).toBe(1); expect(ringAt(x + 31, z)).toBe(0);
    expect(fallsAt(x + 25, z, 0)).toBe(false); expect(fallsAt(x + 25, z, 1)).toBe(true);
    expect(fallsAt(x + 15, z, 1)).toBe(false); expect(fallsAt(x + 15, z, 2)).toBe(true);
    expect(fallsAt(x, z, 2)).toBe(false); expect(fallsAt(x + 31, z, 0)).toBe(true);
  });
  it('defines the seal, the keeper, the guards and a hidden arena', () => {
    expect(CHAOS_SEAL_CHANCE).toEqual({ normal: 0.005, elite: 0.03, chest: 0.03, boss: 0.1 });
    expect(getItem('chaos_seal')).toMatchObject({ name: 'Sello del Caos', stackable: true, rarity: 'rare', requiredLevel: 10 });
    expect(getNpc('chaos_keeper').mapId).toBe('pueblo');
    expect(getTemplate(CASTLE_BRACKETS.menor.guard).level).toBe(15);
    expect(getTemplate(CASTLE_BRACKETS.mayor.guard).level).toBe(25);
    expect(getZone('castillo').hidden).toBe(true);
    expect(ZONES.filter(z => z.hidden).map(z => z.id)).toEqual(['castillo']);
  });
});
```

- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `nextCastle`: `const H = 3_600_000, anchor = 3.5 * H; let t = Math.floor((now - anchor) / (2 * H)) * 2 * H + anchor; if (t <= now) t += 2 * H;` bracket: `((new Date(t).getUTCHours() - 3 + 24) % 24) % 4 === 0 ? 'menor' : 'mayor'`.
  - `ringAt`: `d = max(|x-cx|, |z-cz|)`; `d > 30 → 0`, `d > 20 → 1`, `d > 10 → 2`, si no `3`. `fallsAt(x, z, collapsed) = ring === 0 || ring <= collapsed`.
  - `CASTLE_BRACKETS`: `menor: { name: 'Castillo del Caos Menor', minLevel: 10, maxLevel: 19, guard: 'chaos_guard_minor', gold: 1500, expPerPoint: 120 }`, `mayor: { name: 'Castillo del Caos Mayor', minLevel: 20, maxLevel: 40, guard: 'chaos_guard_major', gold: 4000, expPerPoint: 400 }`.
  - `world.ts`: `hidden?: boolean` en `Zone` ("Sólo se entra por un evento: no se lista ni se puede viajar"); zona `{ id: 'castillo', name: 'Castillo del Caos', subtitle: 'Sólo queda uno', center: { x: 900, z: 300 }, bounds: { minX: 835, maxX: 965, minZ: 235, maxZ: 365 }, spawn: { x: 900, z: 300 }, levelReq: 10, levelMin: 10, levelMax: 40, safe: false, hidden: true, biome: { ground: 0x2b2530, fog: 0x0d0a12, fogNear: 30, fogFar: 110, accent: 0xc0392b } }`.
  - `npcs.ts`: `{ id: 'chaos_keeper', name: 'Custodio del Caos', role: 'elder', appearance: <la de un guardián existente>, mapId: 'pueblo', x: -12, z: 8 }` (ajustar para no pisar otros NPC ni estructuras de la plaza).
  - `items.ts` (`ITEM_TEMPLATES`): `chaos_seal: { id: 'chaos_seal', name: 'Sello del Caos', type: 'material', stackable: true, rarity: 'rare', requiredLevel: 10, description: 'Entregalo al Custodio del Caos, en el pueblo, para entrar al Castillo del Caos de tu tramo.' }`.
  - Guardias: `chaos_guard_minor` (nivel 15, `rank: 'normal'`, modelo `DreadKnight`, tinte 0x8a2a2a, `respawnMs: 0`) y `chaos_guard_major` (25, tinte 0x5a1a1a); `MOB_COMBAT` iniciales `{ maxHp: 1400, pAtk: 95, pDef: 50, attackCooldownMs: 2400 }` y `{ maxHp: 1600, pAtk: 125, pDef: 66, attackCooldownMs: 2400 }` (la Task 7 calibra); `MOB_EXP` 0.
  - `GameRoom`: en `WarpTo`, `if (zone.hidden) return;`. Al cargar un personaje cuyo `mapId` guardado sea oculto → pueblo (spawn).
  - `MapPanel.render`: `ZONES.filter(z => !z.hidden)`.
  - Correr las suites de `shared`, `server` y `client`, y completar lo que pidan los tests que recorren `ZONES` (música, ambientación, navegación, terreno) con entradas para `castillo`.
- [ ] **Step 4:** suites en verde.
- [ ] **Step 5: Commit** `feat: add Chaos Castle rules, the seal, its keeper and the hidden arena`.

---

### Task 2: El Sello del Caos cae como botín

**Files:** Modify `server/src/rooms/GameRoom.ts` (`dropLoot`), `server/src/systems/EventSystem.ts` (+ `EventHost.dropPublic`); Test: `server/src/rooms/LootDrops.test.ts`, `server/src/systems/EventSystem.test.ts`.

- [ ] **Step 1: Tests que fallan:**
  - `LootDrops.test.ts`: con `Math.random` fijo en 0.001, matar un `ember_imp` en `fragua` suelta un `chaos_seal`; con 0.9 no. En `castillo`, un `chaos_guard_minor` muerto no suelta nada.
  - `EventSystem.test.ts`: al resolver una invasión con daño registrado, `dropPublic` recibe `('chaos_seal', 2, …)`.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - En `dropLoot`: `if (mapId === CASTLE_MAP) return;` al inicio. Después del botín del catálogo, `if (lootId !== 'breakable' && Math.random() < CHAOS_SEAL_CHANCE[lootSourceFor(lootId)]) drops.push({ itemTemplateId: CHAOS_SEAL, qty: 1 });`.
  - `EventHost.dropPublic(itemId: string, qty: number, x: number, z: number, mapId: string): void`; en `resolve`, `this.host.dropPublic(CHAOS_SEAL, 2, boss.x, boss.z, cur.mapId)`. En `GameRoom`, implementarlo como `dropLoot` sin reserva.
- [ ] **Step 4:** tests en verde.
- [ ] **Step 5: Commit** `feat: drop Chaos Seals from enemies, chests, bosses and invaders`.

---

### Task 3: Ciclo del castillo (inscripción, arranque, cierre)

**Files:** Create `server/src/state/ChaosCastleState.ts`, `server/src/systems/ChaosCastleSystem.ts`, `server/src/rooms/ChaosCastle.test.ts`; Modify `server/src/state/GameState.ts`, `server/src/rooms/GameRoom.ts`.

**Interfaces — Produces:**

```ts
// ChaosCastleState
export class ChaosCastleState extends Schema {
  @type('string') phase = '';        // '' | 'registration' | 'active'
  @type('string') bracket = '';
  @type('number') startsAt = 0;
  @type('number') endsAt = 0;
  @type('number') registered = 0;
  @type('number') alive = 0;         // jugadores vivos adentro
  @type('number') monsters = 0;      // guardias vivos
  @type('number') ring = 0;          // anillos caídos (0–2)
  @type('number') collapseAt = 0;    // epoch del próximo derrumbe (0 = ninguno)
  @type({ map: 'number' }) points = new MapSchema<number>();
}

// ChaosCastleSystem
export interface CastleHost {
  state: GameState; now(): number; rng(): number;
  announce(text: string): void;
  notify(playerId: string, text: string, success?: boolean): void;
  isOnline(playerId: string): boolean;
  teleport(playerId: string, mapId: string, x: number, z: number): void; // revive con vida completa
  spawnGuard(id: string, templateId: string, x: number, z: number): MobState;
  takeSeal(playerId: string): boolean;
  giveItem(playerId: string, itemId: string, qty: number): void;
  reward(playerId: string, gold: number, exp: number, items: string[]): void;
}
export class ChaosCastleSystem {
  constructor(host: CastleHost, options?: { scheduled?: boolean });
  readonly host: CastleHost;
  tick(): void;
  openNow(bracket: CastleBracket, leadMs?: number): void;
  register(playerId: string): { success: boolean; text: string };
  isParticipant(playerId: string): boolean;
}
```

- [ ] **Step 1: Test E2E que falla** (`ChaosCastle.test.ts`, `boot(config, 2601)`, reloj manual en `room.castle.host.now`):
  - `openNow('menor', 60_000)`: `castle.phase === 'registration'`. Un jugador de nivel 15 con sello, junto al Custodio, se inscribe (`InteractNpc 'chaos_keeper'`): el sello se consume y `registered === 1`. Uno de nivel 25 es rechazado; otro de nivel 12 sin sello, también.
  - Con un solo inscripto, avanzar 60 s: se cancela, el sello vuelve y `phase === ''`.
  - Con 2 inscriptos: al iniciar, ambos están en `castillo` sobre el anillo 1; `monsters === 14`; `phase === 'active'`.
  - Avanzar 10 min: termina, ambos vuelven al `pueblo`, no quedan guardias y `phase === ''`.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar** el ciclo:
  - Programado: `nextCastle(now)`; abrir la inscripción a `startsAt − 5 min` (solo con `scheduled`). Anuncio: `⚔ Abrió la inscripción al {nombre} (nivel {min}–{max}): entregá un Sello del Caos al Custodio en el pueblo. Empieza en 5 minutos.`
  - `register(playerId)`: exige fase de inscripción, `castleBracket(level) === bracket`, no inscripto y `takeSeal` → `{ success: true, text: 'Quedaste inscripto en el {nombre}. Estate conectado cuando empiece.' }`. Si no, texto explicativo.
  - Arranque en `startsAt`: filtrar inscriptos conectados. Con menos de 2: `giveItem(id, CHAOS_SEAL, 1)` a todos los inscriptos, anuncio `El {nombre} se suspendió: no hubo suficientes inscriptos. Les devolvimos el sello.` y cierre. Con 2 o más: teletransportar a puntos al azar del anillo 1 (`d` entre 22 y 28), crear `16 − jugadores` guardias (`castle_guard_{n}`) en puntos al azar de la plataforma y `points.set(id, 0)`. Anuncio `⚔ ¡Empezó el {nombre}! Sólo puede quedar uno.`
  - Cierre por tiempo en `endsAt` (en esta tarea, sin premios): devolver a los vivos al pueblo, borrar guardias, limpiar el estado y programar el siguiente.
  - `GameRoom`:
    - `this.castle = new ChaosCastleSystem(host, { scheduled: … })` como las invasiones; `tick()` al final del tick.
    - `InteractNpc` con `chaos_keeper` → `register`, con `ItemResult`.
    - `teleport` revive y mueve (`p.dead=false; hp/mp llenos; mapId; x/z/target; moving=false; targetId=''`).
    - `spawnGuard` usa `spawnMob`. `takeSeal`/`giveItem` usan el inventario (`removeItem`/`addToInventory`); `isOnline` mira `this.clients`.
- [ ] **Step 4:** tests en verde; suite del server en verde.
- [ ] **Step 5: Commit** `feat: run Chaos Castle registration, start and closing`.

---

### Task 4: Reglas de combate adentro

**Files:** Modify `server/src/systems/ChaosCastleSystem.ts`, `server/src/rooms/GameRoom.ts`; Test: `server/src/rooms/ChaosCastle.test.ts`.

**Interfaces — Produces:** `pvpFactor(a: string, b: string): number | null` (0.5 si ambos son participantes vivos, si no `null`); `onPlayerDeath(victimId: string, killerId?: string): boolean`; `onMobKilled(mobId: string, killerId?: string): void`; `eliminate(playerId: string, reason: 'fall' | 'left' | 'disconnect' | 'death'): void`.

- [ ] **Step 1: Tests que fallan** (partida activa con dos jugadores del mismo gremio y guardias aturdidos):
  - Pueden pegarse con golpe automático y el daño es la mitad de lo que haría fuera. Comparar con el mismo golpe con `Math.random` fijo y `CASTLE_PVP_FACTOR`.
  - Matar un guardia suma 2 puntos y no deja botín ni EXP.
  - Matar al otro jugador suma 1 punto. El caído vuelve al pueblo vivo, con la vida llena y sin perder oro ni EXP, y `alive` baja.
  - Un participante que usa `WarpTo` queda eliminado y en el pueblo; uno que se desconecta, también.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `areAllies(a, b)`: `false` si ambos son participantes.
  - En el daño de skills PvP (`power` para `t.kind === 'player'`) y del golpe automático PvP (`resolveAttack(p, victim, 1, …)`): multiplicar por `this.castle.pvpFactor(attackerId, victimId) ?? 1`.
  - `killPlayer`: al inicio, `if (this.castle.onPlayerDeath(victimId, killerId)) return;`. El sistema suma el punto al asesino, elimina y teletransporta.
  - `killMob`: si el mob es un guardia del castillo → `this.castle.onMobKilled(mobId, killerId)`. En esas muertes no hay EXP (`MOB_EXP` 0) ni botín (Task 2).
  - `WarpTo`: si es participante → `eliminate(id, 'left')` + aviso y `return`.
  - `onLeave`: si es participante → `eliminate(id, 'disconnect')` antes de guardar.
- [ ] **Step 4:** tests en verde.
- [ ] **Step 5: Commit** `feat: make the Chaos Castle every player for themselves with points and eliminations`.

---

### Task 5: Derrumbes, ganador y premios

**Files:** Modify `server/src/systems/ChaosCastleSystem.ts`; Test: `server/src/rooms/ChaosCastle.test.ts`.

- [ ] **Step 1: Tests que fallan:**
  - Con 3 jugadores y guardias: bajar los vivos a 12 → `collapseAt = now + 5 s` y anuncio. A los 5 s, `ring === 1`: el jugador parado en el anillo 1 queda eliminado ("Caíste al abismo") y el que está en el anillo 2 sigue. Los guardias del anillo 1 desaparecen sin puntos.
  - El derrumbe por tiempo a los 2:30 aunque haya muchos vivos.
  - Caminar fuera de la plataforma (abismo) elimina en el tick.
  - Último en pie: queda 1 jugador vivo → gana. Recibe 2 gemas + 1.500 de oro (Menor); el 2.º y 3.º por puntos reciben 1 gema. Todos reciben EXP = puntos × 120. Anuncio con el ganador; todos en el pueblo.
  - Por tiempo: con 2 sobrevivientes a los 10 min, gana el de más puntos.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar** en `tick()` activo:
  1. Caídas: todo participante vivo con `fallsAt(x, z, ring)` → `eliminate(id, 'fall')`; guardias en `fallsAt` → borrar.
  2. Derrumbe `i = ring`, si `i < 2` y `collapseAt === 0` y (`alive + monsters <= CASTLE_COLLAPSES[i].alive` o `now − inicio >= CASTLE_COLLAPSES[i].atMs`) → `collapseAt = now + 5 s` y anuncio `¡El borde se derrumba!` / `¡El anillo medio se derrumba!`. Cuando `now >= collapseAt` → `ring++`, `collapseAt = 0` (las caídas las toma el paso 1 del próximo tick).
  3. Fin: `alive <= 1` o `now >= endsAt` → `finish()`.
  - `finish()`: ganador = el único vivo, o el sobreviviente con más puntos, o el participante con más puntos. Podio = participantes ordenados por puntos (ganador primero). Premios según el tramo con `UPGRADE_GEMS` al azar. Anuncio `⚔ ¡{ganador} ganó el {nombre}! Podio: …`. Devolver a los vivos y cerrar.
- [ ] **Step 4:** tests en verde; suite del server en verde.
- [ ] **Step 5: Commit** `feat: collapse the Chaos Castle floor and reward the last one standing`.

---

### Task 6: Cliente

**Files:** Create `client/src/render/CastleBanner.ts` (+ test), `client/src/render/castleDialog.ts` (+ test), `client/src/render/CastilloEnvironment.ts` (+ test); Modify `client/src/net/NetworkClient.ts` (`getCastle()`), `client/src/render/Environment.ts`, `client/src/main.ts`.

**Interfaces — Produces:**
- `interface CastleView { phase: 'registration' | 'active'; bracket: CastleBracket; startsAt: number; endsAt: number; registered: number; alive: number; monsters: number; ring: number; collapseAt: number; myPoints: number | null }` (en `shared/src/chaosCastle.ts`).
- `NetworkClient.getCastle(): CastleView | null`.
- `CastleBanner.update(view: CastleView | null, insideCastle: boolean, now: number)`.
- `castleDialog(view: CastleView | null, next: { startsAt: number; bracket: CastleBracket }, level: number, hasSeal: boolean, registered: boolean): { text: string; actionLabel: string; send: boolean }`.
- `addCastilloEnvironment(scene): { root: THREE.Group; update(ring: number, warning: boolean): void }` con mallas `castle-ring-1..3`.

- [ ] **Step 1: Tests que fallan:**
  - `CastleBanner`:
    - inscripción → texto con el nombre del tramo, `mm:ss` y "Custodio";
    - activo adentro → "Quedan {alive}", "Tus puntos: {n}" y el tiempo;
    - con `collapseAt > now` → "¡El borde se derrumba!";
    - activo y afuera → oculto.
  - `castleDialog`:
    - inscripción abierta, tramo correcto y sello → `send: true` con la acción "Inscribirme (entregar Sello del Caos)";
    - sin sello → texto "Necesitás un Sello del Caos" y `send: false`;
    - fuera de tramo → aclara el tramo;
    - sin inscripción → informa el próximo castillo y la hora.
  - `CastilloEnvironment`: raíz `castillo-landmarks`; tres anillos en el centro (900, 300); `update(1, false)` oculta el anillo 1; `update(1, true)` pinta de rojo el anillo 2.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar**:
  - cartel debajo del de invasiones (`top: 118px`);
  - diálogo puro;
  - arena: plataforma por anillos (BoxGeometry huecas o cuatro losas por anillo), antorchas y estandartes, abismo oscuro;
  - `NetworkClient.getCastle()`;
  - `main.ts`:
    - `interactNpc('chaos_keeper')` → `castleDialog` + `net.sendInteractNpc`;
    - loop → `castleBanner.update(...)`;
    - `castillo.update(view.ring, view.collapseAt > Date.now())`;
    - indicador de zona "⚔ Castillo del Caos" dentro del mapa.
- [ ] **Step 4:** tests del cliente y `tsc` en verde.
- [ ] **Step 5: Commit** `feat: show the Chaos Castle banner, keeper dialog and collapsing arena`.

---

### Task 7: Calibración de los Guardias

**Files:** Modify `server/src/sim/scenarios.ts`, `server/src/sim/BalanceSimulator.test.ts`, `server/scripts/balance.ts`, `shared/src/combat.ts`; Create `artifacts/balance/castle.json`.

- [ ] Escenarios `castleScenarios(cls)`:
  - Guardia Menor en (900, 300) contra un bot de nivel 15 con equipo `mines`.
  - Guardia Mayor contra un bot de nivel 25 con equipo `forge_late`.
- [ ] Test: mediana atenta de las 5 clases entre 6 y 10 s para cada guardia.
- [ ] CLI `--castle`. Calibrar con la regla de vida (objetivo 8 s), máximo 6 rondas.
- [ ] `npm test` + tres `tsc`. **Commit** `feat: calibrate the Chaos Castle guards`.

---

### Task 8: Verificación final

- [ ] Suite completa, tres `tsc`, builds.
- [ ] Navegador con server semilla temporal (no commitear):
  - `castle.openNow('menor', 30_000)`, con dos personajes de nivel 15 con sello (`Uno` y `Dos`).
  - Inscribir a uno por el diálogo del Custodio (y al otro por el server semilla).
  - Verificar: cartel de inscripción, arranque en la arena, cartel activo, un derrumbe con el anillo rojo, eliminación, anuncio del ganador y consola sin errores.
  - Quitar lo temporal.
- [ ] Actualizar la memoria. Reportar y pedir OK para integrar y pushear.
