# Eventos de servidor: invasiones de jefes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invasiones de jefes programadas (una grande diaria + chicas al azar) que aparecen en el pueblo o en mapas de caza, con área PvP para nivel 10+, conteo de daño por gremio, botín único reservado al gremio ganador y recompensas de participación.

**Architecture:** Reglas puras en `shared/src/events.ts` (horarios, invasores, área). Un `EventSystem` server-side con reloj y azar inyectados maneja el ciclo (programado → anunciado → activo → cerrado) y habla con `GameRoom` por una interfaz `EventHost`. El estado visible viaja en un `WorldEventState` nuevo dentro de `GameState`; el cliente lo muestra en un cartel, el minimapa, el mapa de viaje y el indicador de zona.

**Tech Stack:** TypeScript, Colyseus 0.15 (`@colyseus/schema`, límite 64 campos por schema), Three.js, Vitest, `@colyseus/testing`.

**Spec:** `docs/superpowers/specs/2026-09-26-eventos-invasiones-design.md`

## Global Constraints

- Aviso 5 min antes; invasión de 20 min; radio del área 30; reserva del botín único 60 s; nivel mínimo 10.
- Gran invasión diaria a las 21:00 Argentina = 00:00 UTC (Argentina UTC−3 sin horario de verano).
- Chicas: 2–4 h después del cierre anterior (o del arranque); mínimo 2 jugadores conectados al anunciar; si caen a menos de 30 min de la gran invasión, se corren a 30 min después de su fin.
- Nunca dos invasiones anunciadas o activas a la vez.
- Dificultad fija (sin escalar por jugadores). Invasores `rank: 'boss'`.
- Participación: ≥1 % del daño total → oro + EXP del invasor y 15 % de chance de gema de mejora.
- Muertes PvP dentro del área activa: sin penalidad.
- Menores de nivel 10 en el área: no atacan ni son atacados, el jefe no los elige ni los daña.
- Reusar el catálogo: piezas únicas = alas y mascotas del catálogo + gemas (`aden_gema_del_pacto`, `aden_gema_del_azar`, `aden_prisma_del_caos`, `aden_gema_del_pulso`).
- Cambio de schema: se publica junto (push a master despliega Vercel y Railway). Push solo con OK del usuario.
- Textos al jugador en español rioplatense (vos).
- Archivos del repo con finales de línea mixtos: editar con el Edit tool o el helper del scratchpad.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `shared/src/events.ts` (nuevo) | Constantes, `INVADERS`, `INVASION_SPOTS`, horarios, reglas del área |
| `shared/src/events.test.ts` (nuevo) | Tests de horarios y reglas |
| `shared/src/mobs.ts`, `combat.ts`, `progression.ts` o donde viva `MOB_EXP`, `items.ts` (`DROP_TABLES`), `encounters.ts`, `lootPools.ts` | Plantillas, stats, EXP, botín base, ataques y listas de catálogo de los 4 invasores |
| `server/src/systems/AdventureSystem.ts`, `EncounterSystem.ts` | `minTargetLevel` en quién puede pelear y quién recibe ataques |
| `server/src/state/WorldEventState.ts` (nuevo), `GameState.ts`, `DroppedItemState.ts` | Estado sincronizado del evento y reserva del botín |
| `server/src/systems/EventSystem.ts` (nuevo) + test | Ciclo de vida, daño, botín, recompensas |
| `server/src/systems/LootSystem.ts` | `tryPickup` respeta la reserva |
| `server/src/rooms/GameRoom.ts` | Enganches: tick, daño, muerte, PvP, penalidad, IA |
| `server/src/rooms/InvasionEvent.test.ts` (nuevo) | E2E con conexiones reales |
| `client/src/net/NetworkClient.ts` | `getWorldEvent()` y `reservedFor` en el botín |
| `client/src/render/EventBanner.ts` (nuevo) + test | Cartel con cuenta regresiva y ranking |
| `client/src/render/ZoneIndicator.ts`, `MapPanel.ts`, `GroundItems.ts`, `client/src/main.ts` | Indicador del área, marcador en el mapa y minimapa, etiqueta de reserva |
| `server/src/sim/BalanceSimulator.ts`, `scenarios.ts`, test, `server/scripts/balance.ts` | Peleas de grupo y calibración |

---

### Task 1: Reglas puras de eventos (`shared/src/events.ts`)

**Files:** Create `shared/src/events.ts`, `shared/src/events.test.ts`; Modify `shared/src/index.ts`.

**Interfaces — Produces:**
- `INVASION_WARNING_MS = 300_000`, `INVASION_DURATION_MS = 1_200_000`, `INVASION_RADIUS = 30`, `INVASION_RESERVE_MS = 60_000`, `INVASION_MIN_LEVEL = 10`, `MINOR_MIN_PLAYERS = 2`, `PARTICIPATION_MIN_SHARE = 0.01`, `PARTICIPATION_GEM_CHANCE = 0.15`, `UPGRADE_GEMS: readonly string[]`.
- `interface InvaderDef { id: string; templateId: string; kind: 'daily' | 'minor'; maps: readonly string[]; uniqueLoot: readonly string[]; uniqueChance: number; guaranteedGem: boolean; rewardGold: number; rewardExp: number; arrival: string; retreat: string }`
- `INVADERS: Record<string, InvaderDef>` con `crimson_dragon` (daily), `waste_herald`, `veil_specter`, `ember_colossus` (minor).
- `INVASION_SPOTS: Record<string, { x: number; z: number }>`.
- `nextDailyInvasion(now: number): number` (inicio, ms epoch), `nextMinorInvasion(from: number, rng: () => number): number`, `inInvasionArea(ev: { phase: string; mapId: string; x: number; z: number; radius: number }, mapId: string, x: number, z: number): boolean`, `invasionProtected(level: number): boolean`, `getInvader(id: string): InvaderDef`.

- [ ] **Step 1: Test que falla** (`shared/src/events.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { INVADERS, INVASION_SPOTS, INVASION_DURATION_MS, nextDailyInvasion, nextMinorInvasion, inInvasionArea, invasionProtected, getZone, getItem, getTemplate } from './index.js';

const H = 3_600_000;
describe('invasion rules', () => {
  it('schedules the daily invasion at 21:00 Argentina (00:00 UTC)', () => {
    expect(new Date(nextDailyInvasion(Date.UTC(2026, 8, 26, 12))).toISOString()).toBe('2026-09-27T00:00:00.000Z');
    expect(new Date(nextDailyInvasion(Date.UTC(2026, 8, 27, 0, 0, 1))).toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });
  it('places minor invasions 2–4 h later and away from the daily one', () => {
    const from = Date.UTC(2026, 8, 26, 12);
    expect(nextMinorInvasion(from, () => 0)).toBe(from + 2 * H);
    expect(nextMinorInvasion(from, () => 0.999999)).toBeLessThanOrEqual(from + 4 * H);
    const daily = nextDailyInvasion(from);
    const near = nextMinorInvasion(daily - 2.2 * H, () => 0); // caería 12 min antes de la diaria
    expect(near).toBe(daily + INVASION_DURATION_MS + 0.5 * H);
  });
  it('defines four invaders on real templates, maps and catalog loot', () => {
    expect(Object.values(INVADERS).filter(i => i.kind === 'daily').map(i => i.id)).toEqual(['crimson_dragon']);
    for (const inv of Object.values(INVADERS)) {
      expect(getTemplate(inv.templateId).rank).toBe('boss');
      for (const m of inv.maps) { expect(getZone(m)).toBeTruthy(); expect(INVASION_SPOTS[m], m).toBeDefined(); }
      for (const id of inv.uniqueLoot) expect(['alas', 'mascota', 'joya']).toContain(getItem(id).category);
    }
  });
  it('knows who is inside the active area and protects low levels', () => {
    const ev = { phase: 'active', mapId: 'pueblo', x: 0, z: -24, radius: 30 };
    expect(inInvasionArea(ev, 'pueblo', 10, -20)).toBe(true);
    expect(inInvasionArea(ev, 'pueblo', 0, 14)).toBe(false);
    expect(inInvasionArea(ev, 'bosque', 0, -24)).toBe(false);
    expect(inInvasionArea({ ...ev, phase: 'announced' }, 'pueblo', 0, -24)).toBe(false);
    expect(invasionProtected(9)).toBe(true);
    expect(invasionProtected(10)).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/events.test.ts` en `shared` → FALLA (módulo inexistente).
- [ ] **Step 3: Implementar** `shared/src/events.ts`:

```ts
/** Eventos de servidor: invasiones de jefes (reglas puras; el servidor aporta reloj y azar). */
export const INVASION_WARNING_MS = 300_000;
export const INVASION_DURATION_MS = 1_200_000;
export const INVASION_RADIUS = 30;
export const INVASION_RESERVE_MS = 60_000;
export const INVASION_MIN_LEVEL = 10;
export const MINOR_MIN_PLAYERS = 2;
export const PARTICIPATION_MIN_SHARE = 0.01;
export const PARTICIPATION_GEM_CHANCE = 0.15;
export const UPGRADE_GEMS = ['aden_gema_del_pacto', 'aden_gema_del_azar', 'aden_prisma_del_caos', 'aden_gema_del_pulso'] as const;
const HOUR = 3_600_000, DAY = 24 * HOUR, DAILY_UTC_HOUR = 0; // 21:00 Argentina (UTC−3)

export interface InvaderDef {
  id: string; templateId: string; kind: 'daily' | 'minor'; maps: readonly string[];
  uniqueLoot: readonly string[]; uniqueChance: number; guaranteedGem: boolean;
  rewardGold: number; rewardExp: number; arrival: string; retreat: string;
}

const WINGS = ['aden_alas_de_la_vigilia', 'aden_alas_del_firmamento_roto', 'aden_alas_del_exiliado'];
const PETS = ['aden_lumen_custodio', 'aden_diablillo_de_ceniza', 'aden_cuerno_del_corcel_umbrio'];

export const INVADERS: Record<string, InvaderDef> = {
  crimson_dragon: { id: 'crimson_dragon', templateId: 'crimson_dragon', kind: 'daily', maps: ['pueblo', 'marismas', 'minas', 'fragua'],
    uniqueLoot: [...WINGS, ...PETS], uniqueChance: 1, guaranteedGem: true, rewardGold: 800, rewardExp: 20000,
    arrival: 'Se avistan dragones sobre {map}', retreat: 'El Dragón Carmesí se retira hacia las montañas.' },
  waste_herald: { id: 'waste_herald', templateId: 'waste_herald', kind: 'minor', maps: ['bosque', 'ruinas', 'yermo'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 200, rewardExp: 1500,
    arrival: 'Un Heraldo del Yermo abre una grieta en {map}', retreat: 'El Heraldo del Yermo vuelve a su grieta.' },
  veil_specter: { id: 'veil_specter', templateId: 'veil_specter', kind: 'minor', maps: ['marismas', 'monasterio'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 350, rewardExp: 5000,
    arrival: 'Un Espectro del Velo se alza en {map}', retreat: 'El Espectro del Velo se disuelve en la niebla.' },
  ember_colossus: { id: 'ember_colossus', templateId: 'ember_colossus', kind: 'minor', maps: ['minas', 'fragua'],
    uniqueLoot: PETS, uniqueChance: 0.2, guaranteedGem: false, rewardGold: 700, rewardExp: 15000,
    arrival: 'Un Coloso de Brasa emerge de la roca en {map}', retreat: 'El Coloso de Brasa se hunde en la lava.' },
};

/** Claros abiertos por mapa, a más de 30 unidades del punto de reaparición. */
export const INVASION_SPOTS: Record<string, { x: number; z: number }> = {
  pueblo: { x: 0, z: -24 }, bosque: { x: 300, z: 0 }, ruinas: { x: 0, z: 300 }, yermo: { x: 300, z: 300 },
  marismas: { x: 1200, z: 150 }, monasterio: { x: 1200, z: 450 }, minas: { x: 1500, z: 150 }, fragua: { x: 1500, z: 450 },
};

export function getInvader(id: string): InvaderDef {
  const inv = INVADERS[id];
  if (!inv) throw new Error(`Invasor desconocido: ${id}`);
  return inv;
}

/** Inicio de la próxima gran invasión (21:00 Argentina) estrictamente después de `now`. */
export function nextDailyInvasion(now: number): number {
  const day = Math.floor(now / DAY) * DAY + DAILY_UTC_HOUR * HOUR;
  return day > now ? day : day + DAY;
}

/** Inicio de la próxima invasión chica: 2–4 h después de `from`, sin pisar la gran invasión. */
export function nextMinorInvasion(from: number, rng: () => number): number {
  const at = from + 2 * HOUR + Math.floor(rng() * 2 * HOUR);
  const daily = nextDailyInvasion(from);
  return at > daily - HOUR / 2 && at < daily + INVASION_DURATION_MS + HOUR / 2 ? daily + INVASION_DURATION_MS + HOUR / 2 : at;
}

export function inInvasionArea(ev: { phase: string; mapId: string; x: number; z: number; radius: number }, mapId: string, x: number, z: number): boolean {
  return ev.phase === 'active' && ev.mapId === mapId && Math.hypot(x - ev.x, z - ev.z) <= ev.radius;
}

export function invasionProtected(level: number): boolean {
  return level < INVASION_MIN_LEVEL;
}
```

  Y en `shared/src/index.ts`: `export * from './events.js';`.
  Nota: el test "four invaders" pasa recién en la Task 2 (plantillas). En este paso, correr solo los otros tres (`-t "schedules|places|knows"`).
- [ ] **Step 4:** tests de horarios y área en verde.
- [ ] **Step 5: Commit** `feat: add invasion schedule and area rules`.

---

### Task 2: Jefes invasores y protección por nivel

**Files:** Modify `shared/src/mobs.ts`, `shared/src/combat.ts` (`MOB_COMBAT`), el archivo de `MOB_EXP`, `shared/src/items.ts` (`DROP_TABLES`), `shared/src/encounters.ts`, `shared/src/lootPools.ts`, `server/src/systems/AdventureSystem.ts`, `server/src/systems/EncounterSystem.ts`, `server/src/rooms/GameRoom.ts` (candidatos de IA); Test: `shared/src/events.test.ts` (test "four invaders"), `server/src/systems/EncounterSystem.test.ts`.

**Interfaces — Produces:** plantillas `crimson_dragon` (25), `waste_herald` (10), `veil_specter` (16), `ember_colossus` (26), todas `rank: 'boss'`, `boss: true`, `respawnMs: 0`; `EncounterDef.minTargetLevel?: number`.

- [ ] **Step 1: Tests que fallan:** activar el test "four invaders" de la Task 1 y agregar a `EncounterSystem.test.ts`:

```ts
it('invaders ignore players below level 10 and those players cannot fight them', () => {
  const def = getEncounter('crimson_dragon')!;
  expect(def.minTargetLevel).toBe(10);
  expect(isEncounterEligible(def, { questId: 'q1', level: 9 })).toBe(false);
  expect(isEncounterEligible(def, { questId: 'q1', level: 10 })).toBe(true);
  expect(canFightDungeonMob({ questId: 'q1', mapId: 'pueblo', dungeonStage: 0, level: 9 }, 'crimson_dragon')).toBe(false);
});
```

- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `mobs.ts` (plantillas, `respawnMs: 0`: el `EventSystem` los retira):
    ```ts
    crimson_dragon: { id: 'crimson_dragon', level: 25, rank: 'boss', name: 'Dragón Carmesí', model: 'AncientDrake', boss: true, scale: 3.2, tint: 0xd8322a, respawnMs: 0 },
    waste_herald: { id: 'waste_herald', level: 10, rank: 'boss', name: 'Heraldo del Yermo', model: 'InfernalDemon', boss: true, scale: 1.8, tint: 0xe0782a, respawnMs: 0 },
    veil_specter: { id: 'veil_specter', level: 16, rank: 'boss', name: 'Espectro del Velo', model: 'DeathWraith', boss: true, scale: 1.8, tint: 0x8fd4ff, respawnMs: 0 },
    ember_colossus: { id: 'ember_colossus', level: 26, rank: 'boss', name: 'Coloso de Brasa', model: 'ForestTroll', boss: true, scale: 2.2, tint: 0xff6a2a, respawnMs: 0 },
    ```
  - `MOB_COMBAT` (valores iniciales; la Task 7 los calibra): dragón `{ maxHp: 200000, pAtk: 190, pDef: 80, attackCooldownMs: 2200 }`; heraldo `{ maxHp: 30000, pAtk: 70, pDef: 30, attackCooldownMs: 2200 }`; espectro `{ maxHp: 60000, pAtk: 110, pDef: 50, attackCooldownMs: 2200 }`; coloso `{ maxHp: 90000, pAtk: 185, pDef: 80, attackCooldownMs: 2400 }`.
  - `MOB_EXP`: dragón 12000, heraldo 1200, espectro 3500, coloso 9000 (EXP normal del golpe final; la participación va aparte).
  - `DROP_TABLES`: oro 600–900 / 150–220 / 260–380 / 500–700, y 3–4 `greater_potion`.
  - `lootPools.ts`, listas de catálogo de jefe por mapa: para cada mapa de `INVADERS[x].maps`, agregar la fuente `crimson_dragon` / `waste_herald` / ... con 3–4 piezas del tramo del mapa (por ejemplo, en `pueblo`, piezas de nivel ≤ 10: `aden_filo_del_verdugo`, `aden_lanza_de_sangre_antigua`, `aden_escudo_de_la_cometa_negra`, `aden_gema_del_azar`). Respetar el tope de nivel por mapa (≤10 en mapas del Acto I y pueblo; `levelMax+1` en el resto).
  - `encounters.ts`: `minTargetLevel?: number` en `EncounterDef` y encuentros:
    - dragón: `aggroRadius 18, cooldownMs 5000, minTargetLevel 10`; patrones cono r10 80° 1800 ms power 2.6 y círculo r6 1600 ms 2.2; `belowHalf.patterns` suma una canalización `self` r16 6000 ms 3.0 sin objetos de interrupción (se esquiva caminando).
    - heraldo/espectro/coloso: `aggroRadius 14, cooldownMs 6000, minTargetLevel 10`, cono r8 70° 1800 ms 2.4 y círculo r5 1600 ms 2.2.
  - `EncounterSystem.isEncounterEligible(def, p: Pick<PlayerState, 'questId' | 'level'>)`: además exige `p.level >= (def.minTargetLevel ?? 0)`.
  - `AdventureSystem.canFightDungeonMob`: `DungeonProgress` suma `level?: number`; si `encounter?.minTargetLevel && (p.level ?? 0) < encounter.minTargetLevel` → `false`.
  - `GameRoom`, candidatos de IA (bloque `const candidates=(playersByMap...`): también filtrar `p.level >= (encounter?.minTargetLevel ?? 0)`.
- [ ] **Step 4:** tests de `shared` y del server en verde (el catálogo y `lootPools.test` siguen pasando).
- [ ] **Step 5: Commit** `feat: add the invading bosses and keep them away from low levels`.

---

### Task 3: Ciclo de vida del evento y estado sincronizado

**Files:** Create `server/src/state/WorldEventState.ts`, `server/src/systems/EventSystem.ts`, `server/src/systems/EventSystem.test.ts`; Modify `server/src/state/GameState.ts`, `server/src/rooms/GameRoom.ts`.

**Interfaces — Produces:**

```ts
// WorldEventState.ts
export class WorldEventState extends Schema {
  @type('string') id = '';
  @type('string') invaderId = '';
  @type('string') phase = '';          // '' | 'announced' | 'active'
  @type('string') mapId = '';
  @type('number') x = 0;
  @type('number') z = 0;
  @type('number') radius = 0;
  @type('number') startsAt = 0;        // epoch ms
  @type('number') endsAt = 0;
  @type('string') bossId = '';
  @type(['string']) ranking = new ArraySchema<string>(); // "TAG · 45%"
}

// EventSystem.ts
export interface EventHost {
  state: GameState;
  now(): number;
  rng(): number;
  announce(text: string): void;
  onlinePlayers(): number;
  spawnInvader(id: string, templateId: string, x: number, z: number, mapId: string): MobState;
  dropReserved(itemId: string, x: number, z: number, mapId: string, owner: { guildId: string; playerId: string; label: string }): void;
  reward(playerId: string, gold: number, exp: number, itemId?: string): void;
}
export class EventSystem {
  constructor(host: EventHost);
  tick(): void;                                   // cada tick del server
  startNow(invaderId: string, mapId: string): void; // tests y server semilla
  recordDamage(mobId: string, playerId: string, amount: number): void;
  onMobKilled(mobId: string): void;
  inArea(p: { mapId: string; x: number; z: number }): boolean;
}
```

- [ ] **Step 1: Test que falla** (`EventSystem.test.ts`, host falso en memoria con `GameState` real y reloj manual):

```ts
import { describe, it, expect } from 'vitest';
import { GameState } from '../state/GameState.js';
import { MobState } from '../state/MobState.js';
import { EventSystem, type EventHost } from './EventSystem.js';
import { nextDailyInvasion, INVASION_WARNING_MS, INVASION_DURATION_MS } from '@aden/shared';

function fakeHost(start: number, online = 3) {
  const texts: string[] = [];
  let clock = start;
  const host: EventHost = {
    state: new GameState(), now: () => clock, rng: () => 0, announce: t => texts.push(t), onlinePlayers: () => online,
    spawnInvader: (id, templateId, x, z, mapId) => { const m = new MobState(); Object.assign(m, { templateId, x, z, mapId, hp: 100, maxHp: 100 }); host.state.mobs.set(id, m); return m; },
    dropReserved: () => {}, reward: () => {},
  };
  return { host, texts, advance: (ms: number) => { clock += ms; } };
}

describe('invasion lifecycle', () => {
  it('announces 5 minutes early, spawns at start and retreats after 20 minutes', () => {
    const daily = nextDailyInvasion(Date.UTC(2026, 8, 26, 12));
    const { host, texts, advance } = fakeHost(daily - INVASION_WARNING_MS - 1000, 0);
    const events = new EventSystem(host);
    events.tick(); expect(host.state.worldEvent.phase).toBe('');
    advance(1000); events.tick();
    expect(host.state.worldEvent.phase).toBe('announced');
    expect(texts.at(-1)).toContain('dragones');
    advance(INVASION_WARNING_MS); events.tick();
    expect(host.state.worldEvent.phase).toBe('active');
    expect(host.state.mobs.get(host.state.worldEvent.bossId)?.templateId).toBe('crimson_dragon');
    advance(INVASION_DURATION_MS); events.tick();
    expect(host.state.worldEvent.phase).toBe('');
    expect(host.state.mobs.size).toBe(0);
    expect(texts.at(-1)).toContain('se retira');
  });
  it('skips minor invasions without enough players', () => {
    const start = Date.UTC(2026, 8, 26, 12);
    const { host, advance } = fakeHost(start, 1);
    const events = new EventSystem(host);
    advance(2 * 3_600_000); events.tick();
    expect(host.state.worldEvent.phase).toBe('');
  });
});
```

- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `GameState`: `@type(WorldEventState) worldEvent = new WorldEventState();`.
  - `EventSystem`: campos privados `nextDailyAt`, `nextMinorAt`, `current: { invader: InvaderDef; startsAt: number; endsAt: number } | null`, `damage = new Map<string, number>()` (por jugador). En `constructor`: `nextDailyAt = nextDailyInvasion(now)`, `nextMinorAt = nextMinorInvasion(now, rng)`.
  - `tick()`:
    1. Sin evento: si `now >= nextDailyAt - WARNING` → anunciar el dragón (mapa `maps[floor(rng*len)]`). Si no, y `now >= nextMinorAt - WARNING`: con `onlinePlayers() >= MINOR_MIN_PLAYERS` anunciar un invasor chico al azar; si no, `nextMinorAt = nextMinorInvasion(now, rng)`.
    2. Anunciado y `now >= startsAt` → `spawnInvader(\`event_${id}\`, ...)` en `INVASION_SPOTS[mapId]`, `phase='active'`, `radius=INVASION_RADIUS`, anuncio de aparición.
    3. Activo: si el mob no existe o está muerto → `resolve()` (Task 4); si `now >= endsAt` → retirar (borrar el mob, anuncio `retreat`, limpiar).
    4. Al cerrar: `state.worldEvent` vuelve a vacío; si fue la diaria, `nextDailyAt = nextDailyInvasion(now)`; siempre `nextMinorAt = nextMinorInvasion(now, rng)`.
  - Anuncio: `invader.arrival.replace('{map}', getZone(mapId).name)` + ` en 5 minutos`.
  - `GameRoom`: crear `this.events = new EventSystem({...})` en `onCreate` con `now: () => Date.now()`, `rng: Math.random`, `announce: t => this.broadcast(MessageType.WorldAnnounce, { text: t })`, `onlinePlayers: () => this.clients.length`, `spawnInvader: (...) => this.spawnMob(...)`; llamar `this.events.tick()` al final de `tick(dt)`. En `killMob`, si `mob.templateId` es de un invasor: `mob.respawnMs = Number.POSITIVE_INFINITY` y, al final, `this.events.onMobKilled(mobId)`. El `EventSystem` borra el mob en su propio `tick` (nunca dentro de un `forEach` de mobs).
- [ ] **Step 4:** tests en verde; suite del server en verde.
- [ ] **Step 5: Commit** `feat: run scheduled invasions with a synced world event`.

---

### Task 4: Daño por gremio, botín reservado y participación

**Files:** Modify `server/src/systems/EventSystem.ts` (+ test), `server/src/state/DroppedItemState.ts`, `server/src/systems/LootSystem.ts`, `server/src/rooms/GameRoom.ts`; Create `server/src/rooms/InvasionEvent.test.ts`.

**Interfaces — Produces:** `DroppedItemState`: `@type('string') reservedFor = ''` (etiqueta sincronizada: tag del gremio o nombre del jugador) y server-only `reservedGuildId = ''`, `reservedPlayerId = ''`, `reservedMs = 0`.

- [ ] **Step 1: Test E2E que falla** (`InvasionEvent.test.ts`, `boot(config, 2600)`):
  - Crear dos clientes en gremios distintos (`p.guildId = 'g1'`/`'g2'`, `guildTag` `AAA`/`BBB`) y un tercero sin gremio, todos nivel 25 en `pueblo`.
  - `room.events.startNow('crimson_dragon', 'pueblo')`, avanzar al inicio con el reloj del `EventSystem` (inyectar `now` desde el test: `(room as any).events.host.now = () => t`).
  - Registrar daño: `recordDamage(bossId, g1a, 700)`, `recordDamage(bossId, g2a, 300)`, `recordDamage(bossId, solo, 5)`; matar al jefe (`mob.hp = 1`, golpe del cliente de `g1`).
  - Esperado:
    - Un `droppedItem` con `reservedFor === 'AAA'` cuyo `getItem(...).category` ∈ {alas, mascota} y una gema reservada.
    - `tryPickup` del cliente `g2` sobre esa pieza → `false`; del cliente `g1` → `true`.
    - Otra pieza reservada: tras 60 s de ticks (`reservedMs` llega a 0), `g2` la puede levantar.
    - `g1a` y `g2a` recibieron oro y EXP; el jugador sin gremio (0.5 % del daño) no.
    - `worldEvent.ranking` mostró `AAA · 70%` primero antes del cierre.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `EventSystem.recordDamage`: si `mobId === worldEvent.bossId` y la fase es activa → sumar a `damage`. Cada 1 s (acumulado en `tick`) recalcular `ranking`: agrupar por `guildId` (sin gremio → `solo:<playerId>`), ordenar, top 3 como `"${tag} · ${pct}%"` (tag del `GuildState` o el nombre del jugador).
  - `resolve()`:
    1. Ganador = grupo con más daño.
    2. `owner = { guildId, playerId: guildId ? '' : playerId, label }`.
    3. Piezas: `if (rng() < uniqueChance) uniqueLoot[floor(rng*len)]` y, si `guaranteedGem`, una de `UPGRADE_GEMS`. Si no tocó la única, una gema.
    4. `dropReserved(id, boss.x, boss.z, mapId, owner)` para cada una.
    5. Participación: por cada jugador con `share >= 0.01`: `reward(id, invader.rewardGold, invader.rewardExp, rng() < PARTICIPATION_GEM_CHANCE ? gema : undefined)`.
    6. Anuncio: `¡${nombre} cayó! El botín es de ${label}.`
  - `GameRoom`:
    - `dropReserved`: crear el `DroppedItemState` como `dropLoot` (instanciar con `instantiateItem(id, true, 6, LOOT_QUALITY_ODDS.boss)`), setear `reservedFor = label`, `reservedGuildId`, `reservedPlayerId`, `reservedMs = INVASION_RESERVE_MS`.
    - `reward`: `grantExp` + `gold +=` + `addToInventory` + `ItemResult` "Recompensa de invasión: +X oro, +Y EXP".
    - Tick: descontar `reservedMs` de cada `droppedItem`; en 0, limpiar `reservedFor`, `reservedGuildId` y `reservedPlayerId`.
    - Registro de daño (`private recordMobDamage(mobId, attackerId, dmg)` → `this.events.recordDamage(...)`) en los tres puntos: skill de daño (`const dmg = resolveAttack(...)` en `UseSkill`), golpe automático (loop de auto-ataque) y DoT (loop de `dotAccumMs`).
  - `LootSystem.tryPickup`: si `drop.reservedMs > 0` y (`drop.reservedGuildId` ≠ `p.guildId` o está vacío) y `drop.reservedPlayerId` ≠ `sessionId` → `false`.
- [ ] **Step 4:** tests en verde; suite del server en verde.
- [ ] **Step 5: Commit** `feat: reward invasions by guild damage with reserved unique loot`.

---

### Task 5: Área PvP y protección de novatos

**Files:** Modify `server/src/rooms/GameRoom.ts`; Test: `server/src/rooms/InvasionEvent.test.ts`.

- [ ] **Step 1: Test que falla:** con una invasión activa en `pueblo`:
  - Dos jugadores nivel 20 dentro del área: uno golpea al otro con skill y auto-ataque → el objetivo pierde vida.
  - El mismo par fuera del área, en el pueblo → no hay daño.
  - Uno de nivel 9 dentro del área no puede atacar ni ser atacado.
  - Matar a un jugador dentro del área no le descuenta oro ni EXP.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar:**
  - `inPvpZone(p: PlayerState)`: `if (this.events.inArea(p)) return !invasionProtected(p.level); return !getZone(p.mapId).safe;`. Actualizar los llamadores (skills y auto-ataque PvP) para pasar el `PlayerState`.
  - `killPlayer`: aplicar la penalidad solo si `killerId && !this.events.inArea(victim)`.
- [ ] **Step 4:** tests en verde.
- [ ] **Step 5: Commit** `feat: open guild PvP inside the invasion area and protect newcomers`.

---

### Task 6: Cliente — cartel, marcadores, indicador de zona y reserva

**Files:** Create `client/src/render/EventBanner.ts`, `client/src/render/EventBanner.test.ts`; Modify `client/src/net/NetworkClient.ts`, `client/src/render/ZoneIndicator.ts` (+ test), `client/src/render/MapPanel.ts`, `client/src/render/GroundItems.ts`, `client/src/main.ts`.

**Interfaces — Produces:** `interface WorldEventView { invaderId: string; phase: 'announced' | 'active'; mapId: string; x: number; z: number; radius: number; startsAt: number; endsAt: number; ranking: string[] }`; `NetworkClient.getWorldEvent(): WorldEventView | null`; `EventBanner.update(ev: WorldEventView | null, now: number): void`; `ZoneIndicator.update(inPvp: boolean, label?: string)`.

- [ ] **Step 1: Tests que fallan** (`EventBanner.test.ts`, jsdom):

```ts
// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { EventBanner } from './EventBanner.js';

it('counts down to the invasion and then shows time left and the guild ranking', () => {
  const parent = document.createElement('div'), banner = new EventBanner(parent);
  const base = { invaderId: 'crimson_dragon', mapId: 'pueblo', x: 0, z: -24, radius: 30, startsAt: 400_000, endsAt: 1_600_000, ranking: [] as string[] };
  banner.update({ ...base, phase: 'announced' }, 128_000);
  expect(parent.textContent).toContain('Dragón Carmesí'); expect(parent.textContent).toContain('Pueblo de Aden'); expect(parent.textContent).toContain('04:32');
  banner.update({ ...base, phase: 'active', ranking: ['AAA · 70%', 'BBB · 30%'] }, 400_000);
  expect(parent.textContent).toContain('20:00'); expect(parent.textContent).toContain('AAA · 70%');
  banner.update(null, 0);
  expect((parent.firstElementChild as HTMLElement).style.display).toBe('none');
});
```

  En `ZoneIndicator.test.ts`: `update(true, 'Área de invasión · PvP')` muestra ese texto.
- [ ] **Step 2:** correr → FALLA.
- [ ] **Step 3: Implementar.**
  - `EventBanner`: `div` fijo arriba al centro (`top: 64px; left: 50%; transform: translateX(-50%)`, estética del tema, `z-index: 1100`, `pointer-events: none`). Contenido:
    - anunciado: `⚔ Invasión: {nombre} en {mapa} · empieza en mm:ss`;
    - activo: `⚔ {nombre} · {mapa} · quedan mm:ss` + líneas del ranking.

    El nombre sale de `getTemplate(getInvader(id).templateId).name` y el mapa de `getZone(mapId).name`.
  - `NetworkClient.getWorldEvent()`: leer `room.state.worldEvent`; `phase` vacía → `null`.
  - `main.ts` (render loop):
    - `eventBanner.update(net.getWorldEvent(), Date.now())`.
    - Indicador de zona: si `inInvasionArea(ev, myMapId, pos.x, pos.z)` → `zoneIndicator.update(!invasionProtected(level), invasionProtected(level) ? '🛡 Área de invasión · protegido' : '⚔ Área de invasión · PvP')`; si no, como hoy.
    - Minimapa: si el evento está en el mapa propio, sumar `{ x, z, kind: 'boss' }` a las entidades mientras está anunciado.
  - `MapPanel`: en la fila del mapa del evento, un distintivo `⚔ Invasión` (recibir el `mapId` del evento en `update`/`render`).
  - `GroundItems`: si la entrada trae `reservedFor`, agregar la línea `Reservado para {reservedFor}`. `NetworkClient` expone `reservedFor` al listar el botín en el piso.
- [ ] **Step 4:** tests del cliente y `tsc` en verde.
- [ ] **Step 5: Commit** `feat: show invasions with a countdown banner, markers and the area indicator`.

---

### Task 7: Simulador de grupo y calibración

**Files:** Modify `server/src/sim/BalanceSimulator.ts`, `server/src/sim/scenarios.ts`, `server/src/sim/BalanceSimulator.test.ts`, `server/scripts/balance.ts`, `shared/src/combat.ts`; Create `artifacts/balance/invasions.json`.

**Interfaces — Produces:** `BalanceSimulator.fightGroup(s: Scenario, profiles: Profile[], seed?: number, maxSeconds?: number): { outcome: 'kill' | 'wipe' | 'timeout'; seconds: number; deaths: number }`; `invasionScenarios(): { name: string; scenario: Scenario; group: Profile[]; soloClasses: string[]; target: [number, number] }[]`.

- [ ] **Step 1: Refactor de bots múltiples:**
  - `send(type, message, botId = BOT_ID)` con un `Client` falso por bot (`{ sessionId: botId, send: () => {} }`).
  - `resetWorld(profiles: Profile[])` crea `sim_bot_0..n` (el `fight` actual usa un solo perfil con `BOT_ID`).
  - `attentiveStep(p, mob, botId)` usa ese `botId` para `send`.
  - `fightGroup` coloca a los bots en círculo a 5 unidades del jefe y corre `attentiveStep` para cada bot vivo en cada tick. Termina con `kill` (jefe muerto), `wipe` (todos muertos) o `timeout`.
- [ ] **Step 2: Escenarios:**
  - Dragón en `pueblo`: grupo de 5 (caballero, mago, bárbaro, pícaro, explorador), nivel 25, equipo `forge_late`, objetivo 240–360 s.
  - Heraldo en `bosque`: grupo de 3 (caballero, mago, explorador), nivel 11, equipo `act2`, objetivo 120–180 s.
  - Espectro en `marismas`: grupo de 3, nivel 16, equipo `mines`.
  - Coloso en `minas`: grupo de 3, nivel 25, equipo `forge_late`.

  El solo es cada clase del grupo por separado con `maxSeconds = 1200`.
- [ ] **Step 3: Tests:**

```ts
it('lets the intended group beat each invader in time and no one alone', () => {
  for (const inv of invasionScenarios()) {
    const r = sim.fightGroup(inv.scenario, inv.group, 1, 1200);
    expect(r.outcome, inv.name).toBe('kill');
    expect(r.seconds, inv.name).toBeGreaterThanOrEqual(inv.target[0]);
    expect(r.seconds, inv.name).toBeLessThanOrEqual(inv.target[1]);
    for (const cls of inv.soloClasses) expect(sim.fightGroup(inv.scenario, inv.group.filter(p => p.className === cls), 1, 1200).outcome, `${inv.name} solo ${cls}`).not.toBe('kill');
  }
});
```

- [ ] **Step 4: Calibrar** con `npm run balance --workspace @aden/server -- --invasions` (escribe `artifacts/balance/invasions.json`):
  - vida ← vida × objetivo medio / tiempo del grupo (objetivos: 300 s el dragón, 150 s los chicos);
  - si el grupo sufre `wipe`, bajar el ataque 5 % por ronda;
  - si un solo gana, subir la vida;
  - máximo 6 rondas; si no converge, reportarlo como BLOCKED.
- [ ] **Step 5:** `npm test` + tres `tsc`. **Commit** `feat: calibrate the invaders for groups with the balance simulator`.

---

### Task 8: Verificación final

- [ ] Suite completa, tres `tsc`, builds de cliente y server.
- [ ] Navegador con server semilla temporal (no commitear) que llama `events.startNow('crimson_dragon', 'pueblo')` con el anuncio adelantado. Personajes de prueba de nivel 25 y nivel 5 en el pueblo. Verificar:
  - el cartel con la cuenta regresiva y luego el tiempo restante;
  - el anuncio;
  - el marcador;
  - el indicador "Área de invasión · PvP" y "· protegido";
  - el ranking al pegarle;
  - la consola sin errores.

  Después quitar el server semilla y la configuración temporal.
- [ ] Actualizar la memoria del proyecto. Reportar al usuario y pedir OK para integrar en `master` y pushear (el push publica cliente y server juntos por el cambio de schema).
