# Etapa C — Fragua de los Primeros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el capítulo 2 con el segundo mapa (Fragua de los Primeros, niveles 20–25): capítulo que abre Brenna, Ysolde, Halden redimido con contratos repetibles, Vharzul (jefe nivel 25) con yunques que forjan guardianes y se pueden enfriar, aprendizaje de la skill de nivel 25 antes del jefe, epílogo con Dorne y un élite de nivel 30 como anticipo.

**Architecture:** Igual que la etapa B: el contenido es datos en `@aden/shared`. La única mecánica nueva del server es "enfriar" objetos de un encuentro (`EncounterDef.coolObjects`): mientras el jefe pelea, enfriar un yunque lo apaga (deja de invocar) hasta que el encuentro termine o se reinicie; si el jefe está canalizando, un yunque todavía activo además lo interrumpe (reusa `interruptObjects`). El simulador aprende a interrumpir canalizaciones con esos objetos.

**Tech Stack:** TypeScript (npm workspaces), Colyseus 0.15, Three.js 0.160, Vitest 1.6, tsx.

**Spec:** `docs/superpowers/specs/2026-09-25-fragua-antigua-design.md` (§3–§8, etapa C de §11).

## Global Constraints

- Rama: `fragua-forja`. No hacer push ni merge sin OK explícito del usuario.
- Sin migraciones de Supabase. Sin campos `@type` nuevos (el estado `cooled` del objeto es server-only).
- Las armas/accesorios nuevos van en `ITEM_TEMPLATES` (`shared/src/items.ts`); el catálogo es cerrado.
- Tiendas: solo equipo básico (regla existente, protegida por test). Botín de catálogo de un mapa: `requiredLevel ≤ levelMax + 1` (26 para la Fragua).
- Cambios de expectativa permitidos en tests existentes: `chapters.test.ts` (se suma el capítulo `forge`; `chapterAfter(MINES_COMPLETE)` deja de ser null), `MapDressing.test.ts` (la Fragua usa escenografía propia).
- Estilo: igual al código vecino. Los archivos tienen finales de línea mixtos: editar con el Edit tool o con un helper que tolere CRLF/LF.
- Verificación de cada tarea: `npm test` (raíz) + los tres `npx tsc -p <pkg>/tsconfig.json --noEmit`.
- Commits en inglés, conventional, con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Datos del mapa (referencia)

Mapa `fragua`: centro (1500, 450), bounds x 1435–1565 / z 385–515, spawn (1500, 500). Camino norte-sur en x = 1500. La arena de Vharzul está al norte.

| Elemento | Posición |
|---|---|
| Ysolde / Halden (NPC) | (1494, 494) / (1506, 494) |
| Lava (no transitable) | oeste (1468, 462) 10×24; este (1532, 462) 10×24; paso oeste (1473, 432) 24×5; paso este (1527, 432) 24×5 — queda libre x 1485–1515 |
| Pilares rúnicos | `forge_rune_1` (1480, 484), `forge_rune_2` (1520, 484), `forge_rune_3` (1500, 446) |
| Yunques de la arena | `forge_anvil_1` (1489, 400), `forge_anvil_2` (1511, 400), `forge_anvil_3` (1500, 408) |
| Cofre / barriles | `fragua_chest` (1446, 400); barriles (1512, 488), (1488, 488) |

| Spawn | Template | Centro | Radio | Cantidad |
|---|---|---|---:|---:|
| `forge_imps_west` / `_east` | `ember_imp` | (1458, 488) / (1542, 488) | 4 | 5 + 5 |
| `forge_drakes_west` / `_east` | `young_drake` | (1452, 452) / (1548, 452) | 4 | 3 + 3 |
| `forge_constructs_west` / `_east` | `forge_construct` | (1466, 416) / (1534, 416) | 4 | 3 + 3 |
| `forge_smelter` | `primal_smelter` | (1500, 420) | 0 | 1 |
| `forge_vharzul` | `vharzul` | (1500, 396) | 0 | 1 |
| `forge_wyrm` | `magma_wyrm` | (1555, 395) | 0 | 1 |

Ruta de EXP verificada (desde 21 + 219 tras Halden): imps a nivel 21, dracos 22, guardianes 23, fundidor 24; el nivel 25 llega al entregar `f_anvil_3` (antes de Vharzul); termina en 26.

---

### Task 1: Mapa y enemigos

**Files:**
- Create: `shared/src/forge.ts` (constantes; misiones en Task 2), `shared/src/forge.test.ts`
- Modify: `shared/src/world.ts`, `shared/src/mobs.ts`, `shared/src/combat.ts`, `shared/src/progression.ts`, `shared/src/items.ts` (DROP_TABLES), `shared/src/adventure.ts` (POOLS), `shared/src/encounters.ts`, `shared/src/structures.ts`, `shared/src/index.ts`, `client/src/audio/score.ts`, `client/src/render/textures.ts`, `client/src/render/Environment.ts`, `client/src/render/MapDressing.test.ts`

**Interfaces:**
- Produces: zona `fragua`; `FORGE_LAVA`, `FORGE_ANVILS` (ids), `FORGE_RUNES` (ids), `FORGE_ARENA` desde `@aden/shared`; templates `ember_imp`, `young_drake`, `forge_construct`, `primal_smelter`, `forged_guardian`, `vharzul`, `magma_wyrm`; encuentros `primal_smelter`, `vharzul` (requiresQuest `'f_vharzul'`, invoca `forged_guardian` desde `FORGE_ANVILS`), `magma_wyrm`.

- [ ] **Step 1: Test del mapa (falla)** — `shared/src/forge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { FORGE_LAVA, FORGE_ANVILS, FORGE_ARENA } from './forge.js';

const FORGE_MOBS = ['ember_imp', 'young_drake', 'forge_construct', 'primal_smelter', 'vharzul', 'magma_wyrm'];

describe('Fragua de los Primeros: mapa y enemigos', () => {
  it('opens a level 20 map that does not overlap others', () => {
    const zone = getZone('fragua');
    expect(canEnterZone(zone, 19)).toBe(false); expect(canEnterZone(zone, 20)).toBe(true);
    for (const other of ZONES.filter(z => z.id !== 'fragua')) {
      const a = zone.bounds, b = other.bounds;
      expect(a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ).toBe(true);
    }
  });
  it('defines every enemy with a fixed level, stats, EXP and loot', () => {
    for (const id of FORGE_MOBS) { expect(MOB_TEMPLATES[id], id).toBeDefined(); expect(getMobCombat(id).maxHp).toBeGreaterThan(0); expect(getMobExp(id)).toBeGreaterThan(0); }
    expect(FORGE_MOBS.map(id => MOB_TEMPLATES[id].level)).toEqual([21, 22, 23, 24, 25, 30]);
    expect(MOB_TEMPLATES.vharzul).toMatchObject({ rank: 'boss', boss: true });
    expect(getMobCombat('forged_guardian').maxHp).toBeGreaterThan(0);
  });
  it('places spawns, anvils and the arena on reachable ground and keeps lava solid', () => {
    const zone = getZone('fragua');
    for (const s of SPAWN_ZONES.filter(s => s.mapId === 'fragua')) {
      const at = { x: s.centerX, z: s.centerZ };
      expect(isWalkable('fragua', at), s.id).toBe(true);
      expect(findPath('fragua', zone.spawn, at).length, s.id).toBeGreaterThan(0);
    }
    expect(isWalkable('fragua', FORGE_ARENA)).toBe(true);
    for (const lava of FORGE_LAVA) expect(isWalkable('fragua', lava)).toBe(false);
    expect(FORGE_ANVILS).toHaveLength(3);
  });
  it('gives Vharzul a breath cone, embers, an anvil-interruptible channel and anvil reinforcements', () => {
    const v = getEncounter('vharzul')!;
    expect(v.requiresQuest).toBe('f_vharzul');
    expect(v.patterns.map(p => p.shape)).toEqual(['cone', 'circle']);
    const channel = v.belowHalf!.patterns!.find(p => p.channel)!;
    expect(channel.interruptObjects).toEqual(FORGE_ANVILS);
    expect(v.summons).toEqual([{ templateId: 'forged_guardian', everyMs: 15000, fromObjects: FORGE_ANVILS, maxAlive: 1 }]);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/forge.test.ts` (shared) → FAIL.

- [ ] **Step 3: Constantes y zona** — `shared/src/forge.ts`:

```ts
/** Fragua de los Primeros (Acto II · cap. 2, niveles 20–25). Lugares de referencia del mapa. */
export const FORGE_LAVA = [
  { x: 1468, z: 462, width: 10, depth: 24 },
  { x: 1532, z: 462, width: 10, depth: 24 },
  { x: 1473, z: 432, width: 24, depth: 5 },
  { x: 1527, z: 432, width: 24, depth: 5 },
] as const;
/** Centro de la arena de Vharzul. */
export const FORGE_ARENA = { x: 1500, z: 396 } as const;
export const FORGE_ANVILS: readonly string[] = ['forge_anvil_1', 'forge_anvil_2', 'forge_anvil_3'];
export const FORGE_RUNES: readonly string[] = ['forge_rune_1', 'forge_rune_2', 'forge_rune_3'];
```

`index.ts`: `export * from './forge.js';`. `world.ts`, antes de `cripta`:

```ts
  {
    id: 'fragua', name: 'Fragua de los Primeros', subtitle: 'Donde nacieron las dos llamas',
    center: { x: 1500, z: 450 }, bounds: boundsAround(1500, 450), spawn: { x: 1500, z: 500 },
    levelReq: 20, levelMin: 20, levelMax: 25, safe: false,
    biome: { ground: 0x3a2d28, fog: 0x5a3a2c, fogNear: 30, fogFar: 120, accent: 0xff7a3c },
  },
```

- [ ] **Step 4: Enemigos** (valores iniciales; la Task 4 los calibra)

`mobs.ts` → `MOB_TEMPLATES`:

```ts
  ember_imp: { id: 'ember_imp', level: 21, rank: 'normal', name: 'Imp de Brasa', model: 'InfernalDemon', scale: 0.7, tint: 0xff8a4c },
  young_drake: { id: 'young_drake', level: 22, rank: 'normal', name: 'Draco Joven', model: 'AncientDrake', scale: 0.8, tint: 0xc4744a },
  forge_construct: { id: 'forge_construct', level: 23, rank: 'normal', name: 'Guardián Forjado', model: 'BoneWarden', tint: 0xd08a5a },
  primal_smelter: { id: 'primal_smelter', level: 24, rank: 'elite', name: 'Fundidor Primordial', model: 'InfernalDemon', miniBoss: true, scale: 1.5, tint: 0xff5a2a, respawnMs: 45000 },
  forged_guardian: { id: 'forged_guardian', level: 23, rank: 'normal', name: 'Guardián de Yunque', model: 'BoneWarden', tint: 0xe0a060 },
  vharzul: { id: 'vharzul', level: 25, rank: 'boss', name: 'Vharzul, Dragón de la Fragua', model: 'AncientDrake', boss: true, scale: 2.6, tint: 0xff7a3c, respawnMs: 60000 },
  magma_wyrm: { id: 'magma_wyrm', level: 30, rank: 'elite', name: 'Sierpe de Magma', model: 'AncientDrake', miniBoss: true, scale: 1.3, tint: 0x9a2a1a, respawnMs: 60000 },
```

`SPAWN_ZONES` (según la tabla de datos): `forge_imps_west`, `forge_imps_east`, `forge_drakes_west`, `forge_drakes_east`, `forge_constructs_west`, `forge_constructs_east`, `forge_smelter`, `forge_vharzul`, `forge_wyrm` con `mapId: 'fragua'` (el `forged_guardian` no tiene spawn: solo lo invocan los yunques).

`combat.ts` → `MOB_COMBAT`:

```ts
  ember_imp: { maxHp: 1600, pAtk: 118, pDef: 60, attackCooldownMs: 2200 },
  young_drake: { maxHp: 1750, pAtk: 124, pDef: 64, attackCooldownMs: 2400 },
  forge_construct: { maxHp: 1900, pAtk: 130, pDef: 68, attackCooldownMs: 2600 },
  primal_smelter: { maxHp: 4800, pAtk: 138, pDef: 70, attackCooldownMs: 2600 },
  forged_guardian: { maxHp: 1500, pAtk: 120, pDef: 62, attackCooldownMs: 2600 },
  vharzul: { maxHp: 12000, pAtk: 150, pDef: 76, attackCooldownMs: 2400 },
  magma_wyrm: { maxHp: 14000, pAtk: 200, pDef: 95, attackCooldownMs: 2800 },
```

`progression.ts` → `MOB_EXP`: `ember_imp: 900, young_drake: 1000, forge_construct: 1100, primal_smelter: 2400, vharzul: 4500, magma_wyrm: 5000,`

`items.ts` → `DROP_TABLES`:

```ts
  ember_imp: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 60, qtyMax: 90 }],
  young_drake: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 65, qtyMax: 95 }, { itemTemplateId: 'greater_potion', chance: 0.12, qtyMin: 1, qtyMax: 1 }],
  forge_construct: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 70, qtyMax: 105 }, { itemTemplateId: 'ember_core', chance: 0.3, qtyMin: 1, qtyMax: 1 }],
  primal_smelter: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 200, qtyMax: 300 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 }],
  vharzul: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 400, qtyMax: 600 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 3, qtyMax: 4 }, { itemTemplateId: 'ember_core', chance: 1, qtyMin: 3, qtyMax: 5 }],
  magma_wyrm: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 500, qtyMax: 700 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 3, qtyMax: 4 }],
  chest_fragua: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 180, qtyMax: 280 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 1, qtyMax: 2 }],
```

`adventure.ts` → `POOLS.fragua` (todo ≤ nivel 26):

```ts
  fragua: {
    ember_imp: ['aden_guantes_de_el_bastion_de_ceniza', 'aden_guantes_de_el_enigma_de_umbra', 'aden_guantes_de_el_vendaval_gris'],
    young_drake: ['aden_botas_de_el_bastion_de_ceniza', 'aden_botas_de_el_enigma_de_umbra', 'aden_botas_de_el_vendaval_gris'],
    forge_construct: ['aden_yelmo_de_el_bastion_de_ceniza', 'aden_yelmo_de_el_enigma_de_umbra', 'aden_yelmo_de_el_vendaval_gris'],
    primal_smelter: ['aden_filo_de_brasa_viva', 'aden_hacha_de_guerra_de_aden', 'aden_vara_de_la_mirada_petrea', 'aden_paves_de_la_muralla'],
    vharzul: ['aden_sable_del_astronomo', 'aden_asta_de_doble_luna', 'aden_egida_de_la_sierpe', 'aden_ballesta_del_rayo_blanco'],
    magma_wyrm: ['aden_egida_de_la_sierpe'],
    chest_fragua: ['aden_grebas_de_el_bastion_de_ceniza', 'aden_grebas_de_el_enigma_de_umbra', 'aden_grebas_de_el_vendaval_gris'],
  },
```

- [ ] **Step 5: Encuentros** — `encounters.ts` (importar `FORGE_ANVILS` desde `./forge.js`), dentro de `ENCOUNTERS`:

```ts
  primal_smelter: { templateId: 'primal_smelter', aggroRadius: 14, cooldownMs: 7000, patterns: [circle(6, 1800, 2.4)] },
  vharzul: {
    templateId: 'vharzul', aggroRadius: 16, cooldownMs: 6000, requiresQuest: 'f_vharzul',
    patterns: [{ shape: 'cone', anchor: 'self', radius: 9, angleDeg: 70, windupMs: 1800, power: 2.8 }, circle(5, 1600, 2.4)],
    belowHalf: { cooldownMs: 5000, patterns: [
      { shape: 'cone', anchor: 'self', radius: 9, angleDeg: 70, windupMs: 1800, power: 2.8 }, circle(5, 1600, 2.4),
      { shape: 'circle', anchor: 'self', radius: 14, windupMs: 6000, power: 3.2, channel: true,
        interruptObjects: FORGE_ANVILS, interruptCooldownMs: 9000, interruptStunMs: 3000,
        interruptTexts: { success: '¡Cortaste el aliento de la Fragua! Vharzul quedó aturdido.', tooWeak: 'El yunque no responde a tu poder actual.', idle: 'El yunque late con el pulso del dragón.' } },
    ] },
    summons: [{ templateId: 'forged_guardian', everyMs: 15000, fromObjects: FORGE_ANVILS, maxAlive: 1 }],
  },
  magma_wyrm: { templateId: 'magma_wyrm', aggroRadius: 10, cooldownMs: 8000, patterns: [circle(6, 1800, 2.6)] },
```

- [ ] **Step 6: Geometría** — `structures.ts`:
- Importar `FORGE_LAVA` desde `./forge.js`.
- Sumar `&& z.id !== 'fragua'` al filtro del loop de landmarks genéricos y `|| zone.id === 'fragua'` al primer `if` de `dressingLayout`.
- Junto al bloque de las Minas:

```ts
// Fragua de los Primeros: tiendas del campamento y pilares de basalto alrededor de la arena.
for (const dx of [-20, 20]) {
  box('fragua', `forge-tent-${dx}`, 1500 + dx, 1.2, 504, 4, 2.4, 3.5, 'cloth');
  box('fragua', `forge-tent-pole-${dx}`, 1500 + dx, 1.6, 506, 0.2, 3.2, 0.2, 'timber', false);
}
for (const [dx, dz] of [[-17, -6], [17, -6], [-15, 10], [15, 10]]) box('fragua', `forge-arena-pillar-${dx}-${dz}`, 1500 + dx, 3.5, 396 + dz, 2.4, 7, 2.4, 'stone');
```

- Obstáculos: `for (const [i, lava] of FORGE_LAVA.entries()) obstacles.push({ ...lava, id: \`forge-lava-${i}\`, mapId: 'fragua', rotation: 0 });`

- [ ] **Step 7: Cliente mínimo**
- `score.ts` → `SOUNDTRACKS.fragua`: `{ id: 'fragua', title: 'El corazón de la Fragua', description: 'Tambores, trompas y coro sobre la lava', bpm: 76, meter: 4, tonic: 41, scale: [0, 1, 4, 5, 7, 8, 10], chords: [0, 3, 5, 4, 0, 6, 5, 0], lead: 'horn', pad: 'choir', pluck: 'bell', motifs: [[[0, 0, 1], [1, 1, .5], [1.5, 4, 1.5], [4, 5, 1], [5, 4, 2]], [[0, 7, 1.5], [2, 5, 1], [3, 4, 1], [4, 1, 2]], [[.5, 4, 1], [1.5, 5, 1], [2.5, 7, 1.5], [5, 5, 2]], [[0, 0, 2], [3, -1, 1], [4, 0, 1], [6, 1, 1.5]]], reverb: 2.8, wind: .2, windHz: 300, percussion: .35 }`
- `textures.ts` → `terrainMat`: `fragua: "cracked"` y color `zone === 'fragua' ? 0x5a4640 : ...`.
- `Environment.ts` → `SUN_INTENSITY.fragua = 0.95`.
- `MapDressing.test.ts`: sumar `|| zone.id === 'fragua'` a la excepción de escenografía propia.

- [ ] **Step 8:** `npm test` + tres `tsc` → verde. **Step 9: Commit** `feat: add the Forge of the First map and its enemies`.

---

### Task 2: Capítulo, misiones, NPC, contratos, ítems y yunques que se enfrían

**Files:**
- Modify: `shared/src/forge.ts`, `shared/src/forge.test.ts`, `shared/src/quests.ts`, `shared/src/chapters.ts`, `shared/src/chapters.test.ts`, `shared/src/campaignNpcs.test.ts`, `shared/src/npcs.ts`, `shared/src/worldobjects.ts`, `shared/src/items.ts`, `shared/src/sideChains.ts`, `shared/src/encounters.ts`, `server/src/state/WorldObjectState.ts`, `server/src/rooms/GameRoom.ts`, `client/src/main.ts`
- Create: `server/src/rooms/ForgeCampaign.test.ts`

**Interfaces:**
- Produces: `FORGE_QUESTS`, `FORGE_QUEST_ORDER`, `FORGE_COMPLETE = 'forge_complete'`; capítulo `forge` (lo abre Brenna desde `MINES_COMPLETE` a nivel 20; `mapGates.fragua.from = 'f_caldera'`); NPC `ysolde` (role elder) y `halden_npc` (role smith, cadena repetible `halden`); ítems `ember_dagger`, `vharzul_heart`; `EncounterDef.coolObjects?: readonly string[]` y `coolTexts?: { success; tooWeak; idle }`; `encounterCoolFor(objectId): { templateId: string; texts } | null`; `WorldObjectState.cooled` (server-only).

- [ ] **Step 1: Tests de datos (fallan)** — agregar a `forge.test.ts`:

```ts
import { FORGE_QUEST_ORDER, FORGE_COMPLETE } from './forge.js';
import { MINES_COMPLETE } from './mines.js';
import { getQuest } from './quests.js';
import { chapterAfter, mapGate, nextQuestId } from './chapters.js';
import { getNpc } from './npcs.js';
import { getWorldObject } from './worldobjects.js';
import { getItem } from './items.js';
import { questReward } from './adventure.js';
import { expToNextLevel } from './progression.js';
import { getSideChain } from './sideChains.js';
import { encounterCoolFor } from './encounters.js';
import { learnedSkillIds } from './classes.js';

describe('Fragua de los Primeros: capítulo', () => {
  it('starts from the Mines ending through Brenna at level 20 and gates the map', () => {
    expect(chapterAfter(MINES_COMPLETE)).toMatchObject({ id: 'forge', start: { npcId: 'brenna', minLevel: 20 } });
    expect(mapGate('fragua')!.from).toBe('f_caldera');
    expect(nextQuestId(FORGE_QUEST_ORDER[FORGE_QUEST_ORDER.length - 1])).toBe(FORGE_COMPLETE);
  });
  it('delivers to Ysolde, except the dragon, which Dorne receives in Aden', () => {
    for (const id of FORGE_QUEST_ORDER) {
      const q = getQuest(id);
      expect(q.mapId).toBe('fragua');
      expect(q.returnNpcId).toBe(id === 'f_vharzul' ? 'smith' : 'ysolde');
      if (q.objective === 'interact') expect(findPath('fragua', getZone('fragua').spawn, getWorldObject(q.targetId!)).length).toBeGreaterThan(0);
      if (q.objective === 'kill') expect(MOB_TEMPLATES[q.mobTemplateId]).toBeDefined();
    }
    for (const id of ['ysolde', 'halden_npc']) expect(findPath('fragua', getZone('fragua').spawn, getNpc(id)).length).toBeGreaterThan(0);
  });
  it('learns the level 25 skill on the anvils turn-in, before Vharzul, with usable rewards', () => {
    let level = 21, xp = 219;
    const gates: Record<string, number> = { f_imps: 21, f_drakes: 22, f_constructs: 23, f_smelter: 24, f_vharzul: 25 };
    for (const id of FORGE_QUEST_ORDER) {
      const q = getQuest(id);
      if (gates[id]) expect(level, id).toBeGreaterThanOrEqual(gates[id]);
      if (id === 'f_anvil_3') expect(level).toBe(24);
      if (q.objective === 'kill') xp += getMobExp(q.mobTemplateId) * q.amount;
      xp += q.rewardExp;
      while (xp >= expToNextLevel(level)) { xp -= expToNextLevel(level); level++; }
      for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) {
        const reward = questReward(q, cls); if (!reward) continue;
        const item = getItem(reward);
        expect(item.requiredLevel ?? 1, `${id} ${cls}`).toBeLessThanOrEqual(level);
        if (item.classes) expect(item.classes).toContain(cls);
      }
      if (id === 'f_anvil_3') for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) expect(learnedSkillIds(cls, level)).toHaveLength(5);
    }
    expect(level).toBe(26);
    expect(getItem('vharzul_heart')).toMatchObject({ rarity: 'legendary', slot: 'accessory', requiredLevel: 25 });
  });
  it("offers Halden's repeatable contracts and lets the anvils be cooled", () => {
    expect(getSideChain('halden')).toMatchObject({ npcId: 'halden_npc', kind: 'repeatable', minLevel: 20, announce: true });
    for (const id of ['forge_anvil_1', 'forge_anvil_2', 'forge_anvil_3']) expect(encounterCoolFor(id)?.templateId).toBe('vharzul');
    expect(encounterCoolFor('forge_rune_1')).toBeNull();
  });
});
```

`chapters.test.ts`: la lista de ids pasa a `['act1', 'veil', 'memory', 'mines', 'forge']`; reemplazar `expect(chapterAfter(MINES_COMPLETE)).toBeNull();` por `expect(chapterAfter(MINES_COMPLETE)?.start).toMatchObject({ npcId: 'brenna', minLevel: 20 }); expect(chapterAfter(FORGE_COMPLETE)).toBeNull();` (importando `FORGE_COMPLETE`). `campaignNpcs.test.ts`: agregar `expect(npcFirstAppearance('ysolde')).toBe('f_caldera');` y `'ysolde'` a la lista de NPC de campaña; `'halden_npc'` a los que no lo son.

- [ ] **Step 2:** `npx vitest run` (shared) → FAIL.

- [ ] **Step 3: Misiones** — en `forge.ts` (`import type { Quest } from './quests.js';` arriba):

```ts
export const FORGE_COMPLETE = 'forge_complete';
export const FORGE_QUEST_ORDER = ['f_caldera', 'f_rune_1', 'f_rune_2', 'f_rune_3', 'f_imps', 'f_drakes', 'f_constructs', 'f_smelter', 'f_anvil_1', 'f_anvil_2', 'f_anvil_3', 'f_vharzul'];

function mission(id: string, title: string, objective: Quest['objective'], targetId: string, amount: number, rewardExp: number, rewardGold: number, intro: string, done: string, autoAdvance = false, returnNpcId = 'ysolde'): Quest {
  const back = returnNpcId === 'smith' ? ' Después llevale la noticia a Dorne en Aden.' : ' Volvé con Ysolde en el campamento de la caldera al completar el objetivo.';
  return { id, title, objective, targetId, amount, rewardExp, rewardGold, intro, done, autoAdvance, returnNpcId, mapId: 'fragua',
    mobTemplateId: objective === 'kill' ? targetId : '', hint: `${intro}${autoAdvance ? ' Después seguí el siguiente marcador.' : back}` };
}

export const FORGE_QUESTS: Record<string, Quest> = {
  f_caldera: mission('f_caldera', 'La guardiana de las runas', 'visit', 'fragua', 1, 2500, 300,
    'Halden confesó que despertó a Vharzul, el dragón del que nacieron las dos llamas, para encender la Fragua de los Primeros. Viajá con M a la caldera y buscá a Ysolde, guardiana de las runas, en el campamento del sur.',
    'Soy Ysolde. Mi linaje custodió estas runas desde antes de Aden. Halden está bajo mi custodia: quiere reparar lo que hizo. La Fragua late otra vez, y con ella late el dragón.'),
  f_rune_1: mission('f_rune_1', 'Los pilares de los primeros · oeste', 'interact', 'forge_rune_1', 1, 0, 0,
    'Activá el pilar rúnico del oeste (1480, 484). Las runas de los primeros herreros guardan la forma de contener la llama.', '', true),
  f_rune_2: mission('f_rune_2', 'Los pilares de los primeros · este', 'interact', 'forge_rune_2', 1, 0, 0,
    'Activá el pilar rúnico del este (1520, 484).', '', true),
  f_rune_3: { ...mission('f_rune_3', 'Los pilares de los primeros', 'interact', 'forge_rune_3', 1, 3500, 300,
    'Activá el pilar central, junto al paso de lava (1500, 446).',
    'Los pilares responden: la llama todavía obedece a quien conoce su nombre. Pero cada vez que Vharzul respira, los yunques forjan un guardián nuevo.'), rewardItemId: 'greater_potion', rewardItemQty: 5 },
  f_imps: mission('f_imps', 'Chispas con hambre', 'kill', 'ember_imp', 10, 4000, 350,
    'Los Imps de Brasa se alimentan de las chispas de la caldera, al oeste y al este del campamento. Derrotá a 10 antes de que avisen al dragón.',
    'Menos chispas, menos ojos. Halden dice que los imps nacieron del primer fuego que encendió.'),
  f_drakes: { ...mission('f_drakes', 'La cría del dragón', 'kill', 'young_drake', 6, 4500, 400,
    'Los Dracos Jóvenes anidan junto a los canales de lava, en los extremos oeste y este. Derrotá a 6: son la cría de Vharzul.',
    'La cría duerme otra vez. Tomá esta coraza de las reservas de la Hermandad; Halden la templó para quien tuviera que llegar hasta aquí.'),
    rewardByClass: { knight: 'aden_coraza_de_el_bastion_de_ceniza', barbarian: 'aden_coraza_de_el_bastion_de_ceniza', mage: 'aden_coraza_de_el_enigma_de_umbra', rogue: 'aden_coraza_de_el_vendaval_gris', ranger: 'aden_coraza_de_el_vendaval_gris' } },
  f_constructs: mission('f_constructs', 'Nombres en el hierro', 'kill', 'forge_construct', 6, 2500, 400,
    'Los Guardianes Forjados patrullan al norte del paso de lava. Cada uno lleva el nombre de alguien que no pidió volver. Derrotá a 6 y dejalos descansar.',
    'Los nombres grabados en su hierro vuelven a ser solo nombres. Brenna los va a anotar, uno por uno.'),
  f_smelter: { ...mission('f_smelter', 'El fundidor primordial', 'kill', 'primal_smelter', 1, 1500, 500,
    'El Fundidor Primordial, nivel 24, alimenta la Fragua desde el paso norte (1500, 420). Marca el suelo con metal fundido: no te quedes dentro del círculo.',
    'Sin el fundidor, la Fragua se enfría un poco. Tomá esta arma: el metal todavía guarda el calor de la caldera.'),
    rewardByClass: { knight: 'aden_filo_de_brasa_viva', barbarian: 'aden_asta_de_doble_luna', ranger: 'aden_ballesta_del_rayo_blanco', mage: 'aden_sable_del_astronomo', rogue: 'ember_dagger' } },
  f_anvil_1: mission('f_anvil_1', 'Los tres yunques · oeste', 'interact', 'forge_anvil_1', 1, 0, 0,
    'Examiná el yunque oeste de la arena (1489, 400). Cuando Vharzul despierte, cada yunque forjará un guardián.', '', true),
  f_anvil_2: mission('f_anvil_2', 'Los tres yunques · este', 'interact', 'forge_anvil_2', 1, 0, 0,
    'Examiná el yunque este (1511, 400).', '', true),
  f_anvil_3: mission('f_anvil_3', 'Los tres yunques', 'interact', 'forge_anvil_3', 1, 6000, 500,
    'Examiná el yunque del centro (1500, 408).',
    'Escuchame bien. Mientras Vharzul pelee, los yunques forjan guardianes: enfriá uno y deja de forjar. Pero cuando el dragón encienda la Fragua entera, solo un yunque todavía caliente puede cortar su aliento. No los enfríes todos antes de tiempo. Ya estás listo: la llama te reconoce.'),
  f_vharzul: { ...mission('f_vharzul', 'El corazón de la Fragua', 'kill', 'vharzul', 1, 8000, 1000,
    'Vharzul, nivel 25, duerme en la arena norte (1500, 396). Esquivá su aliento frontal y las brasas; cuando encienda la Fragua, escapá del círculo o enfriá un yunque caliente para interrumpirlo.',
    'Así que el maestro está vivo, y la Fragua duerme otra vez. Halden me mandó su martillo y una carta: se queda en la caldera para cuidar las runas, con Ysolde. Tal vez eso sea lo más parecido al perdón que pueda darle. Con el corazón del dragón forjé esto para vos: que te recuerde que el fuego sirve para dar forma, no para retener.',
    false, 'smith'), rewardItemId: 'vharzul_heart' },
};
```

`quests.ts`: `import { FORGE_QUESTS } from './forge.js';` + `Object.assign(QUESTS, FORGE_QUESTS);`.

- [ ] **Step 4: Capítulo** — `chapters.ts`: importar `FORGE_QUEST_ORDER`, `FORGE_COMPLETE`; cambiar el `completeText` de `mines` a `'Halden cayó y confesó lo que despertó bajo la montaña. Brenna prepara la expedición a la Fragua de los Primeros.'`; agregar:

```ts
  { id: 'forge', questOrder: FORGE_QUEST_ORDER, completeId: FORGE_COMPLETE,
    completeTitle: 'La Fragua Antigua · completada',
    completeText: 'Vharzul cayó y la Fragua de los Primeros vuelve a dormir. Halden se queda en la caldera, junto a Ysolde, para custodiar las runas. Las dos llamas descansan.',
    start: { after: MINES_COMPLETE, npcId: 'brenna', minLevel: 20,
      lockedText: 'La expedición a la Fragua requiere nivel 20.',
      startedText: 'Nueva expedición: viajá a la Fragua de los Primeros y encontrá a Ysolde.' },
    mapGates: { fragua: { from: 'f_caldera', text: 'Hablá con Brenna en las Minas antes de viajar a la Fragua de los Primeros.' } } },
```

- [ ] **Step 5: NPC, objetos, ítems y contratos**

`npcs.ts`:

```ts
  { id: 'ysolde', name: 'Guardiana Ysolde', role: 'elder', appearance: 'healer', appearanceModel: 'Rogue_Female', mapId: 'fragua', x: 1494, z: 494 },
  { id: 'halden_npc', name: 'Maestro Halden', role: 'smith', appearance: 'smith', appearanceModel: 'Knight', mapId: 'fragua', x: 1506, z: 494 },
```

`worldobjects.ts`:

```ts
  ...[[1480, 484], [1520, 484], [1500, 446]].map(([x, z], i) => ({ id: `forge_rune_${i + 1}`, mapId: 'fragua', kind: 'shrine' as const, x, z, buff: 'atk' as const, reusable: true })),
  ...[[1489, 400], [1511, 400], [1500, 408]].map(([x, z], i) => ({ id: `forge_anvil_${i + 1}`, mapId: 'fragua', kind: 'shrine' as const, x, z, buff: 'def' as const, reusable: true })),
  { id: 'fragua_chest', mapId: 'fragua', kind: 'chest', x: 1446, z: 400, lootId: 'chest_fragua' },
  ...[[1512, 488], [1488, 488]].map(([x, z], i) => ({ id: `fragua_barrel_${i + 1}`, mapId: 'fragua', kind: 'breakable' as const, x, z, lootId: 'breakable' })),
```

`items.ts` → `ITEM_TEMPLATES`:

```ts
  ember_dagger: { id: 'ember_dagger', name: 'Daga de Brasa', type: 'equipment', stackable: false, category: 'arma', subcategory: 'espada', classes: ['rogue'], hands: '1H', slot: 'weapon', rarity: 'rare', requiredLevel: 24, bonuses: { pAtk: 23 }, description: 'Templada en la última colada del Fundidor. Todavía despide calor al desenvainarla.' },
  vharzul_heart: { id: 'vharzul_heart', name: 'Corazón de Vharzul', type: 'equipment', stackable: false, slot: 'accessory', rarity: 'legendary', requiredLevel: 25, bonuses: { pAtk: 16, pDef: 14, maxHp: 120 }, description: 'Dorne lo forjó con el corazón del dragón. El fuego sirve para dar forma, no para retener.' },
```

`sideChains.ts` → cadena repetible:

```ts
  { id: 'halden', npcId: 'halden_npc', kind: 'repeatable', minLevel: 20, announce: true,
    returnHint: 'Volvé con Halden en el campamento de la caldera.',
    steps: [
      { id: 'h_imps', title: 'Chispas que no debí encender', objective: 'kill', targetId: 'ember_imp', amount: 8, rewardExp: 2500, rewardGold: 300,
        intro: 'Encendí un fuego que no sé apagar. Derrotá a 8 Imps de Brasa y volvé; cada chispa menos es un paso para enmendarlo.',
        done: 'Gracias. Todavía oigo sus risas en la caldera, pero menos.' },
      { id: 'h_drakes', title: 'La cría del dragón', objective: 'kill', targetId: 'young_drake', amount: 5, rewardExp: 3000, rewardGold: 350,
        intro: 'Los dracos crecen cerca de la lava. Derrotá a 5 antes de que alcancen el tamaño de su padre.',
        done: 'Cinco menos. Ysolde dice que el dragón duerme más tranquilo sin ellos.' },
      { id: 'h_constructs', title: 'Nombres en el hierro', objective: 'kill', targetId: 'forge_construct', amount: 5, rewardExp: 3500, rewardGold: 400,
        intro: 'Forjé cuerpos para nombres que no me pertenecían. Derrotá a 5 Guardianes Forjados y dejá que descansen.',
        done: 'Anoté sus nombres. Algún día voy a pedirles perdón, uno por uno.' },
    ] },
```

- [ ] **Step 6: Yunques que se enfrían (shared)** — `encounters.ts`:
- `EncounterDef` suma `/** Objetos que se enfrían en combate: dejan de invocar hasta que el encuentro termina o se reinicia. */ coolObjects?: readonly string[];` y `coolTexts?: { success: string; tooWeak: string; idle: string };`.
- En `vharzul`: `coolObjects: FORGE_ANVILS, coolTexts: { success: 'Enfriaste el yunque: dejó de forjar guardianes.', tooWeak: 'El yunque no responde a tu poder actual.', idle: 'El yunque late con el pulso del dragón. Solo se enfría cuando Vharzul pelea.' },`
- Nueva función:

```ts
/** Encuentro que permite enfriar este objeto (y sus textos). */
export function encounterCoolFor(objectId: string): { templateId: string; texts: NonNullable<EncounterDef['coolTexts']> } | null {
  for (const def of Object.values(ENCOUNTERS)) {
    if (def.coolObjects?.includes(objectId) && def.coolTexts) return { templateId: def.templateId, texts: def.coolTexts };
  }
  return null;
}
```

- [ ] **Step 7: Test E2E (falla)** — `server/src/rooms/ForgeCampaign.test.ts` (patrón de `MinesCampaign.test.ts`, puerto 2598):
1. Desde `MINES_COMPLETE` nivel 19: `WarpTo fragua` rechazado; Brenna rechaza con "nivel 20"; a nivel 20 Brenna inicia `f_caldera`; `WarpTo fragua` completa la visita.
2. Recorrer: runas 1→2 (auto) →3; imps ×10; dracos ×6 (recompensa coraza por clase, buscada por id base con `owns`); guardianes ×6; fundidor; yunques 1→2→3 (sin Vharzul peleando: texto `idle`, avanza la misión, el yunque sigue activo); Vharzul no recibe daño antes de `f_vharzul`; derrotar a Vharzul; `InteractNpc` con `smith` (en el pueblo, `p.mapId='pueblo'`, `p.x=0`, `p.z=0`) → `FORGE_COMPLETE`, `vharzul_heart` en inventario, premio una sola vez.
3. Enfriar: con `questId='f_vharzul'`, `level=25`, spawnear Vharzul en `FORGE_ARENA` con `aggroTargetId = c.sessionId`; interactuar con `forge_anvil_1` → objeto inactivo y `cooled`; tras `room.tick(.05)` sigue inactivo; `boss.channeling = true; boss.hazardMs = 6000` e interactuar con `forge_anvil_2` → `boss.channeling === false`, `boss.stunMs === 3000`, anvil_2 inactivo; `room['killMob'](boss, id, c.sessionId)` → los tres yunques vuelven a `active` y `cooled === false`.
4. Un jugador de nivel 18 no puede enfriar (texto `tooWeak`, el yunque sigue activo).
5. Contrato de Halden: aceptar (`sideChains.get('halden').id === 'h_imps'`), matar 8 imps, entregar → EXP y oro, siguiente paso `h_drakes`.

- [ ] **Step 8: Server** — `WorldObjectState.ts`: `/** Enfriado durante un encuentro: no reaparece por timer. */ cooled = false;` (server-only). En `GameRoom.ts`:
- `InteractObject`, después de `this.creditSideChains(...)` y antes del bloque `const interrupt = encounterInterruptFor(o.id);`:

```ts
      const cooling = encounterCoolFor(o.id);
      if (cooling) {
        const boss = [...this.state.mobs.values()].find(m => m.templateId === cooling.templateId && !m.dead && !!m.aggroTargetId && m.mapId === p.mapId && distance2D(p.x, p.z, m.x, m.z) <= 25);
        if (!boss) { client.send(MessageType.ItemResult, { success: true, text: cooling.texts.idle }); return; }
        if (!canFightDungeonMob(p, boss.templateId) || pvePower(p.level, boss.level).outgoing === 0) { client.send(MessageType.ItemResult, { success: false, text: cooling.texts.tooWeak }); return; }
        const interrupt = boss.channeling ? encounterInterruptFor(o.id) : null;
        if (interrupt && interrupt.templateId === boss.templateId) {
          boss.channeling = false; boss.hazardMs = 0; boss.hazardCooldownMs = interrupt.pattern.interruptCooldownMs ?? 0;
          boss.stunMs = Math.max(boss.stunMs, interrupt.pattern.interruptStunMs ?? 0);
        }
        o.active = false; o.cooled = true;
        client.send(MessageType.ItemResult, { success: true, text: interrupt ? (interrupt.pattern.interruptTexts?.success ?? cooling.texts.success) : cooling.texts.success });
        return;
      }
```

- `clearSummons(ownerId)`: al final, dentro del `if (owner)`, restaurar los objetos enfriables del encuentro:

```ts
    if (owner) {
      owner.summonTimers.clear(); owner.summonFlags.clear();
      for (const id of getEncounter(owner.templateId)?.coolObjects ?? []) {
        const obj = this.state.worldObjects.get(id);
        if (obj) { obj.active = true; obj.cooled = false; }
      }
    }
```

- Tick de objetos: `if (o.active) return;` → sumar `if (o.cooled) return;` a continuación.
- Imports: `encounterCoolFor`.

- [ ] **Step 9: Cliente** — `main.ts`, en `interactObject`: no mostrar el toast optimista de santuario para objetos de encuentro (el server responde con su texto): cambiar `else if (def.kind === "shrine")` por `else if (def.kind === "shrine" && !encounterCoolFor(id) && !encounterInterruptFor(id))` (importar ambas).

- [ ] **Step 10:** `npm test` + tres `tsc` → verde. **Step 11: Commit** `feat: add the Forge chapter with Ysolde, Halden's contracts and Vharzul's anvils`.

---

### Task 3: Ambientación de la Fragua

**Files:** Create `client/src/render/FraguaEnvironment.ts`, `client/src/render/FraguaEnvironment.test.ts`; Modify `client/src/render/Environment.ts`.

- [ ] **Step 1: Test (falla)** — mismo patrón que `MinesEnvironment.test.ts`: raíz `fragua-landmarks`; cada lava dibujada con nombre `forge-lava-${i}` sobre su huella exacta (`PlaneGeometry(width, depth)` en `x/z`); existe `forge-arena-glow`; todas las mallas dentro de los bounds del mapa (z hasta `minZ - 6`).
- [ ] **Step 2: Implementar** `addFraguaEnvironment(scene): THREE.Group`: planos de lava emisivos (`MeshStandardMaterial` color 0xff6a1f, emissive 0xff4a10, intensidad 1.4) con bordes de basalto (cajas `crackedStoneMat(0x2a2320)`); yunques decorativos en cada `FORGE_ANVILS` (cuerpo + cuerno con `metalMat(0x3d3a38)`, obtenidos con `getWorldObject`); pilares rúnicos decorativos en `FORGE_RUNES` (columna de basalto + runa emisiva ámbar); pared de basalto al norte (rocas en `minZ - 3`, como las Minas); `PointLight` `forge-arena-glow` (0xff7a2a, 3.5, 40) sobre `FORGE_ARENA`; brasas flotantes con un `THREE.Points` de 120 puntos sobre la lava. Llamarlo en `Environment.structures()` junto a `addMinesEnvironment`.
- [ ] **Step 3:** `npm test` + `tsc` cliente → verde. **Commit** `feat: dress the Forge of the First with lava, anvils and runes`.

---

### Task 4: Calibración con el simulador

**Files:** Modify `server/src/sim/BalanceSimulator.ts`, `server/src/sim/scenarios.ts`, `server/scripts/balance.ts`, `server/src/sim/BalanceSimulator.test.ts`, `shared/src/combat.ts`; Create `artifacts/balance/forge.json`.

- [ ] **Step 1: El bot interrumpe con objetos** — en `attentiveStep`, antes del chequeo de área: si `mob.channeling`, buscar entre los `interruptObjects` del patrón canalizado (vía `getEncounter(mob.templateId)`) el objeto activo más cercano del estado; si está a más de 3 unidades, `MoveTo` hacia él; si no, `InteractObject`. En `resetWorld`: `r.state.worldObjects.forEach(o => { o.active = true; o.cooled = false; o.respawnMs = 0; });`.
- [ ] **Step 2: Escenarios** — `GearStage` suma `'forge'` (arma de Halden por clase `questReward(getQuest('f_halden'), cls)`, `nihil_aegis`, `memory_locket`, anillo del sello), `'forge_mid'` (arma de Halden + coraza de `f_drakes` por clase) y `'forge_late'` (arma del fundidor `questReward(getQuest('f_smelter'), cls)` + coraza de `f_drakes`). `forgeScenarios(cls)`: Imp 21 y Draco 22 con `forge`; Guardián 23 y Fundidor 24 con `forge_mid`; Vharzul 25 con `forge_late` y `questId: 'f_vharzul'`. CLI `--forge` análogo a `--mines`, escribiendo `artifacts/balance/forge.json`.
- [ ] **Step 3: Tests de balance** — iguales a los de las Minas con los nombres Imp/Draco/Guardián (5–9 s), Fundidor (15–30 s), Vharzul (60–100 s), más "un caballero atento vence a Vharzul; uno quieto no".
- [ ] **Step 4: Calibrar** con la misma regla (vida ← actual × objetivo / mediana: 7 s normales, 22 s élite, 80 s jefe; ataque del jefe ±5 % por ronda si el caballero atento muere o el quieto gana; máximo seis rondas o BLOCKED).
- [ ] **Step 5:** `npm test` + tres `tsc`; `npm run balance --workspace @aden/server -- --forge`. **Commit** `feat: calibrate the Forge enemies with the balance simulator`.

---

### Task 5: Verificación final

- [ ] Suite, tres `tsc`, builds de cliente y server.
- [ ] Navegador contra un server semilla temporal (no commitear), con personajes de prueba en memoria: uno en `f_imps` en la Fragua (nivel 21) y otro en `MINES_COMPLETE` (nivel 20) en las Minas. Verificar mapa, lava, Ysolde, Halden (diálogo de contratos), inicio del capítulo con Brenna y consola sin errores. Quitar el server semilla y la configuración temporal.
- [ ] Reportar y pedir OK para integrar `fragua-forja` en `master` y pushear.
