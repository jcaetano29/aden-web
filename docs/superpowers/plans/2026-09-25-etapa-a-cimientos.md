# Etapa A — Cimientos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir en datos lo que hoy está escrito caso por caso (capítulos, encargos, jefes), liberar campos del estado del jugador, cerrar las reglas pendientes (viaje en combate, maná) y crear un simulador de balance, sin cambiar el comportamiento actual.

**Architecture:** Registros en `@aden/shared` (`chapters.ts`, `sideChains.ts`, `encounters.ts`, `travel.ts`, `regen.ts`) que el servidor interpreta. `PlayerState` agrupa campos en sub-schemas Colyseus. Un `EncounterSystem` reemplaza la lógica fija de `stepGuardianHazard`. El simulador arranca una sala real con `@colyseus/testing`, detiene el intervalo y avanza `tick()` a mano con reloj y azar controlados.

**Tech Stack:** TypeScript (npm workspaces `@aden/shared`, `@aden/server`, `@aden/client`), Colyseus 0.15 + `@colyseus/schema` 2, Three.js 0.160, Vitest 1.6, tsx.

**Spec:** `docs/superpowers/specs/2026-09-25-fragua-antigua-design.md` (§6 es esta etapa).

## Global Constraints

- Rama de trabajo: `fragua-antigua`. No hacer push ni merge sin OK explícito del usuario.
- Colyseus 0.15 admite como máximo 64 campos `@type` por clase Schema. Contar con `Object.keys((Clase as any)._definition.schema).length`.
- Sin migraciones de Supabase. El formato de `ProgressSave` sigue leyendo saves viejos; los saves nuevos conservan `bountyId`/`bountyProgress`/`veilContractId`/`veilContractProgress` para poder volver atrás.
- El servidor es la única autoridad; el cliente solo lee estado y manda intención.
- Comportamiento actual intacto: los tests existentes de campaña, Cripta, Marismas, Monasterio y jefes conservan sus valores esperados. Solo pueden cambiar (a) rutas de acceso a campos movidos a sub-estados y (b) tests que viajan inmediatamente después de combatir, que deben fijar `p.msSinceCombat = TRAVEL_COMBAT_LOCK_MS` antes del viaje.
- Estilo: igual al código vecino (comentarios en español, identificadores en inglés, estilo compacto del archivo que se edita).
- Verificación de cada tarea: `npm test` en la raíz + `npx tsc -p shared/tsconfig.json --noEmit` + `npx tsc -p server/tsconfig.json --noEmit` + `npx tsc -p client/tsconfig.json --noEmit` (vitest no chequea tipos).
- Commits en inglés, estilo conventional, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `server/src/state/AttributesState.ts` (nuevo) | Sub-schema: str/agi/vit/ene/statPoints |
| `server/src/state/RetentionState.ts` (nuevo) | Sub-schema: racha, diaria, bajas totales |
| `server/src/state/SideChainState.ts` (nuevo) | Sub-schema: paso y progreso de un encargo |
| `server/src/state/PlayerState.ts` | Usa los tres sub-estados |
| `server/src/state/MobState.ts` | `hazardArc`, `hazardAngle` sincronizados; campos de invocación server-only |
| `shared/src/act1.ts` (nuevo) | `QUEST_ORDER` y `CAMPAIGN_COMPLETE` del Acto I (evita import circular) |
| `shared/src/chapters.ts` (nuevo) | Registro de capítulos, orden global, puertas de mapa, `nextQuestId` |
| `shared/src/sideChains.ts` (nuevo) | Registro de encargos (Varek, Boren) |
| `shared/src/encounters.ts` (nuevo) | Patrones de jefes, invocaciones, requisitos de misión |
| `shared/src/travel.ts` (nuevo) | Regla de viaje en combate |
| `shared/src/regen.ts` (nuevo) | Regeneración de maná dentro/fuera de combate |
| `server/src/systems/EncounterSystem.ts` (nuevo) | Intérprete de encuentros (reemplaza `stepGuardianHazard`) |
| `server/src/systems/AdventureSystem.ts` | Re-exporta `stepGuardianHazard`; gating por encuentro |
| `server/src/persistence/CharacterSave.ts` | Lee sub-estados; `sideChains` con migración |
| `server/src/rooms/GameRoom.ts` | Usa los registros; invocaciones; reglas nuevas |
| `server/src/systems/PotionRecovery.ts` | Reloj de enlace tardío (para el simulador) |
| `server/src/sim/BalanceSimulator.ts` (nuevo) | Simulador determinista |
| `server/src/sim/scenarios.ts` (nuevo) | Perfiles garantizados y escenarios de línea base |
| `server/scripts/balance.ts` (nuevo) | CLI que escribe `artifacts/balance/*.json` |
| `client/src/net/NetworkClient.ts` | Lee sub-estados; `hazardArc`/`hazardAngle` en `MobSnapshot` |
| `client/src/render/HazardViews.ts` | Dibuja sector (cono) o círculo |

---

### Task 1: Atributos y retención en sub-estados

**Files:**
- Create: `server/src/state/AttributesState.ts`, `server/src/state/RetentionState.ts`, `server/src/state/PlayerState.test.ts`
- Modify: `server/src/state/PlayerState.ts`, `server/src/rooms/GameRoom.ts`, `server/src/persistence/CharacterSave.ts`, `client/src/net/NetworkClient.ts`
- Test (rutas de acceso): `server/src/persistence/CharacterSave.test.ts`, `server/src/rooms/GameRoom.test.ts`, `server/src/rooms/Party.test.ts`

**Interfaces:**
- Produces: `PlayerState.attributes: AttributesState` (`str`, `agi`, `vit`, `ene`, `statPoints`) y `PlayerState.retention: RetentionState` (`loginStreak`, `dailyQuestId`, `dailyProgress`, `dailyDone`, `totalKills`). `Persistable.attributes` / `Persistable.retention` con esas mismas claves. Quedan en `PlayerState`: `lastLoginDay`, `bossKills`, `title`, `achievements`.

- [ ] **Step 1: Test de presupuesto de schema (falla)**

`server/src/state/PlayerState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PlayerState } from './PlayerState.js';

const fieldCount = (cls: unknown) => Object.keys((cls as { _definition: { schema: object } })._definition.schema).length;

describe('PlayerState schema budget', () => {
  it('leaves headroom under the 64-field Colyseus limit', () => {
    expect(fieldCount(PlayerState)).toBeLessThanOrEqual(48);
  });
  it('groups attributes and retention into sub-states', () => {
    const p = new PlayerState();
    expect(p.attributes.str).toBe(0);
    expect(p.attributes.statPoints).toBe(0);
    expect(p.retention.loginStreak).toBe(0);
    expect(p.retention.dailyDone).toBe(false);
    expect('str' in p).toBe(false);
    expect('loginStreak' in p).toBe(false);
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/state/PlayerState.test.ts` (desde `server/`)
Expected: FAIL (56 campos; `p.attributes` undefined).

- [ ] **Step 3: Crear los sub-estados**

`server/src/state/AttributesState.ts`:

```ts
import { Schema, type } from "@colyseus/schema";

/** Atributos primarios asignables (Etapa 21), agrupados para liberar campos de PlayerState. */
export class AttributesState extends Schema {
  @type("number") str = 0;
  @type("number") agi = 0;
  @type("number") vit = 0;
  @type("number") ene = 0;
  @type("number") statPoints = 0;
}
```

`server/src/state/RetentionState.ts`:

```ts
import { Schema, type } from "@colyseus/schema";

/** Retención sincronizada (Etapa 13): racha, misión diaria y bajas totales. */
export class RetentionState extends Schema {
  @type("number") loginStreak = 0;
  @type("string") dailyQuestId = "";
  @type("number") dailyProgress = 0;
  @type("boolean") dailyDone = false;
  @type("number") totalKills = 0;
}
```

- [ ] **Step 4: Usarlos en `PlayerState`**

En `server/src/state/PlayerState.ts`:
- Agregar `import { AttributesState } from "./AttributesState.js";` y `import { RetentionState } from "./RetentionState.js";`.
- Borrar las líneas `@type("number") str`, `agi`, `vit`, `ene`, `statPoints` y en su lugar:

```ts
  // Etapa 21: atributos primarios asignables + puntos sin gastar (sincronizados).
  @type(AttributesState) attributes = new AttributesState();
```

- Borrar `loginStreak`, `dailyQuestId`, `dailyProgress`, `dailyDone`, `totalKills` del bloque de retención y en su lugar:

```ts
  @type(RetentionState) retention = new RetentionState();
```

(`title` y `achievements` se quedan en ese bloque.)

- [ ] **Step 5: Actualizar `GameRoom.ts`**

Reemplazar cada acceso según esta tabla (todos en `server/src/rooms/GameRoom.ts`):

| Antes | Después |
|---|---|
| `p.str`, `p.agi`, `p.vit`, `p.ene`, `p.statPoints` (y `player.` / `pl.`) | `p.attributes.str` … `p.attributes.statPoints` |
| `p.loginStreak`, `p.dailyQuestId`, `p.dailyProgress`, `p.dailyDone`, `p.totalKills` | `p.retention.loginStreak` … `p.retention.totalKills` |

Casos concretos:
- `recomputeStats`: `const attr = attributeBonuses({ str: p.attributes.str, agi: p.attributes.agi, vit: p.attributes.vit, ene: p.attributes.ene });`
- Handler `AllocateStat`:

```ts
      if (p.attributes.statPoints <= 0) return;
      const attr = msg?.attr ?? "";
      if (!isValidAttribute(attr)) return;
      p.attributes[attr as Attribute] += 1;
      p.attributes.statPoints -= 1;
      this.recomputeStats(p);
```

- `onJoin`, bloque `if (pr)`: `player.retention.loginStreak = pr.loginStreak ?? 0;` … `player.retention.totalKills = pr.totalKills ?? 0;` y `player.attributes.str = pr.str ?? 0;` … `player.attributes.ene = pr.ene ?? 0;`
- Derivación: `player.attributes.statPoints = Math.max(0, pointsForLevel(player.level) - (player.attributes.str + player.attributes.agi + player.attributes.vit + player.attributes.ene));`
- `grantExp`: `player.attributes.statPoints += lvls * POINTS_PER_LEVEL;`
- `checkAchievements`: `totalKills: p.retention.totalKills,`
- `handleDailyRollover` y `creditMobKill`: todos los campos de retención pasan por `.retention`.

Buscar restos: `grep -n "\.str\b\|\.agi\b\|\.vit\b\|\.ene\b\|statPoints\|loginStreak\|dailyQuestId\|dailyProgress\|dailyDone\|totalKills" server/src/rooms/GameRoom.ts` — cada línea debe pasar por `.attributes.` o `.retention.` (o ser una clave de `pr`, que es el save plano).

- [ ] **Step 6: Actualizar `CharacterSave.ts`**

En `Persistable`, reemplazar los campos planos de retención (`loginStreak`, `dailyQuestId`, `dailyProgress`, `dailyDone`, `totalKills`) y de atributos (`str`, `agi`, `vit`, `ene`, `statPoints`) por:

```ts
  retention: { loginStreak: number; dailyQuestId: string; dailyProgress: number; dailyDone: boolean; totalKills: number };
  attributes: { str: number; agi: number; vit: number; ene: number; statPoints: number };
```

(`lastLoginDay`, `bossKills`, `title`, `achievements` se quedan planos.) En `toCharacterSave`, dentro de `progress`, mantener las MISMAS claves de salida leyendo de los sub-estados:

```ts
      loginStreak: p.retention.loginStreak,
      lastLoginDay: p.lastLoginDay,
      dailyQuestId: p.retention.dailyQuestId,
      dailyProgress: p.retention.dailyProgress,
      dailyDone: p.retention.dailyDone,
      totalKills: p.retention.totalKills,
      bossKills: p.bossKills,
      title: p.title,
      achievements,
      bountyId: p.bountyId,
      bountyProgress: p.bountyProgress,
      ...(p.veilContractId ? {veilContractId:p.veilContractId,veilContractProgress:p.veilContractProgress??0} : {}),
      str: p.attributes.str,
      agi: p.attributes.agi,
      vit: p.attributes.vit,
      ene: p.attributes.ene,
      statPoints: p.attributes.statPoints,
```

- [ ] **Step 7: Actualizar el cliente**

En `client/src/net/NetworkClient.ts`:
- `getSelf()`: `str: p.attributes?.str ?? 0, agi: p.attributes?.agi ?? 0, vit: p.attributes?.vit ?? 0, ene: p.attributes?.ene ?? 0, statPoints: p.attributes?.statPoints ?? 0,`
- `getProgress()`: `loginStreak: p.retention?.loginStreak ?? 0, dailyQuestId: p.retention?.dailyQuestId ?? "", dailyProgress: p.retention?.dailyProgress ?? 0, dailyDone: p.retention?.dailyDone ?? false, totalKills: p.retention?.totalKills ?? 0,`

Los paneles consumen `SelfCombatSnapshot` y el objeto de `getProgress()`, cuya forma no cambia.

- [ ] **Step 8: Adaptar rutas en tests**

- `server/src/persistence/CharacterSave.test.ts`: en el objeto pasado a `toCharacterSave`, reemplazar `loginStreak: 4, … dailyDone: false, totalKills: 42,` por `retention: { loginStreak: 4, dailyQuestId: "d_hunt", dailyProgress: 3, dailyDone: false, totalKills: 42 }, lastLoginDay: "2026-08-24", bossKills: 1, title: "Aventurero", achievements,` y `str: 5, agi: 2, vit: 3, ene: 1, statPoints: 4` por `attributes: { str: 5, agi: 2, vit: 3, ene: 1, statPoints: 4 }`. El `expect(save.progress).toEqual(...)` NO cambia.
- `server/src/rooms/GameRoom.test.ts` y `server/src/rooms/Party.test.ts`: aplicar la tabla del Step 5 (`p.dailyQuestId = ''` → `p.retention.dailyQuestId = ''`, etc.). Encontrarlos con `grep -n "\.str\b\|\.agi\b\|\.vit\b\|\.ene\b\|statPoints\|loginStreak\|dailyQuestId\|dailyProgress\|dailyDone\|totalKills" server/src/rooms/*.test.ts`. No cambiar valores esperados.

- [ ] **Step 9: Verificar**

Run: `npm test` (raíz) y los tres `npx tsc ... --noEmit`.
Expected: todo verde; `PlayerState.test.ts` PASS (48 campos).

- [ ] **Step 10: Commit**

```bash
git add server/src/state client/src/net/NetworkClient.ts server/src/rooms server/src/persistence
git commit -m "refactor: group player attributes and retention into sub-states"
```

---

### Task 2: Capítulos como datos

**Files:**
- Create: `shared/src/act1.ts`, `shared/src/chapters.ts`, `shared/src/chapters.test.ts`
- Modify: `shared/src/quests.ts`, `shared/src/questNarrative.ts`, `shared/src/index.ts`, `server/src/rooms/GameRoom.ts`, `server/src/systems/AdventureSystem.ts`

**Interfaces:**
- Produces (desde `@aden/shared`): `CHAPTERS: readonly ChapterDef[]`, `campaignIndex(questId): number`, `questReached(questId, gate): boolean`, `isChapterComplete(questId): boolean`, `chapterAfter(completeId): ChapterDef | null`, `mapGate(mapId): { from: string; text: string } | null`, `nextQuestId(current): string` (movida desde `quests.ts`, que la re-exporta).

- [ ] **Step 1: Test del registro (falla)**

`shared/src/chapters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CHAPTERS, campaignIndex, questReached, isChapterComplete, chapterAfter, nextQuestId, mapGate } from './chapters.js';
import { QUEST_ORDER, CAMPAIGN_COMPLETE, getQuest } from './quests.js';
import { VEIL_QUEST_ORDER, VEIL_COMPLETE } from './veil.js';
import { MONASTERY_QUEST_ORDER, MEMORY_COMPLETE } from './monastery.js';

describe('campaign chapters', () => {
  it('chains every chapter in order and ends each on its complete state', () => {
    expect(CHAPTERS.map(c => c.id)).toEqual(['act1', 'veil', 'memory']);
    expect(nextQuestId(QUEST_ORDER[QUEST_ORDER.length - 1])).toBe(CAMPAIGN_COMPLETE);
    expect(nextQuestId(VEIL_QUEST_ORDER[VEIL_QUEST_ORDER.length - 1])).toBe(VEIL_COMPLETE);
    expect(nextQuestId(MONASTERY_QUEST_ORDER[MONASTERY_QUEST_ORDER.length - 1])).toBe(MEMORY_COMPLETE);
    for (const c of CHAPTERS) expect(nextQuestId(c.completeId)).toBe(c.completeId);
    expect(nextQuestId('unknown')).toBe('q1');
  });
  it('offers each chapter from the previous complete state through its NPC', () => {
    expect(chapterAfter(CAMPAIGN_COMPLETE)?.id).toBe('veil');
    expect(chapterAfter(CAMPAIGN_COMPLETE)?.start).toMatchObject({ npcId: 'elder', minLevel: 10 });
    expect(chapterAfter(VEIL_COMPLETE)?.start).toMatchObject({ npcId: 'maera', minLevel: 12 });
    expect(chapterAfter(MEMORY_COMPLETE)).toBeNull();
    expect(chapterAfter('q1')).toBeNull();
  });
  it('orders progress globally for gates', () => {
    expect(questReached('a2_prior', 'a2_prior')).toBe(true);
    expect(questReached(MEMORY_COMPLETE, 'a2_prior')).toBe(true);
    expect(questReached('a2_jailer', 'a2_prior')).toBe(false);
    expect(questReached('', 'a2_prior')).toBe(false);
    expect(campaignIndex(CAMPAIGN_COMPLETE)).toBe(QUEST_ORDER.length);
    expect(isChapterComplete(VEIL_COMPLETE)).toBe(true);
    expect(isChapterComplete('q1')).toBe(false);
  });
  it('gates the Monastery until the Veil is recovered, and nothing else', () => {
    const gate = mapGate('monasterio')!;
    expect(gate.from).toBe(VEIL_COMPLETE);
    for (const id of [VEIL_COMPLETE, ...MONASTERY_QUEST_ORDER, MEMORY_COMPLETE]) expect(questReached(id, gate.from)).toBe(true);
    for (const id of [...QUEST_ORDER, CAMPAIGN_COMPLETE, ...VEIL_QUEST_ORDER]) expect(questReached(id, gate.from)).toBe(false);
    expect(mapGate('marismas')).toBeNull();
  });
  it('references only real quests', () => {
    for (const c of CHAPTERS) for (const id of c.questOrder) expect(getQuest(id).id).toBe(id);
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/chapters.test.ts` (desde `shared/`). Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Extraer el Acto I**

`shared/src/act1.ts`:

```ts
/** Acto I (niveles 1–10): orden de la campaña de Rowan y su estado final. */
export const CAMPAIGN_COMPLETE = "campaign_complete";
export const QUEST_ORDER: string[] = ["q1", "q_supplies", "q_shrine", "q2", "q_alpha", "q_ruins", "q3", "q4", "q_crypt", "q5", "q_ash_shrine", "q6"];
```

En `shared/src/quests.ts`:
- Reemplazar las dos primeras líneas de import por:

```ts
import { VEIL_QUESTS } from './veil.js';
import { MONASTERY_QUESTS } from './monastery.js';
import { QUEST_ORDER } from './act1.js';
export { QUEST_ORDER, CAMPAIGN_COMPLETE } from './act1.js';
export { nextQuestId } from './chapters.js';
```

- Borrar `export const CAMPAIGN_COMPLETE = "campaign_complete";`, `export const QUEST_ORDER: string[] = [...]` y la función `nextQuestId` completa. `firstQuestId` queda igual.

(No hay ciclo: `veil.ts` y `monastery.ts` solo hacen `import type` de `quests.js`.)

- [ ] **Step 4: Crear `chapters.ts`**

`shared/src/chapters.ts`:

```ts
import { QUEST_ORDER, CAMPAIGN_COMPLETE } from './act1.js';
import { VEIL_QUEST_ORDER, VEIL_COMPLETE } from './veil.js';
import { MONASTERY_QUEST_ORDER, MEMORY_COMPLETE } from './monastery.js';

/** Cómo se ofrece un capítulo desde el estado final del anterior. */
export interface ChapterStart {
  /** completeId del capítulo anterior. */
  after: string;
  /** NPC que lo ofrece. */
  npcId: string;
  minLevel: number;
  lockedText: string;
  startedText: string;
}

export interface ChapterDef {
  id: string;
  questOrder: readonly string[];
  completeId: string;
  /** null = capítulo inicial: Rowan lo entrega a un personaje sin misión. */
  start: ChapterStart | null;
  /** Mapas que exigen haber llegado a cierto punto de la campaña. */
  mapGates?: Record<string, { from: string; text: string }>;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'act1', questOrder: QUEST_ORDER, completeId: CAMPAIGN_COMPLETE, start: null },
  { id: 'veil', questOrder: VEIL_QUEST_ORDER, completeId: VEIL_COMPLETE,
    start: { after: CAMPAIGN_COMPLETE, npcId: 'elder', minLevel: 10,
      lockedText: 'La expedición a las Marismas requiere nivel 10.',
      startedText: 'Nueva expedición: viajá a las Marismas y encontrá a Maera.' } },
  { id: 'memory', questOrder: MONASTERY_QUEST_ORDER, completeId: MEMORY_COMPLETE,
    start: { after: VEIL_COMPLETE, npcId: 'maera', minLevel: 12,
      lockedText: 'La expedición al Monasterio requiere nivel 12.',
      startedText: 'Nueva expedición: encontrá a Iria en el Monasterio de la Vigilia.' },
    mapGates: { monasterio: { from: VEIL_COMPLETE, text: 'Recuperá el paso de las Marismas y hablá con Maera antes de viajar al Monasterio.' } } },
];

/** Secuencia global: misiones de cada capítulo seguidas de su estado final. */
const SEQUENCE: readonly string[] = CHAPTERS.flatMap(c => [...c.questOrder, c.completeId]);

/** Posición de un questId en la campaña completa; -1 si no pertenece a ella. */
export function campaignIndex(questId: string): number {
  return SEQUENCE.indexOf(questId);
}

/** ¿El jugador ya llegó (o pasó) a `gate` en la campaña? */
export function questReached(questId: string, gate: string): boolean {
  const at = campaignIndex(questId), need = campaignIndex(gate);
  return at >= 0 && need >= 0 && at >= need;
}

export function isChapterComplete(questId: string): boolean {
  return CHAPTERS.some(c => c.completeId === questId);
}

/** Capítulo que se ofrece desde este estado final, o null. */
export function chapterAfter(completeId: string): ChapterDef | null {
  return CHAPTERS.find(c => c.start?.after === completeId) ?? null;
}

/** Siguiente misión de la campaña; un estado final se queda donde está. */
export function nextQuestId(current: string): string {
  if (isChapterComplete(current)) return current;
  for (const c of CHAPTERS) {
    const i = c.questOrder.indexOf(current);
    if (i >= 0) return c.questOrder[i + 1] ?? c.completeId;
  }
  return CHAPTERS[0].questOrder[0];
}

/** Restricción de campaña para viajar a un mapa (null = sin restricción). */
export function mapGate(mapId: string): { from: string; text: string } | null {
  for (const c of CHAPTERS) {
    const gate = c.mapGates?.[mapId];
    if (gate) return gate;
  }
  return null;
}
```

Agregar a `shared/src/index.ts` solo `export * from './chapters.js';` (`QUEST_ORDER` y `CAMPAIGN_COMPLETE` ya salen por `quests.js`). `nextQuestId` llega por dos `export *` pero es el mismo binding re-exportado, así que TypeScript no lo trata como conflicto. Si `tsc` lo reportara igual, quitar el `export { nextQuestId }` de `quests.ts` y cambiar los imports de `nextQuestId` en `shared/src/quests.test.ts` y `shared/src/veil.test.ts` a `./chapters.js`.

- [ ] **Step 5: `questNarrative.ts`**

Cambiar `if (nextId === CAMPAIGN_COMPLETE || nextId === VEIL_COMPLETE || nextId === MEMORY_COMPLETE) return quest.done;` por `if (isChapterComplete(nextId)) return quest.done;` e importar `isChapterComplete` desde `./chapters.js`. Quitar imports que queden sin uso.

- [ ] **Step 6: Servidor**

En `GameRoom.serveElder`, reemplazar desde `if (p.questId === MEMORY_COMPLETE) return;` hasta el cierre del bloque `if (p.questId === 'campaign_complete') { ... }` por:

```ts
    const next = chapterAfter(p.questId);
    if (next?.start) {
      if (npcId !== next.start.npcId) return;
      if (p.level < next.start.minLevel) { client.send(MessageType.ItemResult, { success: false, text: next.start.lockedText }); return; }
      const first = getQuest(next.questOrder[0]);
      p.questId = first.id;
      p.questProgress = first.objective === 'visit' && p.mapId === first.targetId ? first.amount : 0;
      client.send(MessageType.ItemResult, { success: true, text: next.start.startedText });
      return;
    }
    if (isChapterComplete(p.questId)) return;
```

En el handler `WarpTo`, reemplazar el `if (zone.id === 'monasterio' && ...) { ... }` por:

```ts
      const gate = mapGate(zone.id);
      if (gate && !questReached(p.questId, gate.from)) {
        client.send(MessageType.ItemResult, { success: false, text: gate.text });
        return;
      }
```

Importar `chapterAfter`, `isChapterComplete`, `mapGate`, `questReached` desde `@aden/shared` y quitar `VEIL_COMPLETE`, `VEIL_QUEST_ORDER`, `MEMORY_COMPLETE`, `MONASTERY_QUEST_ORDER` del import de la línea 1 si quedan sin uso (`MEMORY_ANCHORS` sigue en uso hasta la Task 4).

En `AdventureSystem.advanceQuest`: `if (p.dead || !p.questId || isChapterComplete(p.questId)) return;` (importar `isChapterComplete`).

- [ ] **Step 7: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde, incluidos `VeilCampaign.test.ts`, `MonasteryCampaign.test.ts`, `quests.test.ts`, `veil.test.ts`, `monastery.test.ts` sin cambios.

- [ ] **Step 8: Commit**

```bash
git add shared/src server/src/rooms/GameRoom.ts server/src/systems/AdventureSystem.ts
git commit -m "refactor: drive campaign chapters and map gates from a registry"
```

---

### Task 3: Encargos opcionales como datos

**Files:**
- Create: `shared/src/sideChains.ts`, `shared/src/sideChains.test.ts`, `server/src/state/SideChainState.ts`
- Modify: `shared/src/index.ts`, `server/src/state/PlayerState.ts`, `server/src/state/PlayerState.test.ts`, `server/src/persistence/CharacterSave.ts`, `server/src/persistence/CharacterSave.test.ts`, `server/src/rooms/GameRoom.ts`, `client/src/net/NetworkClient.ts`
- Test (rutas): `server/src/rooms/BorenContracts.test.ts`, `server/src/rooms/GameRoom.test.ts`

**Interfaces:**
- Consumes: `BOUNTIES`, `BOUNTY_ORDER` (`bounties.ts`), `VEIL_CONTRACTS`, `VEIL_CONTRACTS_COMPLETE` (`veilContracts.ts`).
- Produces: `SIDE_CHAINS`, `getSideChain(id)`, `sideChainForNpc(npcId)`, `sideChainStep(chain, stepId)`, `nextSideChainStep(chain, stepId)`; `PlayerState.sideChains: MapSchema<SideChainState>` con claves `'varek'` y `'boren'`; `SideChainSave { id: string; progress: number }`; `ProgressSave.sideChains?: Record<string, SideChainSave>`; `sideChainsFromSave(pr)`.

- [ ] **Step 1: Test del registro (falla)**

`shared/src/sideChains.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SIDE_CHAINS, getSideChain, sideChainForNpc, sideChainStep, nextSideChainStep } from './sideChains.js';
import { BOUNTIES, BOUNTY_ORDER } from './bounties.js';
import { VEIL_CONTRACTS, VEIL_CONTRACTS_COMPLETE } from './veilContracts.js';
import { getNpc } from './npcs.js';

describe('side chains', () => {
  it('mirrors Varek bounties as a repeatable kill chain', () => {
    const varek = getSideChain('varek')!;
    expect(varek).toMatchObject({ npcId: 'captain', kind: 'repeatable', minLevel: 0, announce: false });
    expect(varek.steps.map(s => s.id)).toEqual(BOUNTY_ORDER);
    expect(sideChainStep(varek, 'b_hunt')).toMatchObject({ objective: 'kill', targetId: '', amount: BOUNTIES.b_hunt.amount, rewardExp: BOUNTIES.b_hunt.rewardExp });
    expect(nextSideChainStep(varek, BOUNTY_ORDER[BOUNTY_ORDER.length - 1])).toBe(BOUNTY_ORDER[0]);
  });
  it('mirrors Boren errands as a one-time interact sequence', () => {
    const boren = sideChainForNpc('boren')!;
    expect(boren).toMatchObject({ id: 'boren', kind: 'sequence', minLevel: 10, announce: true, completeId: VEIL_CONTRACTS_COMPLETE });
    expect(boren.steps.map(s => [s.id, s.targetId, s.mapId])).toEqual(VEIL_CONTRACTS.map(c => [c.id, c.objectId, c.mapId]));
    expect(nextSideChainStep(boren, VEIL_CONTRACTS[0].id)).toBe(VEIL_CONTRACTS[1].id);
    expect(nextSideChainStep(boren, VEIL_CONTRACTS[2].id)).toBe(VEIL_CONTRACTS_COMPLETE);
    expect(nextSideChainStep(boren, VEIL_CONTRACTS_COMPLETE)).toBe(VEIL_CONTRACTS_COMPLETE);
  });
  it('binds every chain to a real NPC', () => {
    for (const chain of SIDE_CHAINS) expect(getNpc(chain.npcId).id).toBe(chain.npcId);
    expect(sideChainForNpc('healer')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/sideChains.test.ts` (desde `shared/`). Expected: FAIL.

- [ ] **Step 3: Crear `sideChains.ts`**

```ts
import { BOUNTIES, BOUNTY_ORDER } from './bounties.js';
import { VEIL_CONTRACTS, VEIL_CONTRACTS_COMPLETE } from './veilContracts.js';

export interface SideChainStep {
  id: string;
  title: string;
  intro: string;
  done: string;
  objective: 'kill' | 'interact';
  /** kill: templateId ('' = cualquier enemigo). interact: id del objeto. */
  targetId: string;
  /** interact: mapa donde cuenta el objeto. */
  mapId?: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
  rewardItemId?: string;
  rewardQty?: number;
}

export interface SideChainDef {
  id: string;
  npcId: string;
  /** sequence: termina en completeId. repeatable: vuelve al primer paso. */
  kind: 'sequence' | 'repeatable';
  minLevel: number;
  /** true: el servidor avisa al aceptar, cumplir y entregar. false: el cliente arma su propio diálogo. */
  announce: boolean;
  steps: readonly SideChainStep[];
  completeId?: string;
  /** Se agrega al aviso de objetivo cumplido. */
  returnHint?: string;
}

export const SIDE_CHAINS: readonly SideChainDef[] = [
  { id: 'varek', npcId: 'captain', kind: 'repeatable', minLevel: 0, announce: false,
    steps: BOUNTY_ORDER.map(id => {
      const b = BOUNTIES[id];
      return { id: b.id, title: b.title, intro: '', done: '', objective: 'kill' as const, targetId: b.mobTemplateId,
        amount: b.amount, rewardExp: b.rewardExp, rewardGold: b.rewardGold };
    }) },
  { id: 'boren', npcId: 'boren', kind: 'sequence', minLevel: 10, announce: true,
    completeId: VEIL_CONTRACTS_COMPLETE, returnHint: 'Volvé con Boren en las Marismas.',
    steps: VEIL_CONTRACTS.map(c => ({ id: c.id, title: c.title, intro: c.intro, done: c.done, objective: 'interact' as const,
      targetId: c.objectId, mapId: c.mapId, amount: 1, rewardExp: 0, rewardGold: c.rewardGold,
      rewardItemId: c.rewardItemId, rewardQty: c.rewardQty })) },
];

export function getSideChain(id: string): SideChainDef | undefined {
  return SIDE_CHAINS.find(c => c.id === id);
}

export function sideChainForNpc(npcId: string): SideChainDef | undefined {
  return SIDE_CHAINS.find(c => c.npcId === npcId);
}

export function sideChainStep(chain: SideChainDef, stepId: string): SideChainStep | undefined {
  return chain.steps.find(s => s.id === stepId);
}

/** Paso siguiente: vuelve al primero si es repetible; completeId al terminar una secuencia. */
export function nextSideChainStep(chain: SideChainDef, stepId: string): string {
  if (stepId === chain.completeId) return stepId;
  const next = chain.steps[chain.steps.findIndex(s => s.id === stepId) + 1];
  if (next) return next.id;
  return chain.kind === 'repeatable' ? chain.steps[0].id : chain.completeId ?? chain.steps[0].id;
}
```

Agregar `export * from './sideChains.js';` a `shared/src/index.ts`.

- [ ] **Step 4: Sub-estado y `PlayerState`**

`server/src/state/SideChainState.ts`:

```ts
import { Schema, type } from "@colyseus/schema";

/** Paso activo de un encargo opcional (clave del mapa = id de la cadena). */
export class SideChainState extends Schema {
  @type("string") id = "";
  @type("number") progress = 0;
}
```

En `PlayerState.ts`: borrar `bountyId`, `bountyProgress`, `veilContractId`, `veilContractProgress` y agregar (importando `SideChainState`):

```ts
  // Encargos opcionales (Varek, Boren, …): cadena → paso y progreso.
  @type({ map: SideChainState }) sideChains = new MapSchema<SideChainState>();
```

En `PlayerState.test.ts` cambiar el límite a `toBeLessThanOrEqual(45)` y agregar al segundo test `expect(p.sideChains.size).toBe(0); expect('bountyId' in p).toBe(false);`.

- [ ] **Step 5: Guardado con migración (test primero)**

Agregar a `CharacterSave.test.ts`:

```ts
describe("sideChainsFromSave", () => {
  it("prefiere el formato nuevo y migra los campos viejos", () => {
    expect(sideChainsFromSave({ sideChains: { boren: { id: "b_veil_tool", progress: 1 } } }))
      .toEqual({ boren: { id: "b_veil_tool", progress: 1 } });
    expect(sideChainsFromSave({ bountyId: "b_crypt", bountyProgress: 2, veilContractId: "b_veil_supplies", veilContractProgress: 1 }))
      .toEqual({ varek: { id: "b_crypt", progress: 2 }, boren: { id: "b_veil_supplies", progress: 1 } });
    expect(sideChainsFromSave({ bountyId: "" })).toEqual({});
  });
});
```

(importar `sideChainsFromSave`). En el test existente de `toCharacterSave`: reemplazar `bountyId: "b_forest", bountyProgress: 3,` del objeto de entrada por `sideChains: new Map([["varek", { id: "b_forest", progress: 3 }]]),` y agregar al `expect(save.progress).toEqual({...})` la clave `sideChains: { varek: { id: "b_forest", progress: 3 } },` (se conservan `bountyId: "b_forest", bountyProgress: 3`).

En `CharacterSave.ts`:

```ts
export interface SideChainSave { id: string; progress: number }
```

- `ProgressSave`: agregar `sideChains?: Record<string, SideChainSave>;` (dejar los campos viejos).
- `Persistable`: borrar `veilContractId?`, `veilContractProgress?`, `bountyId`, `bountyProgress`; agregar `sideChains: { forEach(cb: (v: { id: string; progress: number }, k: string) => void): void };`.
- `toCharacterSave`: antes del `return`,

```ts
  const sideChains: Record<string, SideChainSave> = {};
  p.sideChains.forEach((v, k) => { if (v.id) sideChains[k] = { id: v.id, progress: v.progress }; });
```

y en `progress` reemplazar las líneas de `bountyId`, `bountyProgress` y el spread de `veilContractId` por:

```ts
      // Campos viejos: se siguen escribiendo para poder volver a una versión anterior.
      bountyId: sideChains.varek?.id ?? "",
      bountyProgress: sideChains.varek?.progress ?? 0,
      ...(sideChains.boren ? { veilContractId: sideChains.boren.id, veilContractProgress: sideChains.boren.progress } : {}),
      ...(Object.keys(sideChains).length ? { sideChains } : {}),
```

- Nueva función:

```ts
/** Encargos guardados: formato nuevo si existe; si no, migra los campos de Varek y Boren. */
export function sideChainsFromSave(pr: Partial<ProgressSave>): Record<string, SideChainSave> {
  if (pr.sideChains) return { ...pr.sideChains };
  const out: Record<string, SideChainSave> = {};
  if (pr.bountyId) out.varek = { id: pr.bountyId, progress: pr.bountyProgress ?? 0 };
  if (pr.veilContractId) out.boren = { id: pr.veilContractId, progress: pr.veilContractProgress ?? 0 };
  return out;
}
```

- [ ] **Step 6: Servidor genérico**

En `GameRoom.ts` (importar `SideChainState`, `sideChainsFromSave`, `getSideChain`, `sideChainForNpc`, `sideChainStep`, `nextSideChainStep`, `type SideChainDef`):

a) `InteractNpc`: reemplazar las líneas de `captain` y `boren` por

```ts
      const chain = sideChainForNpc(npcId);
      if (chain) { this.serveSideChain(p, client, chain); return; }
```

(queda: healer → chain → elder).

b) Reemplazar `serveBoren` y `serveCaptain` por:

```ts
  /** Encargos opcionales: aceptar, entregar y avanzar según el registro compartido. */
  private serveSideChain(p: PlayerState, client: Client, chain: SideChainDef): void {
    if (p.level < chain.minLevel) return;
    const entry = p.sideChains.get(chain.id);
    if (entry && entry.id === chain.completeId) return;
    if (!entry || entry.id === '') {
      const first = chain.steps[0];
      const created = new SideChainState();
      created.id = first.id; created.progress = 0;
      p.sideChains.set(chain.id, created);
      if (chain.announce) client.send(MessageType.ItemResult, { success: true, text: `Encargo aceptado: ${first.intro}` });
      return;
    }
    const step = sideChainStep(chain, entry.id);
    if (!step || entry.progress < step.amount) return;
    if (step.rewardExp > 0) this.grantExp(p, client, step.rewardExp);
    p.gold += step.rewardGold;
    if (step.rewardItemId) this.addToInventory(p, step.rewardItemId, step.rewardQty ?? 1);
    entry.id = nextSideChainStep(chain, step.id);
    entry.progress = 0;
    if (chain.announce) {
      const next = sideChainStep(chain, entry.id);
      const item = step.rewardItemId ? `, ${step.rewardQty ?? 1} ${getItem(step.rewardItemId).name}` : '';
      client.send(MessageType.ItemResult, { success: true, text: `${step.done} +${step.rewardGold} oro${item}.${next ? ` Nuevo encargo: ${next.title}.` : ''}` });
    }
  }

  /** Suma progreso a los encargos activos que piden esta baja u objeto. */
  private creditSideChains(p: PlayerState, objective: 'kill' | 'interact', targetId: string, client?: Client): void {
    p.sideChains.forEach((entry, chainId) => {
      const chain = getSideChain(chainId);
      const step = chain ? sideChainStep(chain, entry.id) : undefined;
      if (!chain || !step || step.objective !== objective || entry.progress >= step.amount) return;
      const matches = objective === 'kill'
        ? step.targetId === '' || step.targetId === targetId
        : step.targetId === targetId && (step.mapId === undefined || step.mapId === p.mapId);
      if (!matches) return;
      entry.progress++;
      if (entry.progress >= step.amount && chain.announce && objective === 'interact') {
        client?.send(MessageType.ItemResult, { success: true, text: `Encargo completado: ${step.title}. ${chain.returnHint ?? ''}`.trim() });
      }
    });
  }
```

c) `creditMobKill`: reemplazar el bloque `if (player.bountyId) { ... }` por `this.creditSideChains(player, 'kill', mob.templateId);`.

d) `InteractObject`: reemplazar las líneas de `getVeilContract(...)` por `this.creditSideChains(p, 'interact', o.id, client);` (después de `advanceQuest(p,'interact',o.id);`).

e) `onJoin`, bloque `if (pr)`: reemplazar las cuatro líneas de `bountyId`/`bountyProgress`/`veilContractId`/`veilContractProgress` por

```ts
        for (const [chainId, saved] of Object.entries(sideChainsFromSave(pr))) {
          const entry = new SideChainState();
          entry.id = saved.id; entry.progress = saved.progress;
          player.sideChains.set(chainId, entry);
        }
```

f) Quitar imports sin uso (`VEIL_CONTRACTS`, `VEIL_CONTRACTS_COMPLETE`, `getVeilContract`, `nextVeilContract`, `getBounty`, `firstBountyId`, `nextBountyId`).

- [ ] **Step 7: Cliente**

`NetworkClient.getSelf()`:

```ts
      bountyId: p.sideChains?.get?.('varek')?.id ?? "",
      bountyProgress: p.sideChains?.get?.('varek')?.progress ?? 0,
      veilContractId: p.sideChains?.get?.('boren')?.id ?? '',
      veilContractProgress: p.sideChains?.get?.('boren')?.progress ?? 0,
```

(`main.ts` y `AdventureTracker` siguen leyendo esos campos de la snapshot.)

- [ ] **Step 8: Adaptar rutas en tests**

En `BorenContracts.test.ts` y `GameRoom.test.ts`, agregar helpers al inicio del archivo:

```ts
import { SideChainState } from '../state/SideChainState.js';
import type { PlayerState } from '../state/PlayerState.js';
const chainOf = (p: PlayerState, id: string) => p.sideChains.get(id);
const setChain = (p: PlayerState, id: string, stepId: string, progress = 0) => {
  const e = new SideChainState(); e.id = stepId; e.progress = progress; p.sideChains.set(id, e);
};
```

Reemplazos: `p.veilContractId` → `(chainOf(p,'boren')?.id ?? '')`, `p.veilContractProgress` → `(chainOf(p,'boren')?.progress ?? 0)`, `p.bountyId` → `(chainOf(p,'varek')?.id ?? '')`, `p.bountyProgress` → `(chainOf(p,'varek')?.progress ?? 0)`; asignaciones `p.bountyId='b_forest';p.bountyProgress=3` → `setChain(p,'varek','b_forest',3)`. `toCharacterSave(p).progress.veilContractProgress` se mantiene (el save conserva ese campo). Encontrar todo con `grep -n "bountyId\|bountyProgress\|veilContract" server/src/rooms/*.test.ts`. Los valores esperados no cambian.

- [ ] **Step 9: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde; `PlayerState.test.ts` con 45 campos.

- [ ] **Step 10: Commit**

```bash
git add shared/src server/src client/src/net/NetworkClient.ts
git commit -m "refactor: run optional errands from a shared side-chain registry"
```

---

### Task 4: Encuentros como datos (con cono)

**Files:**
- Create: `shared/src/encounters.ts`, `shared/src/encounters.test.ts`, `server/src/systems/EncounterSystem.ts`, `server/src/systems/EncounterSystem.test.ts`
- Modify: `shared/src/index.ts`, `server/src/state/MobState.ts`, `server/src/systems/AdventureSystem.ts`, `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `questReached` (Task 2), `MEMORY_ANCHORS` (`monastery.ts`).
- Produces: `ENCOUNTERS: Record<string, EncounterDef>`, `getEncounter(templateId)`, `encounterInterruptFor(objectId): { templateId: string; pattern: HazardPattern } | null`, tipos `HazardPattern`, `EncounterDef`, `EncounterSummon`. `stepEncounter(mob, players, dtMs): string[]`, `inHazard(mob, x, z): boolean`, `isEncounterEligible(def, p)`. `MobState.hazardArc` (radianes, `2π` = círculo) y `MobState.hazardAngle` (radianes, 0 = +X), sincronizados.

- [ ] **Step 1: Test de datos (falla)**

`shared/src/encounters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ENCOUNTERS, getEncounter, encounterInterruptFor } from './encounters.js';
import { MOB_TEMPLATES } from './mobs.js';
import { getWorldObject } from './worldobjects.js';
import { MEMORY_ANCHORS } from './monastery.js';

describe('encounters', () => {
  it('keeps the current boss numbers', () => {
    expect(getEncounter('crypt_warden')).toMatchObject({ aggroRadius: 14, cooldownMs: 7000, patterns: [{ shape: 'circle', anchor: 'target', radius: 6, windupMs: 1600, power: 2.2 }] });
    for (const id of ['crypt_behemoth', 'veil_guardian', 'memory_jailer']) {
      expect(getEncounter(id)).toMatchObject({ cooldownMs: 9000, patterns: [{ radius: 5, windupMs: 2000, power: 2.2 }] });
    }
    expect(getEncounter('skeleton_king')).toMatchObject({ cooldownMs: 8000, belowHalf: { cooldownMs: 5000 }, patterns: [{ radius: 6, windupMs: 1800, power: 2.8 }] });
    const prior = getEncounter('memory_prior')!;
    expect(prior).toMatchObject({ cooldownMs: 6000, requiresQuest: 'a2_prior', patterns: [{ radius: 6, windupMs: 1800, power: 2.4 }] });
    expect(prior.belowHalf!.patterns![1]).toMatchObject({ anchor: 'self', radius: 14, windupMs: 6000, power: 3.2, channel: true, interruptCooldownMs: 9000, interruptStunMs: 3000 });
  });
  it('only references real enemies and world objects', () => {
    for (const def of Object.values(ENCOUNTERS)) {
      expect(MOB_TEMPLATES[def.templateId]).toBeDefined();
      for (const p of [...def.patterns, ...(def.belowHalf?.patterns ?? [])]) for (const o of p.interruptObjects ?? []) expect(getWorldObject(o).id).toBe(o);
    }
  });
  it('finds the channel an object interrupts', () => {
    for (const anchor of MEMORY_ANCHORS) expect(encounterInterruptFor(anchor)?.templateId).toBe('memory_prior');
    expect(encounterInterruptFor('bosque_shrine')).toBeNull();
    expect(getEncounter('veil_raider')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/encounters.test.ts` (desde `shared/`). Expected: FAIL.

- [ ] **Step 3: Crear `encounters.ts`**

```ts
import { MEMORY_ANCHORS } from './monastery.js';

export type HazardShape = 'circle' | 'cone';

export interface HazardPattern {
  shape: HazardShape;
  /** Círculos: 'target' se fija sobre el objetivo al iniciar el aviso; 'self' sobre el jefe. El cono siempre nace en el jefe. */
  anchor: 'target' | 'self';
  radius: number;
  /** Solo cono: apertura total en grados. */
  angleDeg?: number;
  windupMs: number;
  /** Multiplicador de daño del impacto sobre el ataque del jefe. */
  power: number;
  /** Canalización: marca `channeling` mientras dura el aviso. */
  channel?: boolean;
  /** Objetos del mapa que cortan la canalización. */
  interruptObjects?: readonly string[];
  interruptCooldownMs?: number;
  interruptStunMs?: number;
  interruptTexts?: { success: string; tooWeak: string; idle: string };
}

export interface EncounterSummon {
  templateId: string;
  /** Una vez por intento, al bajar de este porcentaje de vida (0..1). */
  atHpPct?: number;
  count?: number;
  /** Periódico: cada `everyMs` desde cada objeto activo de `fromObjects`. */
  everyMs?: number;
  fromObjects?: readonly string[];
  /** Tope de invocaciones vivas (por objeto si es periódico; total si es por vida). */
  maxAlive: number;
}

export interface EncounterDef {
  templateId: string;
  aggroRadius: number;
  /** Espera tras cada impacto. */
  cooldownMs: number;
  /** Se alternan según la cantidad de ataques ya lanzados. */
  patterns: readonly HazardPattern[];
  /** Con media vida o menos: reemplaza la espera y/o los patrones. */
  belowHalf?: { cooldownMs?: number; patterns?: readonly HazardPattern[] };
  summons?: readonly EncounterSummon[];
  /** Solo pueden pelearlo quienes llegaron a esta misión o más allá. */
  requiresQuest?: string;
}

const circle = (radius: number, windupMs: number, power: number): HazardPattern => ({ shape: 'circle', anchor: 'target', radius, windupMs, power });
const heavy = (templateId: string): EncounterDef => ({ templateId, aggroRadius: 14, cooldownMs: 9000, patterns: [circle(5, 2000, 2.2)] });

export const ENCOUNTERS: Record<string, EncounterDef> = {
  crypt_warden: { templateId: 'crypt_warden', aggroRadius: 14, cooldownMs: 7000, patterns: [circle(6, 1600, 2.2)] },
  crypt_behemoth: heavy('crypt_behemoth'),
  veil_guardian: heavy('veil_guardian'),
  memory_jailer: heavy('memory_jailer'),
  skeleton_king: { templateId: 'skeleton_king', aggroRadius: 14, cooldownMs: 8000, patterns: [circle(6, 1800, 2.8)], belowHalf: { cooldownMs: 5000 } },
  memory_prior: {
    templateId: 'memory_prior', aggroRadius: 14, cooldownMs: 6000, requiresQuest: 'a2_prior',
    patterns: [circle(6, 1800, 2.4)],
    belowHalf: { patterns: [circle(6, 1800, 2.4), {
      shape: 'circle', anchor: 'self', radius: 14, windupMs: 6000, power: 3.2, channel: true,
      interruptObjects: MEMORY_ANCHORS, interruptCooldownMs: 9000, interruptStunMs: 3000,
      interruptTexts: {
        success: 'Vínculo roto. ¡El Prior quedó expuesto!',
        tooWeak: 'El vínculo supera tu poder actual.',
        idle: 'Anclaje examinado. Activá uno durante la canalización del Prior.',
      },
    }] },
  },
};

export function getEncounter(templateId: string): EncounterDef | undefined {
  return ENCOUNTERS[templateId];
}

/** Canalización que un objeto puede interrumpir (y de qué jefe). */
export function encounterInterruptFor(objectId: string): { templateId: string; pattern: HazardPattern } | null {
  for (const def of Object.values(ENCOUNTERS)) {
    for (const pattern of [...def.patterns, ...(def.belowHalf?.patterns ?? [])]) {
      if (pattern.channel && pattern.interruptObjects?.includes(objectId)) return { templateId: def.templateId, pattern };
    }
  }
  return null;
}
```

Agregar `export * from './encounters.js';` a `shared/src/index.ts`.

- [ ] **Step 4: Test del intérprete, incluido el cono (falla)**

`server/src/systems/EncounterSystem.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { ENCOUNTERS } from '@aden/shared';
import { MobState } from '../state/MobState.js';
import { PlayerState } from '../state/PlayerState.js';
import { stepEncounter, inHazard } from './EncounterSystem.js';

afterEach(() => { delete ENCOUNTERS.test_cone; });

function setup() {
  ENCOUNTERS.test_cone = { templateId: 'test_cone', aggroRadius: 14, cooldownMs: 5000,
    patterns: [{ shape: 'cone', anchor: 'self', radius: 8, angleDeg: 90, windupMs: 1000, power: 2 }] };
  const mob = new MobState(); mob.templateId = 'test_cone'; mob.mapId = 'm'; mob.x = 0; mob.z = 0; mob.hp = mob.maxHp = 100; mob.aggroTargetId = 'p';
  const p = new PlayerState(); p.mapId = 'm'; p.x = 5; p.z = 0;
  return { mob, p, players: new Map([['p', p]]) };
}

describe('EncounterSystem', () => {
  it('aims a cone at the target when the warning starts and keeps it fixed', () => {
    const { mob, p, players } = setup();
    stepEncounter(mob, players, 50);
    expect(mob.hazardMs).toBe(1000);
    expect(mob.hazardArc).toBeCloseTo(Math.PI / 2);
    expect(mob.hazardAngle).toBeCloseTo(0);
    p.x = 0; p.z = 5;
    expect(mob.hazardAngle).toBeCloseTo(0);
    expect(stepEncounter(mob, players, 1000)).toEqual([]);
  });
  it('hits only inside the aperture and radius', () => {
    const { mob } = setup();
    mob.hazardX = 0; mob.hazardZ = 0; mob.hazardRadius = 8; mob.hazardArc = Math.PI / 2; mob.hazardAngle = 0;
    expect(inHazard(mob, 5, 0)).toBe(true);
    expect(inHazard(mob, 5, 4)).toBe(true);
    expect(inHazard(mob, 5, 6)).toBe(false);
    expect(inHazard(mob, 0, 5)).toBe(false);
    expect(inHazard(mob, -3, 0)).toBe(false);
    expect(inHazard(mob, 9, 0)).toBe(false);
    mob.hazardArc = Math.PI * 2;
    expect(inHazard(mob, -3, 0)).toBe(true);
  });
  it('lands the cone on a target that stays in front', () => {
    const { mob, players } = setup();
    stepEncounter(mob, players, 50);
    expect(stepEncounter(mob, players, 1000)).toEqual(['p']);
    expect(mob.hazardCooldownMs).toBe(5000);
  });
});
```

- [ ] **Step 5: Correrlo y ver que falla**

Run: `npx vitest run src/systems/EncounterSystem.test.ts` (desde `server/`). Expected: FAIL (módulo inexistente).

- [ ] **Step 6: `MobState` + `EncounterSystem`**

En `MobState.ts`, junto a `hazardRadius`:

```ts
  /** Apertura del área anunciada en radianes (2π = círculo). */
  @type("number") hazardArc = Math.PI * 2;
  /** Orientación del cono en radianes (0 = +X), fijada al iniciar el aviso. */
  @type("number") hazardAngle = 0;
```

`server/src/systems/EncounterSystem.ts`:

```ts
import { distance2D, getEncounter, questReached, type EncounterDef, type HazardPattern } from '@aden/shared';
import type { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';

const FULL_CIRCLE = Math.PI * 2;

export function isEncounterEligible(def: EncounterDef, p: Pick<PlayerState, 'questId'>): boolean {
  return !def.requiresQuest || questReached(p.questId, def.requiresQuest);
}

/** Patrón que toca según la vida del jefe y los ataques ya lanzados. */
function patternFor(def: EncounterDef, mob: MobState): HazardPattern {
  const low = mob.hp <= mob.maxHp / 2;
  const list = (low && def.belowHalf?.patterns) || def.patterns;
  return list[mob.hazardCount % list.length];
}

/** ¿El punto está dentro del área anunciada (círculo o sector)? */
export function inHazard(mob: Pick<MobState, 'hazardX' | 'hazardZ' | 'hazardRadius' | 'hazardArc' | 'hazardAngle'>, x: number, z: number): boolean {
  const d = distance2D(x, z, mob.hazardX, mob.hazardZ);
  if (d > mob.hazardRadius) return false;
  if (mob.hazardArc >= FULL_CIRCLE - 1e-6 || d === 0) return true;
  let diff = Math.abs(Math.atan2(z - mob.hazardZ, x - mob.hazardX) - mob.hazardAngle) % FULL_CIRCLE;
  if (diff > Math.PI) diff = FULL_CIRCLE - diff;
  return diff <= mob.hazardArc / 2 + 1e-9;
}

/** Avanza el ataque anunciado del jefe; devuelve los jugadores alcanzados al impactar. */
export function stepEncounter(mob: MobState, players: Iterable<[string, PlayerState]>, dtMs: number): string[] {
  const def = getEncounter(mob.templateId);
  if (!def) return [];
  const candidates = [...players].filter(([, p]) => !p.dead && p.mapId === mob.mapId && isEncounterEligible(def, p));
  const target = candidates.find(([id]) => id === mob.aggroTargetId)?.[1];
  if (mob.dead || mob.stunMs > 0 || !target) {
    mob.hazardMs = 0;
    mob.channeling = false;
    return [];
  }
  if (mob.hazardMs > 0) {
    mob.hazardMs = Math.max(0, mob.hazardMs - dtMs);
    if (mob.hazardMs > 0) return [];
    mob.channeling = false;
    const low = mob.hp <= mob.maxHp / 2;
    mob.hazardCooldownMs = (low && def.belowHalf?.cooldownMs) || def.cooldownMs;
    return candidates.filter(([, p]) => inHazard(mob, p.x, p.z)).map(([id]) => id);
  }
  mob.hazardCooldownMs = Math.max(0, mob.hazardCooldownMs - dtMs);
  if (mob.hazardCooldownMs === 0) {
    const pattern = patternFor(def, mob);
    mob.hazardCount++;
    mob.channeling = !!pattern.channel;
    const atSelf = pattern.shape === 'cone' || pattern.anchor === 'self';
    mob.hazardX = atSelf ? mob.x : target.x;
    mob.hazardZ = atSelf ? mob.z : target.z;
    mob.hazardRadius = pattern.radius;
    mob.hazardMs = pattern.windupMs;
    mob.hazardPower = pattern.power;
    mob.hazardArc = pattern.shape === 'cone' ? (pattern.angleDeg ?? 90) * Math.PI / 180 : FULL_CIRCLE;
    mob.hazardAngle = Math.atan2(target.z - mob.z, target.x - mob.x);
  }
  return [];
}
```

- [ ] **Step 7: `AdventureSystem`**

- Borrar la función `stepGuardianHazard` y agregar `export { stepEncounter as stepGuardianHazard } from './EncounterSystem.js';` (mantiene intacto `AdventureSystem.test.ts`).
- En `canFightDungeonMob`, reemplazar la línea de `memory_prior` por:

```ts
  const encounter = getEncounter(templateId);
  if (encounter?.requiresQuest) return questReached(p.questId ?? '', encounter.requiresQuest);
```

- Imports: agregar `getEncounter`, `questReached`; quitar `MEMORY_COMPLETE` si queda sin uso.

- [ ] **Step 8: `GameRoom`**

a) Import: `stepEncounter` desde `../systems/EncounterSystem.js`; `getEncounter`, `encounterInterruptFor` desde `@aden/shared`; quitar `stepGuardianHazard` y `MEMORY_ANCHORS` si quedan sin uso.

b) `tick`, loop de IA: reemplazar la línea `const aiConfig = [...].includes(mob.templateId) ? ...` por

```ts
      const encounter = getEncounter(mob.templateId);
      const aiConfig = encounter ? { ...AI_CONFIG, aggroRadius: encounter.aggroRadius } : AI_CONFIG;
```

c) Loop de ataque de mobs: `const impacted = stepEncounter(mob, this.state.players.entries(), dtMs);` y `const power = mob.hazardPower;` (reemplaza la cadena `memory_prior ? … : skeleton_king ? 2.8 : 2.2`).

d) `InteractObject`: reemplazar el bloque `if (MEMORY_ANCHORS.includes(o.id)) { ... }` por

```ts
      const interrupt = encounterInterruptFor(o.id);
      if (interrupt) {
        const texts = interrupt.pattern.interruptTexts;
        const boss = [...this.state.mobs.values()].find(m => m.templateId === interrupt.templateId && !m.dead && m.channeling && m.mapId === p.mapId && distance2D(p.x, p.z, m.x, m.z) <= 25);
        if (boss && canFightDungeonMob(p, boss.templateId) && pvePower(p.level, boss.level).outgoing > 0) {
          boss.channeling = false; boss.hazardMs = 0; boss.hazardCooldownMs = interrupt.pattern.interruptCooldownMs ?? 0;
          boss.stunMs = Math.max(boss.stunMs, interrupt.pattern.interruptStunMs ?? 0);
          client.send(MessageType.ItemResult, { success: true, text: texts?.success ?? '' });
        } else client.send(MessageType.ItemResult, { success: !boss, text: (boss ? texts?.tooWeak : texts?.idle) ?? '' });
        return;
      }
```

e) `spawnMob`, junto a los resets de peligro: `mob.hazardArc = Math.PI * 2; mob.hazardAngle = 0; mob.hazardPower = 2.2;`

- [ ] **Step 9: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde, con `AdventureSystem.test.ts`, `EnemyDifficulty.test.ts`, `MonasteryCampaign.test.ts` y los tests de jefes de `GameRoom.test.ts` sin cambios.

- [ ] **Step 10: Commit**

```bash
git add shared/src server/src
git commit -m "refactor: interpret boss telegraphs from encounter data and add frontal cones"
```

---

### Task 5: Invocaciones de encuentros

**Files:**
- Create: `server/src/rooms/EncounterSummons.test.ts`
- Modify: `server/src/state/MobState.ts`, `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `EncounterDef.summons` (Task 4).
- Produces: `MobState.summonedBy` / `summonSource` / `summonTimers` / `summonFlags` (server-only). Las invocaciones no dan EXP, botín, progreso de misión ni de encargos; se limpian al morir el dueño o al reiniciarse su encuentro por leash.

- [ ] **Step 1: Test E2E (falla)**

`server/src/rooms/EncounterSummons.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { ENCOUNTERS } from '@aden/shared';

describe('encounter summons', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2594); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => {
    await server.cleanup();
    ENCOUNTERS.forest_troll = { templateId: 'forest_troll', aggroRadius: 14, cooldownMs: 1000,
      patterns: [{ shape: 'circle', anchor: 'self', radius: 0.1, windupMs: 999999, power: 0 }],
      summons: [
        { templateId: 'umbra_orc', atHpPct: 0.5, count: 2, maxAlive: 2 },
        { templateId: 'skeleton_minion', everyMs: 1000, fromObjects: ['bosque_shrine'], maxAlive: 1 },
      ] };
  });
  afterEach(() => { delete ENCOUNTERS.forest_troll; });

  const addsOf = (room: GameRoom, templateId?: string) =>
    [...room.state.mobs.entries()].filter(([, m]) => m.summonedBy === 'owner' && !m.dead && (!templateId || m.templateId === templateId));

  it('summons once below half life and periodically from active objects, without rewards', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'SummonTester' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear(); room.state.droppedItems.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 330; p.z = p.targetZ = 0; p.level = 30; p.maxHp = p.hp = 1e6;
    const owner = room.spawnMob('owner', 'forest_troll', 333, 0, 'bosque');
    owner.aggroTargetId = c.sessionId; owner.aiState = 'chase';
    owner.hp = Math.floor(owner.maxHp * 0.4);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    for (let i = 0; i < 25; i++) room.tick(0.05);
    expect(addsOf(room, 'skeleton_minion')).toHaveLength(1);
    for (let i = 0; i < 25; i++) room.tick(0.05);
    expect(addsOf(room, 'skeleton_minion')).toHaveLength(1);

    const exp = p.exp, kills = p.retention.totalKills;
    const [addId, add] = addsOf(room, 'umbra_orc')[0];
    (room as unknown as { killMob(m: unknown, id: string, killer: string): void }).killMob(add, addId, c.sessionId);
    expect(p.exp).toBe(exp);
    expect(p.retention.totalKills).toBe(kills);
    expect(room.state.droppedItems.size).toBe(0);
    room.tick(0.05);
    expect(room.state.mobs.has(addId)).toBe(false);

    (room as unknown as { killMob(m: unknown, id: string, killer: string): void }).killMob(owner, 'owner', c.sessionId);
    expect(addsOf(room)).toHaveLength(0);
    room.tick(0.05);
    expect([...room.state.mobs.values()].some(m => m.summonedBy === 'owner')).toBe(false);
  });

  it('clears summons when the encounter leashes', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'SummonLeash' });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.mapId = 'bosque'; p.x = p.targetX = 330; p.z = p.targetZ = 0; p.maxHp = p.hp = 1e6;
    const owner = room.spawnMob('owner', 'forest_troll', 333, 0, 'bosque');
    owner.aggroTargetId = c.sessionId; owner.aiState = 'chase'; owner.hp = Math.floor(owner.maxHp * 0.4);
    room.tick(0.05);
    expect(addsOf(room, 'umbra_orc')).toHaveLength(2);
    owner.hazardMs = 0; p.x = p.targetX = 250; owner.aggroTargetId = ''; owner.aiState = 'chase';
    room.tick(0.05);
    expect(owner.hp).toBe(owner.maxHp);
    expect(addsOf(room)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/rooms/EncounterSummons.test.ts` (desde `server/`). Expected: FAIL (no aparecen invocaciones).

- [ ] **Step 3: Campos en `MobState`**

Al final de la sección server-only:

```ts
  // Invocaciones de encuentros (server-only).
  summonedBy = "";
  summonSource = "";
  summonTimers = new Map<string, number>();
  summonFlags = new Set<number>();
```

- [ ] **Step 4: Lógica en `GameRoom`**

a) Campo: `private summonSeq = 0;`

b) En `spawnMob`, junto a los resets: `mob.summonedBy = ''; mob.summonSource = ''; mob.summonTimers.clear(); mob.summonFlags.clear();`

c) Métodos nuevos:

```ts
  /** Refuerzos de un encuentro: una vez al bajar de cierta vida, o periódicos desde objetos activos. */
  private stepSummons(mob: MobState, mobId: string, dtMs: number): void {
    const def = getEncounter(mob.templateId);
    if (!def?.summons || mob.dead || mob.summonedBy || !mob.aggroTargetId) return;
    def.summons.forEach((s, index) => {
      if (s.atHpPct !== undefined) {
        if (mob.summonFlags.has(index) || mob.hp > mob.maxHp * s.atHpPct) return;
        mob.summonFlags.add(index);
        const count = Math.min(s.count ?? 1, s.maxAlive - this.summonsOf(mobId, s.templateId).length);
        for (let i = 0; i < count; i++) {
          const a = (i / Math.max(1, count)) * Math.PI * 2;
          this.spawnSummon(mobId, s.templateId, mob.x + Math.cos(a) * 3, mob.z + Math.sin(a) * 3, mob.mapId, `hp${index}`);
        }
        return;
      }
      if (!s.everyMs || !s.fromObjects) return;
      for (const objectId of s.fromObjects) {
        const o = this.state.worldObjects.get(objectId);
        if (!o || !o.active || o.mapId !== mob.mapId) continue;
        const key = `${index}:${objectId}`;
        const left = (mob.summonTimers.get(key) ?? s.everyMs) - dtMs;
        if (left > 0) { mob.summonTimers.set(key, left); continue; }
        mob.summonTimers.set(key, s.everyMs);
        if (this.summonsOf(mobId, s.templateId, objectId).length >= s.maxAlive) continue;
        this.spawnSummon(mobId, s.templateId, o.x, o.z, mob.mapId, objectId);
      }
    });
  }

  private summonsOf(ownerId: string, templateId: string, source?: string): MobState[] {
    return [...this.state.mobs.values()].filter(m => m.summonedBy === ownerId && !m.dead && m.templateId === templateId && (source === undefined || m.summonSource === source));
  }

  private spawnSummon(ownerId: string, templateId: string, x: number, z: number, mapId: string, source: string): void {
    const add = this.spawnMob(`${ownerId}_add_${this.summonSeq++}`, templateId, x, z, mapId);
    add.summonedBy = ownerId;
    add.summonSource = source;
    const owner = this.state.mobs.get(ownerId);
    if (owner?.aggroTargetId) { add.aggroTargetId = owner.aggroTargetId; add.aiState = 'chase'; }
  }

  /** Marca muertas las invocaciones de un dueño; el loop de respawn las borra. */
  private clearSummons(ownerId: string): void {
    this.state.mobs.forEach((m, id) => {
      if (m.summonedBy !== ownerId || m.dead) return;
      m.dead = true; m.hp = 0; m.hazardMs = 0; m.channeling = false; m.moving = false; m.respawnMs = 0;
      this.broadcast(MessageType.Death, { entityId: id });
    });
    const owner = this.state.mobs.get(ownerId);
    if (owner) { owner.summonTimers.clear(); owner.summonFlags.clear(); }
  }
```

d) `killMob`: justo después de `if(mob.dead)return;`

```ts
    if (mob.summonedBy) {
      mob.dead = true; mob.hazardMs = 0; mob.channeling = false; mob.moving = false; mob.respawnMs = 0;
      this.broadcast(MessageType.Death, { entityId: mobId });
      return;
    }
```

y al final de `killMob` (después de `dropLoot`): `this.clearSummons(mobId);`

e) `tick`, loop de IA: cambiar `this.state.mobs.forEach((mob) => {` por `this.state.mobs.forEach((mob, mobId) => {` y dentro del bloque de reinicio `if (wasEngaged && !mob.aggroTargetId) { ... }` agregar `this.clearSummons(mobId);`.

f) `tick`, loop de ataque: después del `for (const id of impacted) { ... }` y antes de `if(mob.hazardMs>0){...}`, agregar `this.stepSummons(mob, mobId, dtMs);`.

g) `tick`, loop de cooldowns/respawn: declarar `const expiredSummons: string[] = [];` antes del `forEach`; dentro, al principio de `if (mob.dead) {` agregar `if (mob.summonedBy) { expiredSummons.push(id); return; }`; después del `forEach`: `for (const id of expiredSummons) this.state.mobs.delete(id);`.

- [ ] **Step 5: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde, incluido `EncounterSummons.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat: let encounters summon reinforcements that grant no rewards"
```

---

### Task 6: Cono en el cliente

**Files:**
- Modify: `client/src/net/NetworkClient.ts`, `client/src/render/HazardViews.ts`, `client/src/render/HazardViews.test.ts`

**Interfaces:**
- Consumes: `MobState.hazardArc`, `MobState.hazardAngle` (Task 4).
- Produces: `MobSnapshot.hazardArc?: number`, `MobSnapshot.hazardAngle?: number`.

- [ ] **Step 1: Test (falla)**

Agregar a `HazardViews.test.ts` dentro del `describe`:

```ts
  it("draws a frontal cone with the server aperture and facing", () => {
    const scene = new THREE.Scene(); const views = new HazardViews(scene); views.setCurrentMap("cripta");
    views.update("boss", snap({ hazardArc: Math.PI / 2, hazardAngle: Math.PI / 2, hazardRadius: 9 }));
    const warning = scene.getObjectByName("hazard-boss")!;
    const fill = warning.children[0] as THREE.Mesh<THREE.CircleGeometry>;
    expect(fill.geometry.parameters.thetaLength).toBeCloseTo(Math.PI / 2);
    expect(warning.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(warning.scale.x).toBe(9);
    views.update("boss", snap({ hazardArc: Math.PI * 2 }));
    expect((warning.children[0] as THREE.Mesh<THREE.CircleGeometry>).geometry.parameters.thetaLength).toBeCloseTo(Math.PI * 2);
  });
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/render/HazardViews.test.ts` (desde `client/`). Expected: FAIL.

- [ ] **Step 3: Snapshot**

En `MobSnapshot` agregar `hazardArc?: number;` y `hazardAngle?: number;`. En el armado de la snapshot de mob (junto a `hazardRadius`): `hazardArc: m.hazardArc ?? Math.PI * 2, hazardAngle: m.hazardAngle ?? 0,`.

- [ ] **Step 4: `HazardViews`**

Reemplazar el archivo por:

```ts
import * as THREE from "three";
import type { MobSnapshot } from "../net/NetworkClient.js";

const FULL_CIRCLE = Math.PI * 2;

/** Fixed world-space warnings. Visibility follows authoritative state, never a guessed local timer. */
export class HazardViews {
  private readonly warnings = new Map<string, { root: THREE.Group; mapId: string; active: boolean; arc: number }>();
  private mapId = "pueblo";
  constructor(private readonly scene: THREE.Scene) {}
  update(id: string, snap: MobSnapshot): void {
    const active = !snap.dead && (snap.hazardMs ?? 0) > 0 && (snap.hazardRadius ?? 0) > 0;
    let warning = this.warnings.get(id);
    if (!warning && !active) return;
    const arc = Math.min(FULL_CIRCLE, snap.hazardArc ?? FULL_CIRCLE);
    if (!warning) {
      const root = new THREE.Group(); root.name = `hazard-${id}`;
      this.scene.add(root); warning = { root, mapId: snap.mapId ?? "", active, arc: -1 }; this.warnings.set(id, warning);
    }
    if (Math.abs(warning.arc - arc) > 1e-6) { this.build(warning.root, arc); warning.arc = arc; }
    warning.active = active; warning.mapId = snap.mapId ?? "";
    warning.root.position.set(snap.hazardX ?? snap.x, .12, snap.hazardZ ?? snap.z);
    warning.root.rotation.y = arc >= FULL_CIRCLE - 1e-6 ? 0 : -(snap.hazardAngle ?? 0);
    const radius = snap.hazardRadius ?? 0;
    warning.root.scale.set(radius, 1, radius);
    warning.root.visible = active && warning.mapId === this.mapId;
  }
  setCurrentMap(mapId: string): void {
    this.mapId = mapId;
    this.warnings.forEach(w => { w.root.visible = w.active && w.mapId === mapId; });
  }
  remove(id: string): void {
    const warning = this.warnings.get(id); if (!warning) return;
    this.clear(warning.root);
    warning.root.removeFromParent(); this.warnings.delete(id);
  }
  /** Sector centrado en +X (el grupo lo orienta); 2π dibuja el círculo completo. */
  private build(root: THREE.Group, arc: number): void {
    this.clear(root);
    const start = arc >= FULL_CIRCLE - 1e-6 ? 0 : -arc / 2;
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64, start, arc), new THREE.MeshBasicMaterial({ color: 0xeb301e, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
    const edge = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64, 1, start, arc), new THREE.MeshBasicMaterial({ color: 0xff5c38, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
    for (const mesh of [fill, edge]) { mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 3; root.add(mesh); }
  }
  private clear(root: THREE.Group): void {
    for (const child of [...root.children]) {
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); }
      child.removeFromParent();
    }
  }
}
```

- [ ] **Step 5: Verificar**

Run: `npm test` + `npx tsc -p client/tsconfig.json --noEmit`. Expected: verde (los dos tests anteriores de `HazardViews` siguen pasando).

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "feat: draw frontal cone warnings from the synchronized arc and facing"
```

---

### Task 7: Viaje bloqueado en combate

**Files:**
- Create: `shared/src/travel.ts`, `shared/src/travel.test.ts`, `server/src/rooms/TravelLock.test.ts`
- Modify: `shared/src/index.ts`, `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Produces: `TRAVEL_COMBAT_LOCK_MS = 5000`, `travelLockRemainingMs(msSinceCombat)`, `travelLockText(remainingMs)`.

- [ ] **Step 1: Tests (fallan)**

`shared/src/travel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TRAVEL_COMBAT_LOCK_MS, travelLockRemainingMs, travelLockText } from './travel.js';

describe('travel lock', () => {
  it('requires five seconds without combat', () => {
    expect(TRAVEL_COMBAT_LOCK_MS).toBe(5000);
    expect(travelLockRemainingMs(0)).toBe(5000);
    expect(travelLockRemainingMs(3200)).toBe(1800);
    expect(travelLockRemainingMs(5000)).toBe(0);
    expect(travelLockText(1800)).toBe('Estás en combate: podés viajar en 2 s.');
  });
});
```

`server/src/rooms/TravelLock.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, TRAVEL_COMBAT_LOCK_MS } from '@aden/shared';

describe('travel lock', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2595); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('blocks M travel and the return seal right after combat', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'TravelLocked' });
    room.setSimulationInterval(() => {}, 1000);
    const p = room.state.players.get(c.sessionId)!;
    p.level = 10; p.mapId = 'bosque'; p.x = p.targetX = 300; p.z = p.targetZ = 40; p.msSinceCombat = 1000;
    const replies: { success: boolean; text: string }[] = [];
    c.onMessage(MessageType.ItemResult, m => replies.push(m));
    c.send(MessageType.WarpTo, { mapId: 'pueblo' });
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    expect(replies[0]).toEqual({ success: false, text: 'Estás en combate: podés viajar en 4 s.' });
    expect(p.mapId).toBe('bosque');

    const seal = room.state.players.get(c.sessionId)!;
    (room as unknown as { addToInventory(p: unknown, id: string, qty: number): void }).addToInventory(seal, 'aden_sello_de_retorno', 1);
    c.send(MessageType.UseItem, { itemTemplateId: 'aden_sello_de_retorno' });
    await vi.waitFor(() => expect(replies).toHaveLength(2));
    expect(replies[1].success).toBe(false);
    expect(p.inventory.get('aden_sello_de_retorno')?.qty).toBe(1);

    p.msSinceCombat = TRAVEL_COMBAT_LOCK_MS;
    c.send(MessageType.WarpTo, { mapId: 'pueblo' });
    await vi.waitFor(() => expect(p.mapId).toBe('pueblo'));
  });
});
```

- [ ] **Step 2: Correrlos y ver que fallan**

Run: `npx vitest run src/travel.test.ts` (shared) y `npx vitest run src/rooms/TravelLock.test.ts` (server). Expected: FAIL.

- [ ] **Step 3: Implementar**

`shared/src/travel.ts`:

```ts
/** Tiempo sin combate que exige viajar con M o con el Sello de Retorno. */
export const TRAVEL_COMBAT_LOCK_MS = 5000;

export function travelLockRemainingMs(msSinceCombat: number): number {
  return Math.max(0, TRAVEL_COMBAT_LOCK_MS - msSinceCombat);
}

export function travelLockText(remainingMs: number): string {
  return `Estás en combate: podés viajar en ${Math.ceil(remainingMs / 1000)} s.`;
}
```

Agregar `export * from './travel.js';` a `shared/src/index.ts`.

En `GameRoom`, handler `WarpTo`, después de `if (zone.id === p.mapId) return;`:

```ts
      const lock = travelLockRemainingMs(p.msSinceCombat);
      if (lock > 0) { client.send(MessageType.ItemResult, { success: false, text: travelLockText(lock) }); return; }
```

Handler `UseItem`, después de `if (!p || p.dead) return;`:

```ts
      let used; try { used = getItem(msg?.itemTemplateId ?? ''); } catch { used = undefined; }
      if (used?.useEffect === 'town_portal') {
        const lock = travelLockRemainingMs(p.msSinceCombat);
        if (lock > 0) { client.send(MessageType.ItemResult, { success: false, text: travelLockText(lock) }); return; }
      }
```

Importar `travelLockRemainingMs`, `travelLockText`.

- [ ] **Step 4: Verificar y adaptar tests que viajan tras combatir**

Run: `npm test`. Si algún test existente falla porque viaja justo después de atacar o recibir daño, agregar `p.msSinceCombat = TRAVEL_COMBAT_LOCK_MS;` (importando la constante) inmediatamente antes de ese `WarpTo`, sin tocar sus `expect`. Luego los tres `tsc`.
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add shared/src server/src
git commit -m "feat: require five seconds out of combat to travel"
```

---

### Task 8: Simulador de balance y línea base

**Files:**
- Create: `server/src/sim/BalanceSimulator.ts`, `server/src/sim/scenarios.ts`, `server/src/sim/BalanceSimulator.test.ts`, `server/scripts/balance.ts`, `artifacts/balance/baseline.json` (generado)
- Modify: `server/src/systems/PotionRecovery.ts`, `server/package.json`

**Interfaces:**
- Consumes: `inHazard` (Task 4), `PlayerState.attributes` (Task 1).
- Produces: `BalanceSimulator.start(port?)`, `fight(scenario, behavior, seed?, maxSeconds?): FightResult`, `manaRun(profile, rotation, seed?, maxSeconds?): number | null`, `stop()`; `balancedAttributes(level)`, `seededRandom(seed)`, `escapePoint(mob, p)`; `baselineScenarios(className): Scenario[]`, `gearFor(className, stage)`, `manaProfile(): Profile`.

- [ ] **Step 1: Reloj de pociones de enlace tardío**

En `PotionRecovery.ts`: `constructor(private readonly now:()=>number=()=>Date.now()) {}` (antes capturaba la función `Date.now` al construir el singleton, lo que impedía controlar el reloj). Correr `npx vitest run src/rooms/PotionRecovery.test.ts src/systems/PotionRecovery.test.ts` → PASS.

- [ ] **Step 2: Test del simulador (falla)**

`server/src/sim/BalanceSimulator.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BalanceSimulator, balancedAttributes, seededRandom } from './BalanceSimulator.js';
import { baselineScenarios } from './scenarios.js';

describe('BalanceSimulator', () => {
  let sim: BalanceSimulator;
  beforeAll(async () => { sim = await BalanceSimulator.start(2611); });
  afterAll(async () => { await sim.stop(); });

  it('splits attribute points evenly with the remainder in vitality', () => {
    expect(balancedAttributes(10)).toEqual({ str: 6, agi: 6, ene: 6, vit: 9 });
  });
  it('is deterministic for the same seed', () => {
    const a = seededRandom(7), b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const raider = baselineScenarios('knight').find(s => s.templateId === 'veil_raider')!;
    expect(sim.fight(raider, 'attentive', 3)).toEqual(sim.fight(raider, 'attentive', 3));
  });
  it('lets an on-level knight beat a regional normal enemy', () => {
    const raider = baselineScenarios('knight').find(s => s.templateId === 'veil_raider')!;
    const r = sim.fight(raider, 'attentive');
    expect(r.outcome).toBe('kill');
    expect(r.seconds).toBeGreaterThan(0);
    expect(r.enemyLevel).toBe(10);
  });
  it('keeps a far lower level character from beating a boss', () => {
    const prior = baselineScenarios('knight').find(s => s.templateId === 'memory_prior')!;
    const r = sim.fight({ ...prior, profile: { ...prior.profile, level: 8 } }, 'stationary', 1, 30);
    expect(r.outcome).not.toBe('kill');
  });
});
```

- [ ] **Step 3: Correrlo y ver que falla**

Run: `npx vitest run src/sim/BalanceSimulator.test.ts` (desde `server/`). Expected: FAIL (módulo inexistente).

- [ ] **Step 4: `BalanceSimulator.ts`**

```ts
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import type { Client } from 'colyseus';
import {
  MessageType, TICK_RATE, availableSkills, getSkill, nearestWalkable, pointsForLevel, weaponRange, distance2D,
  CATALOG_ITEMS, type SkillConfig,
} from '@aden/shared';
import config from '../testServer.js';
import type { GameRoom } from '../rooms/GameRoom.js';
import { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';
import { grantItem, playerLoadout } from '../systems/ItemSystem.js';
import { inHazard } from '../systems/EncounterSystem.js';

export type Behavior = 'attentive' | 'stationary';
export interface Attributes { str: number; agi: number; vit: number; ene: number }
export interface Profile {
  className: string;
  level: number;
  equipment: Record<string, string>;
  attributes?: Attributes;
  potions?: Record<string, number>;
  questId?: string;
}
export interface Scenario {
  name: string;
  templateId: string;
  mapId: string;
  x: number;
  z: number;
  profile: Profile;
  setup?: (room: GameRoom) => void;
}
export interface FightResult {
  scenario: string;
  className: string;
  behavior: Behavior;
  level: number;
  enemyLevel: number;
  outcome: 'kill' | 'death' | 'timeout';
  seconds: number;
  /** Mayor caída de vida durante la pelea, en % de la vida máxima. */
  hpLostPct: number;
  potions: number;
}

const BOT_ID = 'sim_bot';
const TARGET_ID = 'sim_target';
const HP_POTIONS = ['greater_potion', 'health_potion'];
const FULL_CIRCLE = Math.PI * 2;

/** Reparto equilibrado: puntos del nivel en partes iguales; el resto a vitalidad. */
export function balancedAttributes(level: number): Attributes {
  const total = pointsForLevel(level), each = Math.floor(total / 4);
  return { str: each, agi: each, ene: each, vit: total - each * 3 };
}

/** PRNG determinista (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Punto seguro más cercano: detrás del jefe para un cono; fuera del borde para un círculo. */
export function escapePoint(mob: Pick<MobState, 'hazardX' | 'hazardZ' | 'hazardRadius' | 'hazardArc' | 'hazardAngle'>, p: { x: number; z: number }): { x: number; z: number } {
  if (mob.hazardArc < FULL_CIRCLE - 1e-6) {
    return { x: mob.hazardX - Math.cos(mob.hazardAngle) * 2, z: mob.hazardZ - Math.sin(mob.hazardAngle) * 2 };
  }
  let dx = p.x - mob.hazardX, dz = p.z - mob.hazardZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) { dx = 1; dz = 0; } else { dx /= len; dz /= len; }
  return { x: mob.hazardX + dx * (mob.hazardRadius + 2), z: mob.hazardZ + dz * (mob.hazardRadius + 2) };
}

/**
 * Corre el combate real del servidor (daño, skills, pociones, peligros, diferencia de nivel)
 * con un bot, avanzando el tick a mano con azar y reloj controlados. No reemplaza partidas reales.
 */
export class BalanceSimulator {
  private clock = Date.now();
  private readonly client = { sessionId: BOT_ID, send: () => {} } as unknown as Client;

  private constructor(private readonly server: ColyseusTestServer, private readonly room: GameRoom) {}

  static async start(port = 2610): Promise<BalanceSimulator> {
    const server = await boot(config, port);
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 1000);
    return new BalanceSimulator(server, room);
  }

  async stop(): Promise<void> {
    await this.server.shutdown();
  }

  fight(s: Scenario, behavior: Behavior, seed = 1, maxSeconds = 300): FightResult {
    return this.controlled(seed, advance => {
      const p = this.resetWorld(s.profile);
      s.setup?.(this.room);
      const mob = this.room.spawnMob(TARGET_ID, s.templateId, s.x, s.z, s.mapId);
      this.place(p, s.mapId, mob.x, mob.z + 5);
      this.send(MessageType.SetTarget, { targetId: TARGET_ID });
      const dt = 1 / TICK_RATE;
      let t = 0, potions = 0, lowestHp = p.hp;
      const result = (outcome: FightResult['outcome']): FightResult => ({
        scenario: s.name, className: s.profile.className, behavior, level: s.profile.level, enemyLevel: mob.level,
        outcome, seconds: Math.round(t * 10) / 10, hpLostPct: Math.round(100 * (1 - lowestHp / p.maxHp)), potions,
      });
      while (t < maxSeconds) {
        if (mob.dead) return result('kill');
        if (p.dead) return result('death');
        if (behavior === 'attentive') potions += this.attentiveStep(p, mob);
        else if (!p.targetId) this.send(MessageType.SetTarget, { targetId: TARGET_ID });
        this.room.tick(dt);
        advance(dt * 1000);
        t += dt;
        lowestHp = Math.min(lowestHp, p.hp);
      }
      return result('timeout');
    });
  }

  /** Segundos hasta que la rotación no se puede pagar con el maná disponible (null = la sostiene). */
  manaRun(profile: Profile, rotation: 'max' | 'primary', seed = 1, maxSeconds = 180): number | null {
    return this.controlled(seed, advance => {
      const p = this.resetWorld(profile);
      const dummy = this.room.spawnMob(TARGET_ID, 'veil_raider', 1200, 130, 'marismas');
      dummy.maxHp = dummy.hp = 1e9; dummy.pAtk = 0; dummy.stunMs = 1e12;
      this.place(p, 'marismas', dummy.x, dummy.z + 2);
      this.send(MessageType.SetTarget, { targetId: TARGET_ID });
      const skills = this.offensive(p, rotation);
      const dt = 1 / TICK_RATE;
      for (let t = 0; t < maxSeconds; t += dt) {
        for (const s of skills) {
          if ((p.skillCooldowns.get(s.id) ?? 0) > 0) continue;
          if (p.mp < s.mpCost) return Math.round(t * 10) / 10;
          this.send(MessageType.UseSkill, { skillId: s.id });
        }
        this.room.tick(dt);
        advance(dt * 1000);
      }
      return null;
    });
  }

  /** Devuelve 1 si usó una poción en este tick. */
  private attentiveStep(p: PlayerState, mob: MobState): number {
    if (mob.hazardMs > 0 && inHazard(mob, p.x, p.z)) {
      this.send(MessageType.MoveTo, escapePoint(mob, p));
      return 0;
    }
    let used = 0;
    if (p.hp < p.maxHp * 0.45 && p.hpPotionCooldownMs <= 0) {
      const potion = HP_POTIONS.find(id => (p.inventory.get(id)?.qty ?? 0) > 0);
      if (potion) { this.send(MessageType.UseItem, { itemTemplateId: potion }); used = 1; }
    }
    if (!p.targetId) this.send(MessageType.SetTarget, { targetId: TARGET_ID });
    for (const s of this.castable(p)) this.send(MessageType.UseSkill, { skillId: s.id });
    const range = weaponRange(playerLoadout(p));
    const d = distance2D(p.x, p.z, mob.x, mob.z);
    if (d > range * 0.9) {
      const k = (d - range * 0.7) / d;
      const goal = { x: p.x + (mob.x - p.x) * k, z: p.z + (mob.z - p.z) * k };
      if (!(mob.hazardMs > 0 && inHazard(mob, goal.x, goal.z))) this.send(MessageType.MoveTo, goal);
    }
    return used;
  }

  private skills(p: PlayerState): SkillConfig[] {
    return availableSkills(p.className, p.level, [...p.learnedTomes], p.equipment.get('weapon')).map(id => getSkill(id));
  }

  private castable(p: PlayerState): SkillConfig[] {
    return this.skills(p).filter(s => {
      if ((p.skillCooldowns.get(s.id) ?? 0) > 0 || p.mp < s.mpCost) return false;
      if (s.type === 'dash' || s.dash === 'away') return false;
      if (s.type === 'heal') return p.hp < p.maxHp * 0.6;
      if (s.type === 'buff') return (s.buffStat === 'pDef' ? p.defBuffMs : p.atkBuffMs) <= 0 && !(s.healPct && p.hp > p.maxHp * 0.6);
      return true;
    });
  }

  /** Skills ofensivas sin desplazamiento; 'primary' = solo la primera del kit. */
  private offensive(p: PlayerState, rotation: 'max' | 'primary'): SkillConfig[] {
    const list = this.skills(p).filter(s => (s.type === 'damage' || s.type === 'dot') && !s.dash);
    return rotation === 'primary' ? list.slice(0, 1) : list;
  }

  private resetWorld(profile: Profile): PlayerState {
    const r = this.room;
    r.state.mobs.clear(); r.state.players.clear(); r.state.droppedItems.clear();
    (r as unknown as { dungeonRun: { dungeonStage: number; dungeonKills: number } }).dungeonRun.dungeonStage = 0;
    const p = new PlayerState();
    p.name = BOT_ID; p.className = profile.className; p.level = profile.level;
    p.questId = profile.questId ?? 'q1';
    for (const [slot, id] of Object.entries(profile.equipment)) p.equipment.set(slot, id);
    const a = profile.attributes ?? balancedAttributes(profile.level);
    p.attributes.str = a.str; p.attributes.agi = a.agi; p.attributes.vit = a.vit; p.attributes.ene = a.ene;
    for (const [id, qty] of Object.entries(profile.potions ?? {})) grantItem(p, id, qty);
    for (const item of Object.values(CATALOG_ITEMS)) if (item.category === 'municion') grantItem(p, item.id, 5000);
    r.state.players.set(BOT_ID, p);
    (r as unknown as { recomputeStats(p: PlayerState): void }).recomputeStats(p);
    p.hp = p.maxHp; p.mp = p.maxMp; p.msSinceCombat = 100000;
    return p;
  }

  private place(p: PlayerState, mapId: string, x: number, z: number): void {
    const at = nearestWalkable(mapId, { x, z });
    p.mapId = mapId; p.x = p.targetX = at.x; p.z = p.targetZ = at.z; p.moving = false;
  }

  private send(type: string, message: unknown): void {
    const handlers = (this.room as unknown as { onMessageHandlers: Record<string, (c: Client, m: unknown) => void> }).onMessageHandlers;
    handlers[type](this.client, message);
  }

  /** Azar sembrado y reloj monótono propio (las pociones usan Date.now). */
  private controlled<T>(seed: number, run: (advance: (ms: number) => void) => T): T {
    const realRandom = Math.random, realNow = Date.now;
    Math.random = seededRandom(seed);
    Date.now = () => this.clock;
    try { return run(ms => { this.clock += ms; }); }
    finally { Math.random = realRandom; Date.now = realNow; }
  }
}
```

`MessageType` es un objeto `const` con valores string (`shared/src/protocol.ts`), así que `this.send(MessageType.X, …)` indexa directo los handlers de la sala.

- [ ] **Step 5: `scenarios.ts`**

```ts
import { SPAWN_ZONES, getItem, dungeonReward, createItemInstance, CRYPT_BOSS } from '@aden/shared';
import type { GameRoom } from '../rooms/GameRoom.js';
import type { Profile, Scenario } from './BalanceSimulator.js';

export type GearStage = 'ruins' | 'crypt' | 'throne' | 'act2';

function spawnOf(templateId: string): { mapId: string; x: number; z: number } {
  const zone = SPAWN_ZONES.find(z => z.templateId === templateId);
  if (!zone) throw new Error(`sin spawn para ${templateId}`);
  return { mapId: zone.mapId, x: zone.centerX, z: zone.centerZ };
}

/** Equipo garantizado por la campaña al llegar a cada jefe (sin botín aleatorio). */
export function gearFor(className: string, stage: GearStage): Record<string, string> {
  const base = getItem(dungeonReward(className));
  const early = createItemInstance(base, { quality: 'magic', level: 2 }, `sim_q2_${className}`);
  const crypt = createItemInstance(base, { quality: 'magic', level: 5, skill: true }, `sim_crypt_${className}`);
  const trinkets = { accessory: 'hunter_charm', ring: 'aden_sello_del_veneno_antiguo' };
  switch (stage) {
    case 'ruins': return { weapon: early, armor: 'leather_vest', ...trinkets };
    case 'crypt': return { weapon: early, armor: 'crypt_plate', ...trinkets };
    case 'throne': return { weapon: crypt, armor: 'ash_guard', ...trinkets };
    case 'act2': return { weapon: crypt, armor: 'nihil_aegis', ...trinkets };
  }
}

function profile(className: string, level: number, stage: GearStage, questId?: string): Profile {
  return { className, level, equipment: gearFor(className, stage), potions: { greater_potion: 20, health_potion: 20 }, questId };
}

function scenario(name: string, templateId: string, p: Profile, setup?: (room: GameRoom) => void): Scenario {
  return { name, templateId, ...spawnOf(templateId), profile: p, setup };
}

/** Jefes y enemigos actuales al nivel previsto de la campaña. */
export function baselineScenarios(className: string): Scenario[] {
  return [
    scenario('Centinela', 'crypt_sentinel', profile(className, 6, 'ruins')),
    { ...scenario('Custodio', 'crypt_warden', profile(className, 7, 'crypt'), room => {
      (room as unknown as { dungeonRun: { dungeonStage: number } }).dungeonRun.dungeonStage = 4;
    }), x: CRYPT_BOSS.x, z: CRYPT_BOSS.z },
    scenario('Nihil', 'skeleton_king', profile(className, 10, 'throne')),
    scenario('Saqueador', 'veil_raider', profile(className, 10, 'act2')),
    scenario('Guardián del Velo', 'veil_guardian', profile(className, 12, 'act2')),
    scenario('Guardia', 'memory_guard', profile(className, 13, 'act2')),
    scenario('Carcelero', 'memory_jailer', profile(className, 14, 'act2')),
    scenario('Prior', 'memory_prior', profile(className, 15, 'act2', 'a2_prior')),
  ];
}

/** Mago de nivel 15 con el equipo del Acto II, para medir el maná en combate. */
export function manaProfile(): Profile {
  return profile('mage', 15, 'act2', 'a2_prior');
}
```

(`CRYPT_BOSS` se exporta desde `@aden/shared` vía `dungeon.ts`. `server/tsconfig.json` incluye solo `src`, así que `scripts/balance.ts` no pasa por `tsc`; lo ejecuta `tsx`.)

- [ ] **Step 6: CLI**

`server/scripts/balance.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLASS_ORDER } from '@aden/shared';
import { BalanceSimulator, type Behavior, type FightResult } from '../src/sim/BalanceSimulator.js';
import { baselineScenarios, manaProfile } from '../src/sim/scenarios.js';

const OUT = '../artifacts/balance';
const sim = await BalanceSimulator.start();
try {
  mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--mana')) {
    const profile = manaProfile();
    const report = { max: sim.manaRun(profile, 'max'), primary: sim.manaRun(profile, 'primary') };
    writeFileSync(`${OUT}/mana.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } else {
    const rows: FightResult[] = [];
    for (const cls of CLASS_ORDER) for (const s of baselineScenarios(cls)) for (const b of ['attentive', 'stationary'] as Behavior[]) rows.push(sim.fight(s, b));
    writeFileSync(`${OUT}/baseline.json`, JSON.stringify(rows, null, 2));
    console.log('| Escenario | Clase | Conducta | Nivel | Enemigo | Resultado | s | Caída de vida % | Pociones |');
    console.log('|---|---|---|---:|---:|---|---:|---:|---:|');
    for (const r of rows) console.log(`| ${r.scenario} | ${r.className} | ${r.behavior} | ${r.level} | ${r.enemyLevel} | ${r.outcome} | ${r.seconds} | ${r.hpLostPct} | ${r.potions} |`);
  }
} finally {
  await sim.stop();
}
```

En `server/package.json`, `scripts`: `"balance": "tsx scripts/balance.ts"`.

- [ ] **Step 7: Verificar tests**

Run: `npx vitest run src/sim/BalanceSimulator.test.ts` (desde `server/`), luego `npm test` + tres `tsc`.
Expected: verde. Si "lets an on-level knight beat a regional normal enemy" falla, no ajustar el test: investigar el bot (rango, objetivo, movimiento) con `systematic-debugging`, porque un caballero de nivel 10 con equipo garantizado sí vence hoy a un Saqueador de nivel 10.

- [ ] **Step 8: Generar la línea base**

Run: `npm run balance --workspace @aden/server`
Expected: tabla de 80 filas (5 clases × 8 escenarios × 2 conductas) y `artifacts/balance/baseline.json`. Pegar la tabla en el reporte de la tarea. No se exige ningún resultado de balance en esta etapa: es la medición de partida.

- [ ] **Step 9: Commit**

```bash
git add server/src/sim server/scripts server/package.json server/src/systems/PotionRecovery.ts artifacts/balance/baseline.json
git commit -m "feat: add deterministic balance simulator and record the current baseline"
```

---

### Task 9: Maná en combate calibrado

**Files:**
- Create: `shared/src/regen.ts`, `shared/src/regen.test.ts`, `artifacts/balance/mana.json` (generado)
- Modify: `shared/src/index.ts`, `server/src/rooms/GameRoom.ts`, `server/src/sim/BalanceSimulator.test.ts`

**Interfaces:**
- Produces: `COMBAT_REGEN_DELAY_MS = 5000`, `MP_REGEN_OUT_OF_COMBAT_PCT = 0.06`, `MP_REGEN_IN_COMBAT_PCT` (calibrado), `mpRegenPerSecond(maxMp, msSinceCombat, manaRegenEffect): number`.

- [ ] **Step 1: Tests (fallan)**

`shared/src/regen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mpRegenPerSecond, MP_REGEN_IN_COMBAT_PCT, MP_REGEN_OUT_OF_COMBAT_PCT, COMBAT_REGEN_DELAY_MS } from './regen.js';

describe('mana regeneration', () => {
  it('refills out of combat in under 20 s', () => {
    for (const maxMp of [60, 150, 300, 600]) expect(maxMp / mpRegenPerSecond(maxMp, COMBAT_REGEN_DELAY_MS, 0)).toBeLessThan(20);
  });
  it('is slower in combat and adds item effects on top', () => {
    expect(MP_REGEN_IN_COMBAT_PCT).toBeLessThan(MP_REGEN_OUT_OF_COMBAT_PCT);
    expect(mpRegenPerSecond(300, 0, 0)).toBeLessThan(mpRegenPerSecond(300, COMBAT_REGEN_DELAY_MS, 0));
    expect(mpRegenPerSecond(300, 0, 0.01)).toBeCloseTo(mpRegenPerSecond(300, 0, 0) + 3);
    expect(mpRegenPerSecond(10, 0, 0)).toBeGreaterThanOrEqual(1);
  });
});
```

Agregar a `BalanceSimulator.test.ts`:

```ts
  it('drains the full mage rotation in 40–70 s of combat but sustains the primary skill', () => {
    const max = sim.manaRun(manaProfile(), 'max');
    expect(max).not.toBeNull();
    expect(max!).toBeGreaterThanOrEqual(40);
    expect(max!).toBeLessThanOrEqual(70);
    expect(sim.manaRun(manaProfile(), 'primary')).toBeNull();
  });
```

(importar `manaProfile` desde `./scenarios.js`).

- [ ] **Step 2: Correrlos y ver que fallan**

Run: `npx vitest run src/regen.test.ts` (shared). Expected: FAIL (módulo inexistente).

- [ ] **Step 3: `regen.ts` con valor inicial**

```ts
/** Sin recibir ni causar daño durante este tiempo, el personaje sale de combate. */
export const COMBAT_REGEN_DELAY_MS = 5000;
/** Fracción del maná máximo por segundo fuera de combate (recarga completa en ~17 s). */
export const MP_REGEN_OUT_OF_COMBAT_PCT = 0.06;
/** Fracción del maná máximo por segundo en combate. Calibrado con `npm run balance -- --mana`. */
export const MP_REGEN_IN_COMBAT_PCT = 0.02;

export function mpRegenPerSecond(maxMp: number, msSinceCombat: number, manaRegenEffect: number): number {
  const base = msSinceCombat < COMBAT_REGEN_DELAY_MS
    ? Math.max(1, maxMp * MP_REGEN_IN_COMBAT_PCT)
    : Math.max(2, maxMp * MP_REGEN_OUT_OF_COMBAT_PCT);
  return base + maxMp * manaRegenEffect;
}
```

Agregar `export * from './regen.js';` a `shared/src/index.ts`. En `GameRoom.tick`, reemplazar `p.mpRegenAcc += (Math.max(2, p.maxMp * 0.04)+p.maxMp*p.itemEffects.manaRegen) * dt;` por `p.mpRegenAcc += mpRegenPerSecond(p.maxMp, p.msSinceCombat, p.itemEffects.manaRegen) * dt;` (importar `mpRegenPerSecond`).

- [ ] **Step 4: Calibrar**

Run: `npm run balance --workspace @aden/server -- --mana`
Leer `{"max": X, "primary": Y}`. Objetivo: `40 ≤ X ≤ 70` y `Y === null`.
- Si `X < 40` o `Y !== null`: subir `MP_REGEN_IN_COMBAT_PCT` en 0,005.
- Si `X > 70` o `X === null`: bajarlo en 0,005 (mínimo 0).
Repetir hasta cumplir ambas condiciones. Si ningún valor entre 0 y 0,04 cumple las dos a la vez, **detenerse y reportar BLOCKED** con la tabla de valores probados: significa que el costo de las skills también necesita ajuste, y esa decisión es del controlador.

- [ ] **Step 5: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde, incluido el test de maná del simulador. `el maná regenera con el tiempo` (GameRoom.test) sigue pasando porque ese jugador está fuera de combate.

- [ ] **Step 6: Regenerar artefactos**

Run: `npm run balance --workspace @aden/server -- --mana` y `npm run balance --workspace @aden/server`. Se actualizan `artifacts/balance/mana.json` y `baseline.json` con el maná calibrado.

- [ ] **Step 7: Commit**

```bash
git add shared/src server/src artifacts/balance
git commit -m "feat: slow mana regeneration in combat, calibrated with the simulator"
```

---

### Task 10: Verificación final y preparación del deploy

**Files:**
- Modify: `DEPLOY.md`

- [ ] **Step 1: Suite y tipos**

Run (raíz): `npm test`, `npx tsc -p shared/tsconfig.json --noEmit`, `npx tsc -p server/tsconfig.json --noEmit`, `npx tsc -p client/tsconfig.json --noEmit`, `npm run build --workspace @aden/client`, `npm run build --workspace @aden/server`.
Expected: todo verde. Anotar el total de tests (antes: 717).

- [ ] **Step 2: Presupuesto de schema**

Run (desde `server/`): `npx vitest run src/state/PlayerState.test.ts` → PASS (≤ 45).

- [ ] **Step 3: Prueba en navegador contra server local**

Levantar con `preview_start` la configuración de `.claude/launch.json` (server + cliente). Crear un personaje y comprobar:
- `C`: el panel de atributos muestra puntos y los cuatro atributos (lee `attributes`).
- `T`: el panel de progreso muestra racha y diaria (lee `retention`).
- Hablar con el Capitán Varek asigna el contrato y aparece en el rastreador (lee `sideChains`).
- Sin errores en la consola.
Capturar pantalla como evidencia.

- [ ] **Step 4: `DEPLOY.md`**

Agregar una sección:

```markdown
## Cambios de schema: deploy coordinado

Cuando un commit cambia campos `@type` de `server/src/state/*`, el server (Railway) y el cliente (Vercel) deben deployarse con el mismo commit: un cliente nuevo contra un server viejo (o al revés) rompe la sincronización. La etapa A (Fragua, cimientos) cambia `PlayerState` (sub-estados `attributes`, `retention`, `sideChains`) y `MobState` (`hazardArc`, `hazardAngle`).

El watch pattern del servicio de Railway es `/server/**`: un commit que solo toca `shared/` NO redeploya el server aunque el bundle lo incluya. Conviene agregar `/shared/**` al patrón.
```

- [ ] **Step 5: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: note coordinated deploys for schema changes"
```

- [ ] **Step 6: Entregar al usuario**

Informar resultados (tests, tipos, build, navegador, tabla de línea base y valor de maná calibrado) y pedir OK explícito para: (1) integrar `fragua-antigua` en `master` y pushear (deploy coordinado Vercel + Railway), (2) agregar `/shared/**` al watch pattern de Railway.
