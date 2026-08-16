# Etapa 3b — Loot e inventario (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al matar un mob, según su drop table, caen ítems al piso (server-autoritativo). El jugador los levanta caminando por encima (auto-pickup por proximidad) y se acumulan en su inventario. El cliente renderiza los ítems en el piso y muestra un panel de inventario (tecla "i") con los ítems y sus cantidades. Sin persistencia todavía (Etapa 3c, Supabase).

**Architecture:** Sobre E3a. La lógica pura (drop tables + `rollDrops`, y `addToInventory` con stacking) vive en `shared`, testeada. El drop se engancha en el helper `killMob` que ya existe (único punto de muerte de mob, con `mob` + `killerId`). El estado suma `GameState.droppedItems` (ítems en el piso) y `PlayerState.inventory`. El `GameRoom` tick despawnea ítems viejos y hace auto-pickup por proximidad. El cliente renderiza los ítems del piso y un panel HTML de inventario leyendo el estado sincronizado. Sin nuevos mensajes cliente→servidor (el pickup es automático server-side).

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§4 Loot)

## Global Constraints

- ESM, `strict: true`. TDD en la lógica pura (`rollDrops`, `addToInventory`).
- Server autoritativo: drops, ground items, pickup e inventario 100% server. El cliente solo renderiza estado sincronizado.
- Reusar `killMob(mob, mobId, killerId?)` (E3a) como punto de drop — ahí ya están el mob (para su drop table) y el killer (para atribuir el loot a su inventario). El loot va al **killer**.
- Config (rulings, shared): `PICKUP_RANGE = 2.5`; `DROP_DESPAWN_MS = 60000`. Ítems (todos stackables en v1):
  - `bone` (material), `gold` (currency), `health_potion` (consumable).
  - Drop tables: `skeleton_minion` → `[{gold, 0.8, 1-5}, {bone, 0.5, 1-2}]`; `skeleton_warrior` → `[{gold, 1.0, 3-10}, {bone, 0.7, 1-3}, {health_potion, 0.15, 1-1}]`.
- Inventario keyed por `itemTemplateId` (stacking trivial). RNG inyectable para tests.
- No romper etapas previas. `killMob` conserva su comportamiento de muerte/EXP; el drop es aditivo.

---

## File Structure

```
shared/src/items.ts               (NUEVO) ItemTemplate, ITEM_TEMPLATES, getItem; DropEntry, DROP_TABLES, rollDrops (puro); addToInventory (puro); PICKUP_RANGE, DROP_DESPAWN_MS
shared/src/items.test.ts          (NUEVO)
shared/src/index.ts               (MODIFICAR) export items

server/src/state/DroppedItemState.ts   (NUEVO) Schema {x,z,itemTemplateId,qty} + server-only despawnMs
server/src/state/InventoryItemState.ts (NUEVO) Schema {itemTemplateId, qty}
server/src/state/GameState.ts          (MODIFICAR) droppedItems: MapSchema<DroppedItemState>
server/src/state/PlayerState.ts        (MODIFICAR) inventory: MapSchema<InventoryItemState>
server/src/rooms/GameRoom.ts           (MODIFICAR) killMob dropea loot; tick despawnea + auto-pickup

client/src/render/GroundItems.ts   (NUEVO) render de ítems del piso (mesh por ítem, color por tipo)
client/src/render/InventoryPanel.ts(NUEVO) panel HTML (tecla "i") con ítems + cantidades del self
client/src/net/NetworkClient.ts    (MODIFICAR) suscribe droppedItems (add/remove); getSelf expone inventory
client/src/main.ts                 (MODIFICAR) wire GroundItems + InventoryPanel
```

---

### Task 1: Shared — ítems, drop tables, rollDrops e inventario (puro, TDD)

**Files:**
- Create: `shared/src/items.ts`, `shared/src/items.test.ts`
- Modify: `shared/src/index.ts`

**Interfaces:**
- Produces:
  - `interface ItemTemplate { id: string; name: string; type: "material" | "currency" | "consumable"; stackable: boolean }`; `ITEM_TEMPLATES: Record<string, ItemTemplate>` (bone/gold/health_potion, todos stackable); `getItem(id): ItemTemplate` (lanza si falta).
  - `interface DropEntry { itemTemplateId: string; chance: number; qtyMin: number; qtyMax: number }`; `DROP_TABLES: Record<string, DropEntry[]>` (por templateId de mob).
  - `interface DropResult { itemTemplateId: string; qty: number }`; `rollDrops(templateId: string, rng: () => number): DropResult[]` — por cada entry de la tabla, si `rng() < chance` agrega `{itemTemplateId, qty}` con `qty = qtyMin + Math.floor(rng() * (qtyMax - qtyMin + 1))`. Devuelve `[]` si el mob no tiene tabla.
  - `addToInventory(inv: Map<string, number>, itemTemplateId: string, qty: number): void` — suma `qty` a la entrada existente o la crea (stacking; todos los ítems v1 son stackables).
  - `PICKUP_RANGE = 2.5`, `DROP_DESPAWN_MS = 60000`.

- [ ] **Step 1: Escribir el test que falla (`items.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { getItem, ITEM_TEMPLATES, rollDrops, addToInventory, DROP_TABLES } from "./items.js";

describe("items", () => {
  it("getItem devuelve el template y lanza si falta", () => {
    expect(getItem("gold").type).toBe("currency");
    expect(() => getItem("excalibur")).toThrow();
  });
});

describe("rollDrops", () => {
  it("con rng=0 (siempre < chance) dropea todas las entries de la tabla", () => {
    const drops = rollDrops("skeleton_minion", () => 0);
    const ids = drops.map((d) => d.itemTemplateId);
    for (const e of DROP_TABLES["skeleton_minion"]) expect(ids).toContain(e.itemTemplateId);
    for (const d of drops) expect(d.qty).toBeGreaterThanOrEqual(1);
  });
  it("con rng=0.99 (>= toda chance < 1) no dropea lo que no es seguro", () => {
    const drops = rollDrops("skeleton_minion", () => 0.99);
    // gold del minion tiene chance 0.8 → 0.99 no pasa; bone 0.5 → tampoco
    expect(drops.length).toBe(0);
  });
  it("mob sin tabla dropea vacío", () => {
    expect(rollDrops("dragon", () => 0)).toEqual([]);
  });
});

describe("addToInventory", () => {
  it("crea y luego stackea por itemTemplateId", () => {
    const inv = new Map<string, number>();
    addToInventory(inv, "gold", 5);
    addToInventory(inv, "gold", 3);
    addToInventory(inv, "bone", 1);
    expect(inv.get("gold")).toBe(8);
    expect(inv.get("bone")).toBe(1);
  });
});
```

- [ ] **Step 2: Correr → FAIL.** `npm test --workspace @aden/shared`.

- [ ] **Step 3: Implementar `shared/src/items.ts`**

```ts
export interface ItemTemplate {
  id: string;
  name: string;
  type: "material" | "currency" | "consumable";
  stackable: boolean;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  gold: { id: "gold", name: "Oro", type: "currency", stackable: true },
  bone: { id: "bone", name: "Hueso", type: "material", stackable: true },
  health_potion: { id: "health_potion", name: "Poción de Vida", type: "consumable", stackable: true },
};

export function getItem(id: string): ItemTemplate {
  const t = ITEM_TEMPLATES[id];
  if (!t) throw new Error(`getItem: ítem desconocido ${id}`);
  return t;
}

export interface DropEntry {
  itemTemplateId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
}

export const DROP_TABLES: Record<string, DropEntry[]> = {
  skeleton_minion: [
    { itemTemplateId: "gold", chance: 0.8, qtyMin: 1, qtyMax: 5 },
    { itemTemplateId: "bone", chance: 0.5, qtyMin: 1, qtyMax: 2 },
  ],
  skeleton_warrior: [
    { itemTemplateId: "gold", chance: 1.0, qtyMin: 3, qtyMax: 10 },
    { itemTemplateId: "bone", chance: 0.7, qtyMin: 1, qtyMax: 3 },
    { itemTemplateId: "health_potion", chance: 0.15, qtyMin: 1, qtyMax: 1 },
  ],
};

export interface DropResult {
  itemTemplateId: string;
  qty: number;
}

export function rollDrops(templateId: string, rng: () => number): DropResult[] {
  const table = DROP_TABLES[templateId];
  if (!table) return [];
  const out: DropResult[] = [];
  for (const e of table) {
    if (rng() < e.chance) {
      const qty = e.qtyMin + Math.floor(rng() * (e.qtyMax - e.qtyMin + 1));
      out.push({ itemTemplateId: e.itemTemplateId, qty });
    }
  }
  return out;
}

export function addToInventory(inv: Map<string, number>, itemTemplateId: string, qty: number): void {
  inv.set(itemTemplateId, (inv.get(itemTemplateId) ?? 0) + qty);
}

export const PICKUP_RANGE = 2.5;
export const DROP_DESPAWN_MS = 60000;
```

- [ ] **Step 4: `index.ts`** — `export * from "./items.js";`.

- [ ] **Step 5: Correr → PASS.**

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat(shared): ítems, drop tables, rollDrops y addToInventory"
```

---

### Task 2: Server — schemas de ítems en piso e inventario

**Files:**
- Create: `server/src/state/DroppedItemState.ts`, `server/src/state/InventoryItemState.ts`
- Modify: `server/src/state/GameState.ts`, `server/src/state/PlayerState.ts`

**Interfaces:**
- `DroppedItemState extends Schema`: `@type("number") x, z`; `@type("string") itemTemplateId`; `@type("number") qty`; plano server-only `despawnMs = 0`.
- `InventoryItemState extends Schema`: `@type("string") itemTemplateId`; `@type("number") qty`.
- `GameState` agrega `@type({ map: DroppedItemState }) droppedItems = new MapSchema<DroppedItemState>()`.
- `PlayerState` agrega `@type({ map: InventoryItemState }) inventory = new MapSchema<InventoryItemState>()` (keyed por itemTemplateId).

- [ ] **Step 1:** Crear `DroppedItemState.ts` e `InventoryItemState.ts`.
- [ ] **Step 2:** Modificar `GameState.ts` (droppedItems) y `PlayerState.ts` (inventory).
- [ ] **Step 3:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes).
- [ ] **Step 4: Commit**
```bash
git add server/
git commit -m "feat(server): schemas de ítems en piso e inventario"
```

---

### Task 3: Server — drop de loot en killMob + despawn + auto-pickup

**Files:** Modify: `server/src/rooms/GameRoom.ts`

**Interfaces:**
- Consumes: `rollDrops`, `getItem`, `addToInventory`, `PICKUP_RANGE`, `DROP_DESPAWN_MS` de `@aden/shared`; `distance2D`.

- [ ] **Step 1: Drop en `killMob`** — al matar el mob (tras el EXP), rodar el loot y crear ítems en el piso en la posición del mob:
```ts
// dentro de killMob, después del bloque de EXP:
for (const d of rollDrops(mob.templateId, Math.random)) {
  const item = new DroppedItemState();
  item.itemTemplateId = d.itemTemplateId;
  item.qty = d.qty;
  item.x = mob.x + (Math.random() - 0.5) * 1.5; // pequeño scatter
  item.z = mob.z + (Math.random() - 0.5) * 1.5;
  item.despawnMs = DROP_DESPAWN_MS;
  this.state.droppedItems.set(`${mobId}_${d.itemTemplateId}_${this.dropSeq++}`, item);
}
```
(Agregar un contador `private dropSeq = 0` en la sala para ids únicos.)
- [ ] **Step 2: Tick — despawn de ítems viejos** — `this.state.droppedItems.forEach((it, id) => { it.despawnMs -= dtMs; if (it.despawnMs <= 0) this.state.droppedItems.delete(id); })`.
- [ ] **Step 3: Tick — auto-pickup por proximidad** — para cada jugador vivo, si hay un ítem del piso a ≤ `PICKUP_RANGE`, levantarlo: agregar al inventario del jugador (stacking) y borrar el ítem del piso. Reusar `addToInventory` sobre un `Map` derivado del `MapSchema` NO es directo (el inventario es un MapSchema de `InventoryItemState`); implementar el stacking sobre el MapSchema: si existe la entrada `inventory.get(itemTemplateId)` sumar `qty`, si no crear un `InventoryItemState`. (Opcional: un helper local `addItemToPlayer(player, itemTemplateId, qty)` que encapsule eso; `addToInventory` puro queda para tests, la versión sobre schema es análoga.)
```ts
this.state.players.forEach((p) => {
  if (p.dead) return;
  this.state.droppedItems.forEach((it, id) => {
    if (distance2D(p.x, p.z, it.x, it.z) <= PICKUP_RANGE) {
      const existing = p.inventory.get(it.itemTemplateId);
      if (existing) existing.qty += it.qty;
      else { const inv = new InventoryItemState(); inv.itemTemplateId = it.itemTemplateId; inv.qty = it.qty; p.inventory.set(it.itemTemplateId, inv); }
      this.state.droppedItems.delete(id);
    }
  });
});
```
- [ ] **Step 4:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes). Boot OK.
- [ ] **Step 5: Commit**
```bash
git add server/
git commit -m "feat(server): drop de loot, despawn y auto-pickup por proximidad"
```

---

### Task 4: Client — render de ítems en el piso

**Files:** Create: `client/src/render/GroundItems.ts`; Modify: `client/src/net/NetworkClient.ts`, `client/src/main.ts`

**Interfaces:**
- `GroundItems` (Three.js): `add(id, itemTemplateId, x, z)` crea un mesh chico (color por tipo de ítem: gold dorado, bone gris, potion rojo) flotando/rotando en `x,z`; `remove(id)`; `update(dt)` (rotación/bob suave).
- `NetworkClient`: suscribe `state.droppedItems.onAdd/onRemove` → callbacks `onItemAdd(id, itemTemplateId, x, z)`, `onItemRemove(id)`.

- [ ] **Step 1:** `GroundItems.ts` — mesh por ítem (p.ej. `BoxGeometry(0.4)` o `OctahedronGeometry`), color según `getItem(itemTemplateId).type`, y2≈0.5, rotación en `update(dt)`.
- [ ] **Step 2:** `NetworkClient` — callbacks de droppedItems (mirror del patrón de mobs).
- [ ] **Step 3:** `main.ts` — instanciar `GroundItems`, wire add/remove, `groundItems.update(dt)` en el loop.
- [ ] **Step 4:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 5: Smoke** — matar un mob dropea ítems visibles en el piso; caminar sobre ellos los hace desaparecer (auto-pickup, verificable por estado: se remueven de droppedItems y aparecen en inventory). Consola limpia.
- [ ] **Step 6: Commit**
```bash
git add client/src
git commit -m "feat(client): render de ítems en el piso"
```

---

### Task 5: Client — panel de inventario

**Files:** Create: `client/src/render/InventoryPanel.ts`; Modify: `client/src/input/SkillInput.ts` (o un input propio), `client/src/main.ts`, `client/src/net/NetworkClient.ts`

**Interfaces:**
- `InventoryPanel` (HTML overlay, oculto por defecto): `toggle()` muestra/oculta; `update(entries: {itemTemplateId, qty, name}[])` lista los ítems con su nombre (`getItem().name`) y cantidad.
- Input: tecla "i" → `toggle()`. `NetworkClient.getSelf` expone el inventario (o main lee `state.players.get(sessionId).inventory`).

- [ ] **Step 1:** `InventoryPanel.ts` — contenedor `position:fixed; right:12px; top:12px; display:none` con título "Inventario" y una lista; `toggle()` alterna display; `update(entries)` re-renderiza la lista (nombre + xCantidad).
- [ ] **Step 2:** Input tecla "i" — agregar un listener (en SkillInput o un pequeño handler en main) que llame `panel.toggle()`. Evitar conflicto con otras teclas.
- [ ] **Step 3:** `main.ts` — cada frame (o al abrir), leer el inventario del self del estado y `panel.update(...)` con `{itemTemplateId, qty, name: getItem(itemTemplateId).name}`.
- [ ] **Step 4:** `npx tsc --noEmit -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 5: Smoke** — apretar "i" abre/cierra el panel; tras juntar loot, el panel lista los ítems con cantidades correctas (verificable por DOM/estado). Consola limpia.
- [ ] **Step 6: Commit**
```bash
git add client/src
git commit -m "feat(client): panel de inventario (tecla i)"
```

---

### Task 6: Verificación E2E (controller)

- [ ] **Step 1: Script 2 clientes** — A mata mobs; verificar por estado: aparecen entradas en `state.droppedItems` en la posición del mob; A camina sobre ellas y (tick de auto-pickup) desaparecen de `droppedItems` y aparecen/stackean en `A.inventory` con la cantidad correcta; los ítems no recogidos se despawnean tras `DROP_DESPAWN_MS` (se puede verificar con un despawn más corto si hace falta, o solo el pickup). Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — carga sin errores; los ítems del piso cargan/renderizan sin excepción. (Visual —ítems y panel— queda para el usuario.)

---

## Self-Review (cobertura vs spec)

- **Drop tables por mob (spec §4 Loot):** Tasks 1,3 (DROP_TABLES + rollDrops + killMob).
- **Ítem cae al piso → pickup → inventario (spec §4):** Tasks 2,3 (DroppedItemState + auto-pickup + inventory).
- **Inventario:** Tasks 2,5 (schema + panel).
- **Render de loot:** Task 4.
- **Server autoritativo:** drops/pickup/inventario 100% server; cliente muestra estado.
- **Fuera de alcance:** persistencia (Supabase, Etapa 3c); equipar ítems / usar consumibles (futuro); pickup manual (v1 usa auto-pickup por proximidad).

**Placeholder scan:** el código con lógica está completo; los steps de integración describen el cambio con precisión (incl. la nota de stacking sobre MapSchema vs `addToInventory` puro).
**Type consistency:** `rollDrops`/`DropResult`/`getItem`/`addToInventory`/`PICKUP_RANGE`/`DROP_DESPAWN_MS` compartidos; `DroppedItemState`/`InventoryItemState` schemas del server; el cliente lee `droppedItems`/`inventory` sincronizados.
