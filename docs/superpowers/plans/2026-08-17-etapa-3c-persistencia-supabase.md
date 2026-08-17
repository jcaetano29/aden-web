# Etapa 3c — Persistencia (Supabase) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El progreso del jugador (nivel, EXP, posición, inventario) persiste entre sesiones. Al entrar con un nombre, el server carga el personaje desde Supabase (o crea uno nuevo); guarda periódicamente y al salir. El server queda desacoplado de la infra concreta detrás de una interfaz `PersistenceService`, con una implementación Supabase y una in-memory (fallback/tests). Si no hay credenciales en el entorno, cae a in-memory y el juego corre sin persistir.

**Architecture:** Interfaz `PersistenceService` (load/save). `SupabasePersistence` usa `@supabase/supabase-js` con `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` del entorno. `InMemoryPersistence` (Map) para tests y fallback. Un factory elige según el entorno. La (de)serialización `PlayerState ↔ CharacterSave` es pura y testeada. El `GameRoom` carga on-join, guarda periódico + on-leave. Los stats absolutos (maxHp/maxMp/pAtk/pDef) se recomputan del nivel con `statsForLevel` (no se guardan). Server-autoritativo; sin cambios de protocolo cliente.

**Infra ya provista (fuera de este plan):** proyecto Supabase `aden-web` (ref `lvxcgzfrxrrlkbvasidl`, us-east-1), URL `https://lvxcgzfrxrrlkbvasidl.supabase.co`, tabla `public.characters (name PK, level, exp, pos_x, pos_z, inventory jsonb, updated_at)` con RLS ON sin políticas (solo service_role escribe).

**Tech Stack:** TypeScript, Colyseus 0.15, `@supabase/supabase-js`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§3 Persistencia)

## Global Constraints

- ESM, `strict: true`. TDD en lo puro ((de)serialización, `statsForLevel`, selección del factory, InMemoryPersistence).
- **NUNCA** commitear secretos. El server lee `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` de `process.env` (vía `server/.env`, ya gitignoreado). Se agrega `server/.env.example` con placeholders. La service key la pone el usuario.
- Sin credenciales → `createPersistence()` devuelve `InMemoryPersistence` y loguea un warning; el juego corre igual (sin persistir entre reinicios).
- Server autoritativo; sin nuevos mensajes cliente→servidor. No romper etapas previas.
- Guardado: `name → {level, exp, pos_x, pos_z, inventory}`. Al cargar: recomputar maxHp/maxMp/pAtk/pDef del nivel, rellenar hp/mp al máximo (login "fresco"), restaurar pos + inventario.

---

## File Structure

```
shared/src/progression.ts        (MODIFICAR) statsForLevel(level) → {maxHp,maxMp,pAtk,pDef} (puro, testeado)
shared/src/progression.test.ts   (MODIFICAR)

server/package.json              (MODIFICAR) dep @supabase/supabase-js
server/src/persistence/CharacterSave.ts        (NUEVO) tipo + serialize/deserialize puros
server/src/persistence/CharacterSave.test.ts   (NUEVO)
server/src/persistence/PersistenceService.ts   (NUEVO) interfaz + InMemoryPersistence
server/src/persistence/PersistenceService.test.ts (NUEVO)
server/src/persistence/SupabasePersistence.ts  (NUEVO) adapter supabase-js
server/src/persistence/createPersistence.ts    (NUEVO) factory por env
server/src/persistence/createPersistence.test.ts (NUEVO)
server/src/rooms/GameRoom.ts     (MODIFICAR) load on join, save periódico + on leave
server/.env.example              (NUEVO) SUPABASE_URL / SUPABASE_SERVICE_KEY placeholders
```

---

### Task 1: Shared — statsForLevel (puro, TDD)

**Files:** Modify: `shared/src/progression.ts`, `shared/src/progression.test.ts`

**Interfaces:**
- `statsForLevel(level: number): { maxHp: number; maxMp: number; pAtk: number; pDef: number }` = base de `PLAYER_COMBAT` + `LEVEL_GROWTH * (level - 1)`.
  - `maxHp = PLAYER_COMBAT.maxHp + (level-1)*LEVEL_GROWTH.hp`; idem mp/pAtk/pDef.

- [ ] **Step 1: Test que falla**

```ts
import { statsForLevel, LEVEL_GROWTH } from "./progression.js";
import { PLAYER_COMBAT } from "./combat.js";

describe("statsForLevel", () => {
  it("nivel 1 = base de PLAYER_COMBAT", () => {
    expect(statsForLevel(1)).toEqual({
      maxHp: PLAYER_COMBAT.maxHp, maxMp: PLAYER_COMBAT.maxMp ?? 0,
      pAtk: PLAYER_COMBAT.pAtk, pDef: PLAYER_COMBAT.pDef,
    });
  });
  it("nivel 3 aplica el crecimiento dos veces", () => {
    const s = statsForLevel(3);
    expect(s.maxHp).toBe(PLAYER_COMBAT.maxHp + 2 * LEVEL_GROWTH.hp);
    expect(s.pAtk).toBe(PLAYER_COMBAT.pAtk + 2 * LEVEL_GROWTH.pAtk);
  });
});
```

- [ ] **Step 2: FAIL.** `npm test --workspace @aden/shared`.
- [ ] **Step 3: Implementar** en `progression.ts` (importa `PLAYER_COMBAT` de `./combat.js`):

```ts
import { PLAYER_COMBAT } from "./combat.js";

export function statsForLevel(level: number): { maxHp: number; maxMp: number; pAtk: number; pDef: number } {
  const n = Math.max(0, level - 1);
  return {
    maxHp: PLAYER_COMBAT.maxHp + n * LEVEL_GROWTH.hp,
    maxMp: (PLAYER_COMBAT.maxMp ?? 0) + n * LEVEL_GROWTH.mp,
    pAtk: PLAYER_COMBAT.pAtk + n * LEVEL_GROWTH.pAtk,
    pDef: PLAYER_COMBAT.pDef + n * LEVEL_GROWTH.pDef,
  };
}
```
(Cuidar imports circulares: `combat.ts` no debe importar `progression.ts`. Si los hay, mover la constante base o inyectarla.)

- [ ] **Step 4: PASS. Step 5: Commit** `git commit -m "feat(shared): statsForLevel para recomputar stats absolutos por nivel"`.

---

### Task 2: Server — CharacterSave (serialización pura, TDD)

**Files:** Create: `server/src/persistence/CharacterSave.ts`, `.test.ts`

**Interfaces:**
- `interface CharacterSave { level: number; exp: number; pos_x: number; pos_z: number; inventory: Record<string, number> }`
- `interface Persistable { level:number; exp:number; x:number; z:number; inventory: Map<string,{qty:number}> | { forEach(cb:(v:{qty:number},k:string)=>void):void } }` — forma mínima que satisface `PlayerState`.
- `toCharacterSave(p: Persistable): CharacterSave` — arma el save (inventario → Record).
- `applyCharacterSave(p, save, statsForLevel, setInventoryEntry)` — el server la usará para volcar el save al PlayerState; para el test, la parte pura es `toCharacterSave` + una `inventoryToRecord`/`recordToEntries` testeable. Mantener `toCharacterSave` y `inventoryRecordToEntries(record): [string,number][]` puras y testeadas; la aplicación sobre el MapSchema se hace en el GameRoom (Task 4).

- [ ] **Step 1: Test que falla** — `toCharacterSave` desde un objeto plano con inventory `Map`, y `inventoryRecordToEntries`:

```ts
import { toCharacterSave, inventoryRecordToEntries } from "./CharacterSave.js";

describe("toCharacterSave", () => {
  it("serializa nivel/exp/pos e inventario a Record", () => {
    const inv = new Map([["gold", { qty: 5 }], ["bone", { qty: 2 }]]);
    const save = toCharacterSave({ level: 3, exp: 40, x: 12, z: -7, inventory: inv });
    expect(save).toEqual({ level: 3, exp: 40, pos_x: 12, pos_z: -7, inventory: { gold: 5, bone: 2 } });
  });
});

describe("inventoryRecordToEntries", () => {
  it("convierte el Record a pares [id, qty]", () => {
    expect(inventoryRecordToEntries({ gold: 5, bone: 2 })).toEqual(
      expect.arrayContaining([["gold", 5], ["bone", 2]]),
    );
  });
});
```

- [ ] **Step 2: FAIL → Step 3: implementar** (puros) → **Step 4: PASS. Step 5: Commit** `git commit -m "feat(server): CharacterSave (serializacion de personaje)"`.

---

### Task 3: Server — PersistenceService, InMemory, Supabase y factory

**Files:** Create: `PersistenceService.ts` (+test), `SupabasePersistence.ts`, `createPersistence.ts` (+test); Modify: `server/package.json` (dep); Create: `server/.env.example`

**Interfaces:**
- `interface PersistenceService { load(name: string): Promise<CharacterSave | null>; save(name: string, data: CharacterSave): Promise<void> }`
- `class InMemoryPersistence implements PersistenceService` (un `Map<string, CharacterSave>`).
- `class SupabasePersistence implements PersistenceService` — constructor recibe `(url, serviceKey)`, crea el client `@supabase/supabase-js`; `load` → `from('characters').select().eq('name',name).maybeSingle()` → mapear a CharacterSave (o null); `save` → `upsert({ name, ...data, updated_at: new Date().toISOString() })`.
- `createPersistence(env = process.env): PersistenceService` — si `env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY` → `new SupabasePersistence(...)`; si no → `console.warn('[aden] sin Supabase, persistencia in-memory')` + `new InMemoryPersistence()`.

- [ ] **Step 1: `npm install @supabase/supabase-js --workspace @aden/server`** (agrega la dep).
- [ ] **Step 2: TDD `PersistenceService.test.ts`** — round-trip de `InMemoryPersistence` (save luego load devuelve lo guardado; load de inexistente → null).
- [ ] **Step 3: TDD `createPersistence.test.ts`** — con env vacío → instancia de InMemory; con env `{SUPABASE_URL, SUPABASE_SERVICE_KEY}` → instancia de SupabasePersistence (no hace red en el constructor; sólo verificar el tipo/rama). Inyectar `env` como parámetro para testear sin tocar `process.env`.
- [ ] **Step 4: Implementar** los tres + `.env.example`:
```
# server/.env — NO commitear. Copiar a server/.env y completar.
SUPABASE_URL=https://lvxcgzfrxrrlkbvasidl.supabase.co
SUPABASE_SERVICE_KEY=pegar-aqui-la-service-role-key-de-supabase
```
- [ ] **Step 5:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (nuevos + existentes verdes). Confirmar que `.env` está en `.gitignore` (ya lo está a nivel raíz).
- [ ] **Step 6: Commit** `git commit -m "feat(server): PersistenceService (InMemory + Supabase) y factory por env"`.

---

### Task 4: Server — wiring load/save en GameRoom

**Files:** Modify: `server/src/rooms/GameRoom.ts`

- [ ] **Step 1:** En `onCreate`, `this.persistence = createPersistence()`. Un `SAVE_INTERVAL_MS = 15000`; en `onCreate` agendar un `this.clock.setInterval(() => this.saveAll(), SAVE_INTERVAL_MS)` (o setInterval).
- [ ] **Step 2: `onJoin` async** — tras crear el PlayerState y setear `name`, `const save = await this.persistence.load(name);` si existe: aplicar `level/exp`, `statsForLevel(level)` → maxHp/maxMp/pAtk/pDef, `hp=maxHp/mp=maxMp`, `x=z from pos`, y volcar el inventario (`for (const [id, qty] of inventoryRecordToEntries(save.inventory)) { const it = new InventoryItemState(); it.itemTemplateId=id; it.qty=qty; player.inventory.set(id, it); }`). Si no existe: dejar los defaults (nivel 1) y opcional guardar el inicial. (Nota: Colyseus permite `onJoin` async; el player ya está en el estado, se actualiza al resolver.)
- [ ] **Step 3: `saveAll()`** — por cada player, `this.persistence.save(player.name, toCharacterSave(player))` (fire-and-forget con catch que loguea). `toCharacterSave` recibe el PlayerState (satisface `Persistable`: level/exp/x/z/inventory).
- [ ] **Step 4: `onLeave`** — antes de borrar el player, `await this.persistence.save(player.name, toCharacterSave(player))` (best-effort, try/catch).
- [ ] **Step 5:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes — si el GameRoom test rompe por el async/onJoin, ajustarlo con justificación). Boot OK (sin env → warning in-memory, sin crash).
- [ ] **Step 6: Commit** `git commit -m "feat(server): cargar personaje al entrar y guardar periodico + al salir"`.

---

### Task 5: Verificación (controller)

- [ ] **Step 1: Round-trip de DB (MCP, real Supabase)** — el controlador, vía la MCP de Supabase, hace `insert` de un personaje de prueba en `characters`, lo `select`ea, y lo borra — probando que el schema/tipos funcionan (jsonb inventory incluido). (No requiere la service key en el server.)
- [ ] **Step 2: Round-trip lógico con InMemory (script)** — levantar el server (sin env → InMemory), conectar un cliente, ganar exp/loot, desconectar; NO persiste entre reinicios en in-memory, así que verificar el path con un test de integración o script que use una instancia de `InMemoryPersistence` compartida: save on-leave escribió, y un load posterior devuelve el estado. (O cubrirlo con el unit test de Task 3/4.)
- [ ] **Step 3: Handoff de la service key** — dejar documentado (en el reporte y para el usuario) que, para persistir de verdad en Supabase, hay que copiar `server/.env.example` a `server/.env` y pegar la **service_role key** (Supabase → Project Settings → API → service_role). Con eso, el server persiste automáticamente. La verificación live end-to-end contra Supabase la hace el usuario (o el controlador si el usuario provee la key).

---

## Self-Review (cobertura vs spec)

- **Persistencia de personaje (nivel/exp/pos/inventario) (spec §3):** Tasks 2,3,4.
- **Load on join / save periódico + on leave (spec §3):** Task 4.
- **Supabase (spec §3):** Task 3 (adapter) + infra ya provista (proyecto+schema).
- **Desacople por interfaz + fallback:** `PersistenceService` + `createPersistence` (Task 3).
- **Sin secretos en el repo:** `.env` gitignoreado, `.env.example` con placeholders; la service key la pone el usuario.
- **Fuera de alcance:** login con password / cuentas (v1 = por nombre); persistencia de mobs/mundo (efímeros); deploy (Etapa 4, Vercel + host del server).

**Placeholder scan:** el código con lógica está en los steps; los de wiring describen el cambio con precisión (incl. onJoin async y el volcado de inventario al MapSchema).
**Type consistency:** `CharacterSave`/`toCharacterSave`/`inventoryRecordToEntries` server; `statsForLevel` shared; `PersistenceService` implementado por InMemory+Supabase; PlayerState satisface `Persistable`.
