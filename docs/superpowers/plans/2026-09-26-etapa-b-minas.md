# Etapa B — Minas de Hierro Negro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el primer mapa del capítulo 2 (Minas de Hierro Negro, niveles 15–20): transición con Dorne, NPC Brenna y Tobías, ocho misiones hasta Halden (jefe nivel 20), enemigos con zonas de caza, encargos opcionales, ambientación y música, con combate calibrado por el simulador.

**Architecture:** Todo el contenido es datos en `@aden/shared` (mundo, capítulo, misiones, NPC, objetos, enemigos, encuentros, ítems, encargos) que el server ya interpreta gracias a la etapa A. El server solo generaliza tres ruteos (NPC que inicia capítulo, tienda de campo, anuncio de reaparición). El cliente reemplaza su lógica de diálogo escrita por capítulo con una función pura basada en el registro de capítulos, y suma la ambientación del mapa.

**Tech Stack:** TypeScript (npm workspaces), Colyseus 0.15, Three.js 0.160, Vitest 1.6, tsx.

**Spec:** `docs/superpowers/specs/2026-09-25-fragua-antigua-design.md` (§3–§8, etapa B de §11).

## Global Constraints

- Rama: `fragua-minas`. No hacer push ni merge sin OK explícito del usuario.
- Sin migraciones de Supabase: el progreso usa `questId`/`questProgress` y el blob `progress`.
- Cambios de schema Colyseus: ninguno previsto en esta etapa (solo datos + lógica). Si una tarea necesitara un campo `@type` nuevo, detenerse y reportarlo.
- El catálogo (`shared/src/catalog.ts`) es un conjunto cerrado de 208 ítems con tests que lo verifican: las armas y accesorios nuevos van en `ITEM_TEMPLATES` de `shared/src/items.ts`.
- Los tests existentes conservan sus valores esperados. Cambios de expectativa permitidos y únicos: `chapters.test.ts` (el registro suma el capítulo `mines` y `chapterAfter(MEMORY_COMPLETE)` deja de ser `null`).
- Nivel del contenido fijo (no escala con el jugador); regla PvE existente (`pvePower`).
- Estilo: igual al código vecino (comentarios en español, identificadores en inglés).
- Verificación de cada tarea: `npm test` (raíz) + `npx tsc -p shared/tsconfig.json --noEmit` + `npx tsc -p server/tsconfig.json --noEmit` + `npx tsc -p client/tsconfig.json --noEmit`.
- Commits en inglés, conventional, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Datos del mapa (referencia para todas las tareas)

Mapa `minas`: centro (1500, 150), bounds x 1435–1565 / z 85–215, spawn (1500, 200). Camino principal norte-sur en x = 1500.

| Elemento | Posición |
|---|---|
| Brenna / Tobías | (1494, 194) / (1506, 194) |
| Casas del campamento | (1480, 204) y (1520, 204) |
| Herramientas marcadas | `mines_mark_1` (1478, 184), `mines_mark_2` (1522, 184) |
| Pozos (no transitables) | (1482, 152) y (1518, 152), 8 × 10 |
| Montacargas / castillete | `mines_lift` (1500, 136) |
| Puerta de la Fragua | (1500, 88) |
| Encargos de Tobías | `tobias_crate` (1452, 160), `tobias_diary` (1548, 128), `tobias_hammer` (1478, 98) |
| Cofre / barriles | `minas_chest` (1447, 118); barriles (1512, 188), (1488, 188), (1460, 150), (1540, 150) |

| Spawn | Template | Centro | Radio | Cantidad |
|---|---|---|---:|---:|
| `mines_diggers_west` / `_east` | `mine_digger` | (1466, 172) / (1534, 172) | 4 | 5 + 5 |
| `mines_armors_west` / `_east` | `mine_armor` | (1460, 140) / (1540, 140) | 4 | 4 + 4 |
| `mines_trolls_west` / `_east` | `cave_troll` | (1474, 112) / (1526, 112) | 4 | 4 + 4 |
| `mines_foreman` | `mine_foreman` | (1500, 120) | 0 | 1 |
| `mines_halden` | `halden` | (1500, 97) | 0 | 1 |
| `mines_colossus` | `iron_colossus` | (1555, 100) | 0 | 1 |

Ruta de EXP (verificada): con las recompensas de la Task 2 el jugador llega a nivel 18 en los trolls, 19 en el capataz, 20 en Halden y 21 al entregarlo.

---

### Task 1: Mapa y enemigos

**Files:**
- Create: `shared/src/mines.ts` (constantes de lugar; las misiones llegan en la Task 2), `shared/src/mines.test.ts`
- Modify: `shared/src/world.ts`, `shared/src/constants.ts`, `shared/src/mobs.ts`, `shared/src/combat.ts`, `shared/src/progression.ts`, `shared/src/items.ts` (DROP_TABLES), `shared/src/adventure.ts` (POOLS), `shared/src/encounters.ts`, `shared/src/structures.ts`, `shared/src/index.ts`, `client/src/audio/score.ts`, `client/src/render/textures.ts`, `client/src/render/Environment.ts` (SUN_INTENSITY)

**Interfaces:**
- Produces: zona `minas`; `MINES_PITS`, `MINES_LIFT`, `MINES_GATE`, `MINES_CAMP` desde `@aden/shared`; templates `mine_digger`, `mine_armor`, `cave_troll`, `mine_foreman`, `halden`, `iron_colossus`; encuentros de `mine_foreman`, `halden` (requiresQuest `'f_halden'`) e `iron_colossus`.

- [ ] **Step 1: Test del mapa (falla)**

`shared/src/mines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getZone, canEnterZone, ZONES } from './world.js';
import { MAP_BOUNDS } from './constants.js';
import { MOB_TEMPLATES, SPAWN_ZONES } from './mobs.js';
import { getMobCombat } from './combat.js';
import { getMobExp } from './progression.js';
import { getEncounter } from './encounters.js';
import { findPath, isWalkable } from './navigation.js';
import { MINES_PITS, MINES_LIFT, MINES_GATE } from './mines.js';

const MINE_MOBS = ['mine_digger', 'mine_armor', 'cave_troll', 'mine_foreman', 'halden', 'iron_colossus'];

describe('Minas de Hierro Negro: mapa y enemigos', () => {
  it('opens a level 15 map inside the global plane without overlapping others', () => {
    const zone = getZone('minas');
    expect(canEnterZone(zone, 14)).toBe(false);
    expect(canEnterZone(zone, 15)).toBe(true);
    expect(zone.bounds.maxX).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
    for (const other of ZONES.filter(z => z.id !== 'minas')) {
      const a = zone.bounds, b = other.bounds;
      expect(a.maxX < b.minX || b.maxX < a.minX || a.maxZ < b.minZ || b.maxZ < a.minZ).toBe(true);
    }
  });
  it('defines every enemy with a fixed level, stats, EXP and loot', () => {
    for (const id of MINE_MOBS) {
      const t = MOB_TEMPLATES[id];
      expect(t, id).toBeDefined();
      expect(getMobCombat(id).maxHp).toBeGreaterThan(0);
      expect(getMobExp(id)).toBeGreaterThan(0);
    }
    expect([15, 16, 18, 19, 20, 24]).toEqual(MINE_MOBS.map(id => MOB_TEMPLATES[id].level));
    expect(MOB_TEMPLATES.halden).toMatchObject({ rank: 'boss', boss: true });
    expect(MOB_TEMPLATES.mine_foreman).toMatchObject({ rank: 'elite', miniBoss: true });
  });
  it('places every spawn on reachable ground from the arrival point', () => {
    const zone = getZone('minas');
    const spawns = SPAWN_ZONES.filter(s => s.mapId === 'minas');
    expect(spawns.map(s => s.templateId).sort()).toEqual(['cave_troll', 'cave_troll', 'halden', 'iron_colossus', 'mine_armor', 'mine_armor', 'mine_digger', 'mine_digger', 'mine_foreman']);
    for (const s of spawns) {
      const at = { x: s.centerX, z: s.centerZ };
      expect(isWalkable(zone.id, at), s.id).toBe(true);
      expect(findPath(zone.id, zone.spawn, at).length, s.id).toBeGreaterThan(0);
    }
    for (const place of [MINES_LIFT, { x: MINES_GATE.x, z: MINES_GATE.z + 6 }]) expect(isWalkable('minas', place)).toBe(true);
    for (const pit of MINES_PITS) expect(isWalkable('minas', pit)).toBe(false);
  });
  it('gives the foreman a frontal cone and Halden two patterns plus reinforcements', () => {
    expect(getEncounter('mine_foreman')!.patterns[0]).toMatchObject({ shape: 'cone', angleDeg: 80 });
    const halden = getEncounter('halden')!;
    expect(halden.requiresQuest).toBe('f_halden');
    expect(halden.patterns.map(p => p.shape)).toEqual(['cone', 'circle']);
    expect(halden.summons).toEqual([{ templateId: 'mine_armor', atHpPct: 0.5, count: 2, maxAlive: 2 }]);
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/mines.test.ts` (desde `shared/`). Expected: FAIL (módulo `./mines.js` inexistente).

- [ ] **Step 3: Constantes y zona**

`shared/src/mines.ts`:

```ts
/** Minas de Hierro Negro (Acto II · cap. 2, niveles 15–20). Lugares de referencia del mapa. */
export const MINES_CAMP = { x: 1500, z: 196 } as const;
/** Pozos del tajo abierto: obstáculos de navegación a los lados del camino principal. */
export const MINES_PITS = [
  { x: 1482, z: 152, width: 8, depth: 10 },
  { x: 1518, z: 152, width: 8, depth: 10 },
] as const;
export const MINES_LIFT = { x: 1500, z: 136 } as const;
/** Puerta de la Fragua: arena de Halden al fondo de la mina. */
export const MINES_GATE = { x: 1500, z: 88 } as const;
```

En `shared/src/index.ts`: `export * from './mines.js';`.

En `shared/src/constants.ts`: `maxX: 1300` → `maxX: 1600`.

En `shared/src/world.ts`, dentro de `ZONES`, antes de la entrada `cripta`:

```ts
  {
    id: 'minas', name: 'Minas de Hierro Negro', subtitle: 'Los martillos suenan donde no trabaja nadie',
    center: { x: 1500, z: 150 }, bounds: boundsAround(1500, 150), spawn: { x: 1500, z: 200 },
    levelReq: 15, levelMin: 15, levelMax: 20, safe: false,
    biome: { ground: 0x3a3632, fog: 0x4b4540, fogNear: 32, fogFar: 125, accent: 0xd08a3a },
  },
```

- [ ] **Step 4: Enemigos**

`shared/src/mobs.ts`, en `MOB_TEMPLATES` (junto a los de Act II):

```ts
  mine_digger: { id: 'mine_digger', level: 15, rank: 'normal', name: 'Excavador Hueco', model: 'BoneWarden', tint: 0x9a8f7e },
  mine_armor: { id: 'mine_armor', level: 16, rank: 'normal', name: 'Armadura Animada', model: 'DreadKnight', tint: 0x8d9399 },
  cave_troll: { id: 'cave_troll', level: 18, rank: 'normal', name: 'Troll de Caverna', model: 'ForestTroll', tint: 0x7d8a96, scale: 1.1 },
  mine_foreman: { id: 'mine_foreman', level: 19, rank: 'elite', name: 'Capataz de Hierro', model: 'DreadKnight', miniBoss: true, scale: 1.5, tint: 0x6f7780, respawnMs: 45000 },
  halden: { id: 'halden', level: 20, rank: 'boss', name: 'Maestro Halden', model: 'DreadKnight', boss: true, scale: 1.4, tint: 0xc99a5b, respawnMs: 60000 },
  iron_colossus: { id: 'iron_colossus', level: 24, rank: 'elite', name: 'Coloso de Hierro Negro', model: 'ForestTroll', miniBoss: true, scale: 1.6, tint: 0x4d5358, respawnMs: 60000 },
```

`SPAWN_ZONES` (al principio del array, como los de Act II):

```ts
  { id: 'mines_diggers_west', mapId: 'minas', templateId: 'mine_digger', centerX: 1466, centerZ: 172, radius: 4, count: 5 },
  { id: 'mines_diggers_east', mapId: 'minas', templateId: 'mine_digger', centerX: 1534, centerZ: 172, radius: 4, count: 5 },
  { id: 'mines_armors_west', mapId: 'minas', templateId: 'mine_armor', centerX: 1460, centerZ: 140, radius: 4, count: 4 },
  { id: 'mines_armors_east', mapId: 'minas', templateId: 'mine_armor', centerX: 1540, centerZ: 140, radius: 4, count: 4 },
  { id: 'mines_trolls_west', mapId: 'minas', templateId: 'cave_troll', centerX: 1474, centerZ: 112, radius: 4, count: 4 },
  { id: 'mines_trolls_east', mapId: 'minas', templateId: 'cave_troll', centerX: 1526, centerZ: 112, radius: 4, count: 4 },
  { id: 'mines_foreman', mapId: 'minas', templateId: 'mine_foreman', centerX: 1500, centerZ: 120, radius: 0, count: 1 },
  { id: 'mines_halden', mapId: 'minas', templateId: 'halden', centerX: 1500, centerZ: 97, radius: 0, count: 1 },
  { id: 'mines_colossus', mapId: 'minas', templateId: 'iron_colossus', centerX: 1555, centerZ: 100, radius: 0, count: 1 },
```

`shared/src/combat.ts`, en `MOB_COMBAT` (valores iniciales; la Task 5 los calibra):

```ts
  mine_digger: { maxHp: 1400, pAtk: 90, pDef: 46, attackCooldownMs: 2200 },
  mine_armor: { maxHp: 1650, pAtk: 95, pDef: 54, attackCooldownMs: 2400 },
  cave_troll: { maxHp: 2100, pAtk: 108, pDef: 58, attackCooldownMs: 2600 },
  mine_foreman: { maxHp: 6200, pAtk: 122, pDef: 64, attackCooldownMs: 2600 },
  halden: { maxHp: 11500, pAtk: 140, pDef: 70, attackCooldownMs: 2400 },
  iron_colossus: { maxHp: 9800, pAtk: 175, pDef: 84, attackCooldownMs: 2800 },
```

`shared/src/progression.ts`, en `MOB_EXP`: `mine_digger: 560, mine_armor: 620, cave_troll: 760, mine_foreman: 1600, halden: 3000, iron_colossus: 2600,`

`shared/src/items.ts`, en `DROP_TABLES`:

```ts
  mine_digger: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 40, qtyMax: 60 }],
  mine_armor: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 45, qtyMax: 70 }, { itemTemplateId: 'health_potion', chance: 0.15, qtyMin: 1, qtyMax: 1 }],
  cave_troll: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 55, qtyMax: 85 }, { itemTemplateId: 'greater_potion', chance: 0.12, qtyMin: 1, qtyMax: 1 }],
  mine_foreman: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 150, qtyMax: 240 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 1, qtyMax: 2 }],
  halden: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 260, qtyMax: 400 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 }, { itemTemplateId: 'ancient_relic', chance: 1, qtyMin: 2, qtyMax: 4 }],
  iron_colossus: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 220, qtyMax: 340 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 2, qtyMax: 3 }],
```

`shared/src/adventure.ts`, en `POOLS` (nueva clave):

```ts
  minas: {
    mine_digger: ['aden_guantes_de_la_escama_de_brasa', 'aden_botas_de_la_escama_de_brasa'],
    mine_armor: ['aden_yelmo_de_la_escama_de_brasa', 'aden_grebas_de_la_escama_de_brasa'],
    cave_troll: ['aden_escudo_de_los_sepultados', 'aden_rodela_del_circulo_de_aden'],
    mine_foreman: ['aden_corvo_de_la_marca_gris', 'aden_pica_de_la_sierpe', 'aden_destral_silvano', 'aden_baculo_de_la_tormenta'],
    halden: ['aden_coraza_de_el_bastion_de_ceniza', 'aden_coraza_de_el_enigma_de_umbra', 'aden_coraza_de_el_vendaval_gris'],
    iron_colossus: ['aden_hoja_de_la_sierpe_palida', 'aden_escudo_del_cerco_espinado'],
    chest_minas: ['aden_yelmo_de_la_escama_de_brasa', 'aden_escudo_de_los_sepultados'],
  },
```

- [ ] **Step 5: Encuentros**

`shared/src/encounters.ts`, dentro de `ENCOUNTERS`:

```ts
  mine_foreman: { templateId: 'mine_foreman', aggroRadius: 14, cooldownMs: 8000,
    patterns: [{ shape: 'cone', anchor: 'self', radius: 6, angleDeg: 80, windupMs: 1800, power: 2.4 }] },
  halden: {
    templateId: 'halden', aggroRadius: 14, cooldownMs: 6500, requiresQuest: 'f_halden',
    patterns: [{ shape: 'cone', anchor: 'self', radius: 7, angleDeg: 90, windupMs: 1600, power: 2.6 }, circle(5, 1800, 2.4)],
    belowHalf: { cooldownMs: 4500 },
    summons: [{ templateId: 'mine_armor', atHpPct: 0.5, count: 2, maxAlive: 2 }],
  },
  iron_colossus: { templateId: 'iron_colossus', aggroRadius: 10, cooldownMs: 9000, patterns: [circle(5, 2000, 2.4)] },
```

- [ ] **Step 6: Geometría autoritativa**

En `shared/src/structures.ts`:
- Importar `import { MINES_PITS, MINES_LIFT, MINES_GATE } from './mines.js';`.
- En el loop de landmarks genéricos cambiar el filtro a `ZONES.filter(z => !z.safe && z.id !== 'cripta' && z.id !== 'monasterio' && z.id !== 'minas')`.
- En `dressingLayout`, cambiar el primer `if` a `if (zone.id === "cripta" || zone.id === 'monasterio' || zone.id === 'minas')`.
- Antes de `export const AUTHORED_STRUCTURES`, agregar:

```ts
// Minas de Hierro Negro: campamento al sur, castillete del montacargas y Puerta de la Fragua.
add('house', 'minas', 1480, 204, 5, 4.5, 0, 1, 0x7d7064, 1, 0x3f3a36, true);
add('house', 'minas', 1520, 204, 5, 4.5, 0, 1, 0x746a60, 1, 0x3f3a36, true);
for (const dx of [-3, 3]) for (const dz of [-3, 3]) box('minas', `mines-headframe-${dx}-${dz}`, MINES_LIFT.x + dx, 3, MINES_LIFT.z + dz, 0.5, 6, 0.5, 'timber');
box('minas', 'mines-headframe-beam', MINES_LIFT.x, 6.2, MINES_LIFT.z, 7, 0.4, 7, 'timber', false);
box('minas', 'mines-headframe-wheel', MINES_LIFT.x, 7.3, MINES_LIFT.z, 0.3, 1.8, 1.8, 'iron', false);
for (const dx of [-6, 6]) box('minas', `mines-gate-pillar-${dx}`, MINES_GATE.x + dx, 4, MINES_GATE.z, 3, 8, 3, 'stone');
box('minas', 'mines-gate-lintel', MINES_GATE.x, 8.6, MINES_GATE.z, 15, 1.2, 3, 'stone', false);
```

(las casas usan `add`; como `box()` se declara más abajo en el archivo, mover estas líneas justo después del bloque que define `box()` y los boxes de la cripta.)
- Después de la línea de `VEIL_POOLS` en obstáculos: `for (const [i, pit] of MINES_PITS.entries()) obstacles.push({ ...pit, id: \`mines-pit-${i}\`, mapId: 'minas', rotation: 0 });`

- [ ] **Step 7: Presencia mínima en el cliente**

- `client/src/audio/score.ts`, en `SOUNDTRACKS`:

```ts
  minas: {
    id: 'minas', title: 'Ecos del yunque', description: 'Trompas graves, tambores y cuerdas bajo la montaña',
    bpm: 72, meter: 4, tonic: 43, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 3, 4, 0, 6, 4, 0], lead: 'horn', pad: 'strings', pluck: 'bell',
    motifs: [
      [[0, 0, 1.5], [2, 3, 1], [3, 4, .8], [4, 3, 1.5], [6, 0, 1.5]],
      [[0, 4, 1], [1, 5, 1], [2, 7, 2], [5, 5, 1], [6, 4, 1.5]],
      [[.5, 3, 1.5], [2.5, 2, 1], [4, 0, 2], [7, -1, .8]],
      [[0, 0, 1], [1, 0, .5], [1.5, 3, 1.5], [4, 4, 1], [5, 2, 2]],
    ], reverb: 2.4, wind: .16, windHz: 380, percussion: .3,
  },
```

- `client/src/render/textures.ts`, en `terrainMat`: agregar `minas: "gravel"` al mapa de kinds y usar color `zone === 'minas' ? 0x6b645c : ...` (encadenar con el caso `marismas`).
- `client/src/render/Environment.ts`, en `SUN_INTENSITY`: `minas: 1.0,`.

- [ ] **Step 8: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde, incluido `mines.test.ts` y `score.test.ts` (cada zona con su música).

- [ ] **Step 9: Commit**

```bash
git add shared/src client/src/audio/score.ts client/src/render/textures.ts client/src/render/Environment.ts
git commit -m "feat: add the Black Iron Mines map and its enemies"
```

---

### Task 2: Capítulo, misiones, NPC, encargos y ruteos del server

**Files:**
- Modify: `shared/src/mines.ts`, `shared/src/quests.ts`, `shared/src/chapters.ts`, `shared/src/chapters.test.ts`, `shared/src/npcs.ts`, `shared/src/worldobjects.ts`, `shared/src/items.ts`, `shared/src/sideChains.ts`, `shared/src/mines.test.ts`, `server/src/rooms/GameRoom.ts`
- Create: `shared/src/campaignNpcs.ts`, `shared/src/campaignNpcs.test.ts`, `server/src/rooms/MinesCampaign.test.ts`

**Interfaces:**
- Consumes: `MINES_*` (Task 1), `questReached`, `chapterAfter`, `SIDE_CHAINS` (etapa A).
- Produces: `MINES_QUESTS`, `MINES_QUEST_ORDER`, `MINES_COMPLETE = 'mines_complete'`; `ChapterDef.completeTitle`/`completeText` (obligatorios); capítulo `mines`; NPC `brenna`, `tobias`; `NpcDef.shop?: boolean` (Boren y Tobías); cadena `tobias` (con `finishedText`); `SideChainDef.finishedText?: string`; ítems `gallery_dagger`, `black_iron_fang`, `anvil_staff`, `miner_amulet`; helpers `isCampaignNpc(npcId)`, `npcFirstAppearance(npcId)`, `chapterForComplete(completeId)`, `campaignRoleNow(questId, npcId)` desde `campaignNpcs.ts`.

- [ ] **Step 1: Tests de datos (fallan)**

Agregar a `shared/src/mines.test.ts` (importando lo necesario):

```ts
import { MINES_QUESTS, MINES_QUEST_ORDER, MINES_COMPLETE } from './mines.js';
import { getQuest } from './quests.js';
import { chapterAfter, mapGate, nextQuestId } from './chapters.js';
import { MEMORY_COMPLETE } from './monastery.js';
import { getNpc } from './npcs.js';
import { getWorldObject } from './worldobjects.js';
import { getItem } from './items.js';
import { questReward } from './adventure.js';
import { expToNextLevel } from './progression.js';
import { getSideChain } from './sideChains.js';

describe('Minas de Hierro Negro: capítulo', () => {
  it('starts from the Memory ending through Dorne at level 15 and gates the map', () => {
    const chapter = chapterAfter(MEMORY_COMPLETE)!;
    expect(chapter.id).toBe('mines');
    expect(chapter.start).toMatchObject({ npcId: 'smith', minLevel: 15 });
    expect(mapGate('minas')!.from).toBe('f_arrival');
    expect(nextQuestId(MINES_QUEST_ORDER[MINES_QUEST_ORDER.length - 1])).toBe(MINES_COMPLETE);
  });
  it('points every objective at real content on the map, delivered to Brenna', () => {
    for (const id of MINES_QUEST_ORDER) {
      const q = getQuest(id);
      expect(q.mapId).toBe('minas');
      expect(q.returnNpcId).toBe('brenna');
      expect(q.intro.length).toBeGreaterThan(10);
      if (q.objective === 'interact') {
        const o = getWorldObject(q.targetId!);
        expect(o.mapId).toBe('minas');
        expect(findPath('minas', getZone('minas').spawn, o).length).toBeGreaterThan(0);
      }
      if (q.objective === 'kill') expect(MOB_TEMPLATES[q.mobTemplateId]).toBeDefined();
    }
    expect(getQuest('f_mark_1').targetId).not.toBe(getQuest('f_mark_2').targetId);
    for (const id of ['brenna', 'tobias']) {
      const npc = getNpc(id);
      expect(npc.mapId).toBe('minas');
      expect(findPath('minas', getZone('minas').spawn, npc).length).toBeGreaterThan(0);
    }
  });
  it('reaches each fight at its level on the mandatory route and ends at 21 with usable rewards', () => {
    let level = 15, xp = 0;
    const gates: Record<string, number> = { f_trolls: 18, f_foreman: 19, f_halden: 20 };
    for (const id of MINES_QUEST_ORDER) {
      const q = getQuest(id);
      if (gates[id]) expect(level, id).toBeGreaterThanOrEqual(gates[id]);
      if (q.objective === 'kill') xp += getMobExp(q.mobTemplateId) * q.amount;
      xp += q.rewardExp;
      while (xp >= expToNextLevel(level)) { xp -= expToNextLevel(level); level++; }
      for (const cls of ['knight', 'mage', 'barbarian', 'rogue', 'ranger']) {
        const reward = questReward(q, cls); if (!reward) continue;
        const item = getItem(reward);
        expect(item.requiredLevel ?? 1, `${id} ${cls}`).toBeLessThanOrEqual(level);
        if (item.classes) expect(item.classes).toContain(cls);
      }
    }
    expect(level).toBe(21);
  });
  it('runs Tobías errands on the map and pays with real items', () => {
    const chain = getSideChain('tobias')!;
    expect(chain).toMatchObject({ npcId: 'tobias', kind: 'sequence', minLevel: 15, announce: true });
    for (const step of chain.steps) {
      expect(getWorldObject(step.targetId).mapId).toBe('minas');
      if (step.rewardItemId) expect(getItem(step.rewardItemId).id).toBe(step.rewardItemId);
    }
    expect(getNpc('tobias').shop).toBe(true);
    expect(getNpc('boren').shop).toBe(true);
  });
});
```

En `shared/src/chapters.test.ts` actualizar: `expect(CHAPTERS.map(c => c.id)).toEqual(['act1', 'veil', 'memory', 'mines']);` y reemplazar `expect(chapterAfter(MEMORY_COMPLETE)).toBeNull();` por `expect(chapterAfter(MEMORY_COMPLETE)?.start).toMatchObject({ npcId: 'smith', minLevel: 15 });`, agregar `expect(chapterAfter(MINES_COMPLETE)).toBeNull();` (importando `MINES_COMPLETE` desde `./mines.js`), e incluir `MINES_COMPLETE` en el loop de `nextQuestId(c.completeId)`.

`shared/src/campaignNpcs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isCampaignNpc, npcFirstAppearance, chapterForComplete, campaignRoleNow } from './campaignNpcs.js';
import { MEMORY_COMPLETE } from './monastery.js';
import { MINES_COMPLETE } from './mines.js';

describe('campaign NPCs', () => {
  it('knows who takes part in the campaign', () => {
    for (const id of ['elder', 'maera', 'iria', 'smith', 'brenna']) expect(isCampaignNpc(id), id).toBe(true);
    for (const id of ['merchant', 'healer', 'captain', 'boren', 'tobias']) expect(isCampaignNpc(id), id).toBe(false);
  });
  it('finds where each NPC first appears', () => {
    expect(npcFirstAppearance('elder')).toBe('q1');
    expect(npcFirstAppearance('maera')).toBe('a2_arrival');
    expect(npcFirstAppearance('smith')).toBe(MEMORY_COMPLETE);
    expect(npcFirstAppearance('brenna')).toBe('f_arrival');
    expect(npcFirstAppearance('merchant')).toBeNull();
  });
  it('maps complete states to their chapter and tells when an NPC has a role now', () => {
    expect(chapterForComplete(MINES_COMPLETE)?.id).toBe('mines');
    expect(chapterForComplete('q1')).toBeNull();
    expect(campaignRoleNow(MEMORY_COMPLETE, 'smith')).toBe(true);
    expect(campaignRoleNow('q3', 'smith')).toBe(false);
    expect(campaignRoleNow('f_diggers', 'brenna')).toBe(true);
    expect(campaignRoleNow('f_diggers', 'smith')).toBe(false);
  });
});
```

- [ ] **Step 2: Correrlos y ver que fallan**

Run: `npx vitest run src/mines.test.ts src/chapters.test.ts src/campaignNpcs.test.ts` (desde `shared/`). Expected: FAIL.

- [ ] **Step 3: Misiones**

Agregar a `shared/src/mines.ts` (`import type { Quest } from './quests.js';` arriba):

```ts
export const MINES_COMPLETE = 'mines_complete';
export const MINES_QUEST_ORDER = ['f_arrival', 'f_diggers', 'f_mark_1', 'f_mark_2', 'f_armors', 'f_lift', 'f_trolls', 'f_foreman', 'f_halden'];

function mission(id: string, title: string, objective: Quest['objective'], targetId: string, amount: number, rewardExp: number, rewardGold: number, intro: string, done: string, autoAdvance = false): Quest {
  return { id, title, objective, targetId, amount, rewardExp, rewardGold, intro, done, autoAdvance, returnNpcId: 'brenna', mapId: 'minas',
    mobTemplateId: objective === 'kill' ? targetId : '',
    hint: `${intro}${autoAdvance ? ' Después seguí el siguiente marcador.' : ' Volvé con Brenna en el campamento del sur al completar el objetivo.'}` };
}

export const MINES_QUESTS: Record<string, Quest> = {
  f_arrival: mission('f_arrival', 'El taller de Halden', 'visit', 'minas', 1, 1500, 200,
    'Dorne reconoció las marcas del Custodio: son de Halden, su maestro, desaparecido con la Hermandad del Yunque. Viajá con M a las Minas de Hierro Negro y buscá a la capataz Brenna en el campamento del sur.',
    'Soy Brenna. Aprendí el oficio con Dorne, bajo el mismo maestro. Desde que el Prior cayó, los mineros oyen martillos donde no trabaja nadie. Y los muertos del tajo volvieron a cavar.'),
  f_diggers: mission('f_diggers', 'Los que cavan sin descanso', 'kill', 'mine_digger', 8, 2500, 250,
    'Los Excavadores Huecos cavan en el tajo, a los lados del camino. Derrotá a 8 antes de que abran otra galería.',
    'Cavaban hacia el norte, siempre hacia el norte. Nadie los guía: los llama algo que está al fondo de la mina.'),
  f_mark_1: mission('f_mark_1', 'La runa del maestro · primera herramienta', 'interact', 'mines_mark_1', 1, 0, 0,
    'Examiná la herramienta marcada en el acopio oeste del campamento (1478, 184). Después buscá la segunda.', '', true),
  f_mark_2: { ...mission('f_mark_2', 'La runa del maestro', 'interact', 'mines_mark_2', 1, 2500, 250,
    'Examiná la segunda herramienta marcada, en el acopio este (1522, 184).',
    'La misma runa en las dos: un yunque partido por una llama. Es el sello de Halden. Dorne no se equivocaba. Tomá este escudo del acopio: abajo lo vas a necesitar.'), rewardItemId: 'aden_escudo_de_los_sepultados' },
  f_armors: mission('f_armors', 'Hierro que camina', 'kill', 'mine_armor', 8, 3000, 300,
    'Las armaduras vacías de la Hermandad caminan por el tajo, al oeste y al este. Alguien las forjó para que sirvan de cuerpo. Derrotá a 8.',
    'Adentro no hay huesos: hay un nombre grabado en cada peto. Nombres de los que liberó el Prior. Halden les está dando cuerpo.'),
  f_lift: mission('f_lift', 'Las galerías hondas', 'interact', 'mines_lift', 1, 2000, 200,
    'Poné en marcha el montacargas del castillete (1500, 136) para que la cuadrilla pueda bajar a las galerías del norte.',
    'El montacargas vuelve a girar. Abajo se oye la fragua: alguien la mantiene encendida día y noche.'),
  f_trolls: { ...mission('f_trolls', 'Lo que vive abajo', 'kill', 'cave_troll', 6, 4200, 350,
    'Los trolls de caverna subieron desde las galerías, al noroeste y al noreste. Derrotá a 6 para asegurar el paso.',
    'Huían de algo más grande que ellos. El calor sube desde la Puerta de la Fragua, al fondo de la mina.'), rewardItemId: 'greater_potion', rewardItemQty: 5 },
  f_foreman: { ...mission('f_foreman', 'El capataz de hierro', 'kill', 'mine_foreman', 1, 4200, 400,
    'El Capataz de Hierro, nivel 19, custodia el camino a la Puerta (1500, 120). Golpea con un barrido frontal: cuando levante el martillo, salí de adelante.',
    'Era la armadura del viejo capataz de la Hermandad. Halden la usa de guardián. Tomá esta arma de nuestras reservas: con la que tenés no vas a pasar la Puerta.'),
    rewardByClass: { knight: 'aden_hoja_de_la_sierpe_palida', barbarian: 'aden_pica_de_la_sierpe', ranger: 'aden_destral_silvano', mage: 'aden_baculo_de_la_tormenta', rogue: 'gallery_dagger' } },
  f_halden: { ...mission('f_halden', 'La Puerta de la Fragua', 'kill', 'halden', 1, 5800, 600,
    'Halden espera en la Puerta de la Fragua (1500, 97), nivel 20. Barre de frente con el martillo y marca el suelo bajo tus pies; a media vida llama a dos armaduras. Detenelo.',
    'Halden está vivo, pero vencido. Dijo que no lo hizo solo: despertó a algo bajo la montaña para encender la Fragua como en los días de los primeros herreros. Dorne tiene que saberlo. Tomá esta arma del taller de Halden: la forjó para su último aprendiz.'),
    rewardByClass: { knight: 'aden_azote_de_los_encadenados', barbarian: 'aden_azote_de_los_encadenados', ranger: 'aden_arco_del_batidor', mage: 'anvil_staff', rogue: 'black_iron_fang' } },
};
```

En `shared/src/quests.ts`: importar `MINES_QUESTS` desde `./mines.js` y agregar `Object.assign(QUESTS, MINES_QUESTS);` junto a los otros `Object.assign`.

- [ ] **Step 4: Capítulo**

En `shared/src/chapters.ts`:
- `ChapterDef` suma `completeTitle: string;` y `completeText: string;`.
- Completar cada entrada existente:
  - act1: `completeTitle: 'Campaña completada · Acto I', completeText: 'Derrotaste a Nihil.'`
  - veil: `completeTitle: 'El camino recuperado', completeText: 'Recuperaste el paso de las Marismas.'`
  - memory: `completeTitle: 'La Memoria del Velo · completada', completeText: 'El Prior cayó y los cautivos recuperaron sus nombres. Iria conserva los testimonios para que Aden no vuelva a olvidar.'`
- Importar `MINES_QUEST_ORDER`, `MINES_COMPLETE` desde `./mines.js` y agregar al final de `CHAPTERS`:

```ts
  { id: 'mines', questOrder: MINES_QUEST_ORDER, completeId: MINES_COMPLETE,
    completeTitle: 'Las Minas de Hierro Negro · completadas',
    completeText: 'Halden cayó y confesó lo que despertó bajo la montaña. La Fragua de los Primeros espera: pronto se abrirá el camino.',
    start: { after: MEMORY_COMPLETE, npcId: 'smith', minLevel: 15,
      lockedText: 'La expedición a las Minas requiere nivel 15.',
      startedText: 'Nueva expedición: viajá a las Minas de Hierro Negro y encontrá a Brenna.' },
    mapGates: { minas: { from: 'f_arrival', text: 'Hablá con Dorne en Aden antes de bajar a las Minas de Hierro Negro.' } } },
```

- [ ] **Step 5: NPC, objetos, ítems y encargos**

`shared/src/npcs.ts`: en `NpcDef` agregar `/** Vende provisiones en su puesto (tienda de campo). */ shop?: boolean;`. En `NPCS`: agregar `shop: true` a `boren` y sumar

```ts
  { id: 'brenna', name: 'Capataz Brenna', role: 'elder', appearance: 'smith', appearanceModel: 'Barbarian_Female', mapId: 'minas', x: 1494, z: 194 },
  { id: 'tobias', name: 'Intendente Tobías', role: 'merchant', appearance: 'merchant', mapId: 'minas', x: 1506, z: 194, shop: true },
```

`shared/src/worldobjects.ts`, en `WORLD_OBJECTS`:

```ts
  { id: 'mines_mark_1', mapId: 'minas', kind: 'chest', x: 1478, z: 184, reusable: true },
  { id: 'mines_mark_2', mapId: 'minas', kind: 'chest', x: 1522, z: 184, reusable: true },
  { id: 'mines_lift', mapId: 'minas', kind: 'chest', x: 1500, z: 136, reusable: true },
  { id: 'tobias_crate', mapId: 'minas', kind: 'chest', x: 1452, z: 160, reusable: true },
  { id: 'tobias_diary', mapId: 'minas', kind: 'chest', x: 1548, z: 128, reusable: true },
  { id: 'tobias_hammer', mapId: 'minas', kind: 'chest', x: 1478, z: 98, reusable: true },
  { id: 'minas_chest', mapId: 'minas', kind: 'chest', x: 1447, z: 118, lootId: 'chest_minas' },
  ...[[1512, 188], [1488, 188], [1460, 150], [1540, 150]].map(([x, z], i) => ({ id: `minas_barrel_${i + 1}`, mapId: 'minas', kind: 'breakable' as const, x, z, lootId: 'breakable' })),
```

Agregar a `DROP_TABLES` en `items.ts` la tabla del cofre: `chest_minas: [{ itemTemplateId: 'gold', chance: 1, qtyMin: 120, qtyMax: 200 }, { itemTemplateId: 'greater_potion', chance: 1, qtyMin: 1, qtyMax: 2 }],`.

**Desvíos del spec, decididos al planificar:** los contratos repetibles de Tobías pasan a la etapa C (la ruta principal alcanza cada puerta sin ellos) y las armas nuevas del pícaro son de nivel 18 y 21 (no 24), para que la recompensa de Halden se pueda equipar al entregarla. Se agrega el Báculo del Yunque (mago, nivel 21) porque el catálogo no tiene báculo entre los niveles 19 y 22.

`shared/src/items.ts`, en `ITEM_TEMPLATES`:

```ts
  gallery_dagger: { id: 'gallery_dagger', name: 'Daga de la Galería', type: 'equipment', stackable: false, category: 'arma', subcategory: 'espada', classes: ['rogue'], hands: '1H', slot: 'weapon', rarity: 'uncommon', requiredLevel: 18, bonuses: { pAtk: 19 }, description: 'Forjada en la mina para trabajar en espacios estrechos. Brenna la guardaba para un aprendiz ágil.' },
  black_iron_fang: { id: 'black_iron_fang', name: 'Colmillo de Hierro Negro', type: 'equipment', stackable: false, category: 'arma', subcategory: 'espada', classes: ['rogue'], hands: '1H', slot: 'weapon', rarity: 'rare', requiredLevel: 21, bonuses: { pAtk: 21 }, description: 'La última hoja que Halden templó para un aprendiz. El filo guarda un brillo de fragua.' },
  anvil_staff: { id: 'anvil_staff', name: 'Báculo del Yunque', type: 'equipment', stackable: false, category: 'arma', subcategory: 'baston', classes: ['mage'], hands: '2H', slot: 'weapon', rarity: 'rare', requiredLevel: 21, bonuses: { pAtk: 21 }, description: 'Hierro negro coronado por una piedra de fragua. Halden lo usaba para medir el calor del metal.' },
  miner_amulet: { id: 'miner_amulet', name: 'Amuleto del Minero', type: 'equipment', stackable: false, slot: 'accessory', rarity: 'uncommon', requiredLevel: 15, bonuses: { maxHp: 80, pDef: 6 }, description: 'Cada minero de la cuadrilla de Tobías lleva uno. Dicen que avisa cuando el techo cede.' },
```

Agregar al final de `SMITH_STOCK`: `'aden_rodela_del_circulo_de_aden', 'aden_escudo_del_cerco_espinado', 'aden_yelmo_de_el_bastion_de_ceniza', 'aden_yelmo_de_el_enigma_de_umbra', 'aden_yelmo_de_el_vendaval_gris'`, y después del loop que asigna precios por defecto: `Object.assign(SHOP_PRICES, { aden_rodela_del_circulo_de_aden: 650, aden_escudo_del_cerco_espinado: 900, aden_yelmo_de_el_bastion_de_ceniza: 800, aden_yelmo_de_el_enigma_de_umbra: 800, aden_yelmo_de_el_vendaval_gris: 800 });`.

`shared/src/sideChains.ts`: en `SideChainDef` agregar `/** Texto al terminar toda la secuencia. */ finishedText?: string;`. En la cadena `boren` agregar `finishedText: 'Los viajeros tienen provisiones, su familia tiene noticias y los carros están reparados. Gracias por ayudarlos a regresar.'`. Agregar la cadena:

```ts
  { id: 'tobias', npcId: 'tobias', kind: 'sequence', minLevel: 15, announce: true, completeId: 'tobias_complete',
    returnHint: 'Volvé con Tobías en el campamento minero.',
    finishedText: 'La cuadrilla tiene provisiones, el diario está con Brenna y el martillo vuelve a Aden. Gracias por cuidar a los míos.',
    steps: [
      { id: 't_supplies', title: 'Carga perdida en el tajo', objective: 'interact', targetId: 'tobias_crate', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 300, rewardItemId: 'greater_potion', rewardQty: 3,
        intro: 'Una carretilla de provisiones quedó volcada en el tajo oeste (1452, 160). Recuperá lo que puedas y traémelo al campamento.',
        done: 'Pan, aceite y vendas. Con esto la cuadrilla aguanta otra semana ahí abajo. Llevate estas pociones.' },
      { id: 't_diary', title: 'El diario del minero', objective: 'interact', targetId: 'tobias_diary', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 450, rewardItemId: 'greater_potion', rewardQty: 3,
        intro: 'Un minero perdió su diario en la galería este (1548, 128). Anotaba dónde se oían los martillos. Traémelo.',
        done: 'Anotó lo mismo cada noche: «el martillo suena bajo la Puerta». Brenna tiene que leer esto. Tomá tu paga.' },
      { id: 't_hammer', title: 'El martillo de la Hermandad', objective: 'interact', targetId: 'tobias_hammer', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 600, rewardItemId: 'miner_amulet', rewardQty: 1,
        intro: 'El martillo ceremonial de la Hermandad quedó cerca de la Puerta de la Fragua, al oeste (1478, 98). No lo dejes en manos de las armaduras.',
        done: 'Es el martillo con el que Halden tomaba juramento a sus aprendices. Dorne lo va a querer de vuelta. Tomá este amuleto: lo llevaba cada minero de la cuadrilla.' },
    ] },
```

- [ ] **Step 6: Helpers de NPC de campaña**

`shared/src/campaignNpcs.ts`:

```ts
import { CHAPTERS, campaignIndex, chapterAfter, type ChapterDef } from './chapters.js';
import { getQuest } from './quests.js';

/** Primer punto de la campaña en el que un NPC ofrece un capítulo o recibe una misión (null = no participa). */
export function npcFirstAppearance(npcId: string): string | null {
  for (const chapter of CHAPTERS) {
    if (chapter.start?.npcId === npcId) return chapter.start.after;
    for (const id of chapter.questOrder) if ((getQuest(id).returnNpcId ?? 'elder') === npcId) return id;
  }
  return null;
}

export function isCampaignNpc(npcId: string): boolean {
  return npcFirstAppearance(npcId) !== null;
}

export function chapterForComplete(completeId: string): ChapterDef | null {
  return CHAPTERS.find(c => c.completeId === completeId) ?? null;
}

/** ¿El NPC tiene algo de campaña que hacer ahora mismo (ofrecer el capítulo siguiente o recibir la misión actual)? */
export function campaignRoleNow(questId: string, npcId: string): boolean {
  if (chapterAfter(questId)?.start?.npcId === npcId) return true;
  try { return (getQuest(questId).returnNpcId ?? 'elder') === npcId; } catch { return false; }
}

/** ¿El jugador ya llegó al punto de la campaña en que aparece este NPC? */
export function npcReached(questId: string, npcId: string): boolean {
  const first = npcFirstAppearance(npcId);
  return first !== null && campaignIndex(questId) >= campaignIndex(first);
}
```

Agregar `export * from './campaignNpcs.js';` a `shared/src/index.ts`.

- [ ] **Step 7: Verificar datos**

Run: `npx vitest run` (desde `shared/`) + `npx tsc -p shared/tsconfig.json --noEmit`. Expected: verde.

- [ ] **Step 8: Test E2E del server (falla)**

`server/src/rooms/MinesCampaign.test.ts`:

```ts
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, getNpc, getQuest, getWorldObject, MEMORY_COMPLETE, MINES_COMPLETE, questReward } from '@aden/shared';

describe('Mines campaign over real connections', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2597); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  it('starts with Dorne, gates the map and runs the chapter to Halden paying once', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesTraveler', className: 'rogue' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    const replies: { success: boolean; text: string }[] = []; c.onMessage(MessageType.ItemResult, m => replies.push(m));
    p.questId = MEMORY_COMPLETE; p.level = 14; p.mapId = 'pueblo'; p.x = 0; p.z = 0;
    c.send(MessageType.WarpTo, { mapId: 'minas' });
    await vi.waitFor(() => expect(replies.length).toBeGreaterThan(0));
    expect(p.mapId).toBe('pueblo');
    c.send(MessageType.InteractNpc, { npcId: 'smith' });
    await vi.waitFor(() => expect(replies.some(r => r.text.includes('nivel 15'))).toBe(true));
    expect(p.questId).toBe(MEMORY_COMPLETE);
    p.level = 15;
    c.send(MessageType.InteractNpc, { npcId: 'smith' });
    await vi.waitFor(() => expect(p.questId).toBe('f_arrival'));
    c.send(MessageType.WarpTo, { mapId: 'minas' });
    await vi.waitFor(() => expect(p.questProgress).toBe(1));
    expect(p.mapId).toBe('minas');

    const talk = async () => {
      const before = p.questId; const npc = getNpc('brenna'); p.x = npc.x; p.z = npc.z;
      c.send(MessageType.InteractNpc, { npcId: 'brenna' });
      await vi.waitFor(() => expect(p.questId).not.toBe(before));
    };
    const defeat = (template: string, id: string) => {
      p.x = 1500; p.z = 160; p.moving = false;
      const mob = room.spawnMob(id, template, p.x, p.z, 'minas');
      mob.hp = 1; mob.stunMs = 10000; p.targetId = id; p.attackCooldownMs = 0;
      room.tick(.05); expect(mob.dead, template).toBe(true);
    };
    const interact = async (id: string) => {
      const o = getWorldObject(id); p.x = o.x; p.z = o.z;
      c.send(MessageType.InteractObject, { objectId: id }); await room.waitForNextPatch();
    };
    await talk(); expect(p.questId).toBe('f_diggers');
    for (let i = 0; i < 8; i++) defeat('mine_digger', `digger-${i}`);
    await talk(); expect(p.questId).toBe('f_mark_1');
    await interact('mines_mark_2'); expect(p.questId).toBe('f_mark_1');
    await interact('mines_mark_1'); expect(p.questId).toBe('f_mark_2');
    await interact('mines_mark_2'); expect(p.questProgress).toBe(1);
    await talk(); expect(p.questId).toBe('f_armors'); expect(p.inventory.get('aden_escudo_de_los_sepultados')?.qty).toBe(1);
    for (let i = 0; i < 8; i++) defeat('mine_armor', `armor-${i}`);
    await talk(); expect(p.questId).toBe('f_lift');
    await interact('mines_lift'); await talk(); expect(p.questId).toBe('f_trolls');
    for (let i = 0; i < 6; i++) defeat('cave_troll', `troll-${i}`);
    await talk(); expect(p.questId).toBe('f_foreman');
    // Halden todavía no se puede pelear.
    p.x = 1500; p.z = 100; const early = room.spawnMob('halden-early', 'halden', 1500, 100, 'minas'); early.stunMs = 10000;
    p.targetId = 'halden-early'; p.attackCooldownMs = 0; room.tick(.05); expect(early.hp).toBe(early.maxHp);
    room.state.mobs.clear();
    defeat('mine_foreman', 'foreman'); await talk(); expect(p.questId).toBe('f_halden');
    expect(p.inventory.get(questReward(getQuest('f_foreman'), 'rogue')!)?.qty).toBe(1);
    defeat('halden', 'halden'); await talk(); expect(p.questId).toBe(MINES_COMPLETE);
    expect(p.inventory.get('black_iron_fang')?.qty).toBe(1);
    const gold = p.gold;
    c.send(MessageType.InteractNpc, { npcId: 'brenna' }); await room.waitForNextPatch();
    expect(p.gold).toBe(gold); expect(p.questId).toBe(MINES_COMPLETE);
  });

  it('runs Tobías errands and sells supplies only near his post', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesErrands' });
    room.setSimulationInterval(() => {}, 50);
    const p = room.state.players.get(c.sessionId)!;
    const tobias = getNpc('tobias'); p.level = 15; p.mapId = 'minas'; p.x = tobias.x; p.z = tobias.z; p.gold = 1000;
    c.onMessage(MessageType.ItemResult, () => {});
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 });
    await vi.waitFor(() => expect(p.gold).toBeLessThan(1000));
    const gold = p.gold; p.x += 20;
    c.send(MessageType.BuyItem, { itemTemplateId: 'health_potion', qty: 1 }); await room.waitForNextPatch();
    expect(p.gold).toBe(gold);
    const talk = async () => { p.x = tobias.x; p.z = tobias.z; c.send(MessageType.InteractNpc, { npcId: 'tobias' }); await room.waitForNextPatch(); };
    await talk(); expect(p.sideChains.get('tobias')?.id).toBe('t_supplies');
    const crate = getWorldObject('tobias_crate'); p.x = crate.x; p.z = crate.z;
    c.send(MessageType.InteractObject, { objectId: 'tobias_crate' }); await room.waitForNextPatch();
    expect(p.sideChains.get('tobias')?.progress).toBe(1);
    await talk(); expect(p.sideChains.get('tobias')?.id).toBe('t_diary'); expect(p.inventory.get('greater_potion')?.qty).toBe(3);
  });

  it('announces a respawning boss by its own name and map', async () => {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name: 'MinesHerald' });
    room.setSimulationInterval(() => {}, 50); room.state.mobs.clear();
    const texts: string[] = []; c.onMessage(MessageType.WorldAnnounce, m => texts.push(m.text));
    const boss = room.spawnMob('halden-respawn', 'halden', 1500, 97, 'minas');
    boss.dead = true; boss.respawnMs = 1; room.tick(.05);
    await vi.waitFor(() => expect(texts.some(t => t.includes('Maestro Halden') && t.includes('Minas de Hierro Negro'))).toBe(true));
  });
});
```

Run: `npx vitest run src/rooms/MinesCampaign.test.ts` (desde `server/`). Expected: FAIL (Dorne no inicia el capítulo; tienda de Tobías rechazada; anuncio con nombre fijo).

- [ ] **Step 9: Ruteos del server**

En `GameRoom.ts`:

a) `InteractNpc`: reemplazar `if (npc.role === 'elder') this.serveElder(p, client, npcId);` por

```ts
      if (npc.role === 'elder' || campaignRoleNow(p.questId, npcId)) this.serveElder(p, client, npcId);
```

(importar `campaignRoleNow`).

b) `BuyItem`: reemplazar las líneas de `const boren = getNpc('boren');` y `const fieldShop = ...` por

```ts
      const fieldShop = NPCS.some(n => n.shop && n.mapId === p.mapId && distance2D(p.x, p.z, n.x, n.z) <= 5);
```

(importar `NPCS`).

c) Loop de respawn de mobs: reemplazar el anuncio fijo por

```ts
          if (wasBoss) this.broadcast(MessageType.WorldAnnounce, { text: `⚔ ¡${getTemplate(mob.templateId).name} ha despertado en ${getZone(mob.mapId).name}!` });
```

- [ ] **Step 10: Verificar**

Run: `npm test` + tres `tsc`. Expected: verde (incluidos `MinesCampaign.test.ts`, `VeilCampaign.test.ts`, `MonasteryCampaign.test.ts`, `BorenContracts.test.ts`).

- [ ] **Step 11: Commit**

```bash
git add shared/src server/src
git commit -m "feat: add the Black Iron Mines chapter with Brenna, Tobias and Halden"
```

---

### Task 3: Cliente — diálogos y rastreador desde el registro

**Files:**
- Create: `client/src/render/campaignDialog.ts`, `client/src/render/campaignDialog.test.ts`
- Modify: `client/src/main.ts`, `client/src/render/AdventureTracker.ts`, `client/src/render/AdventureTracker.test.ts`, `client/src/net/NetworkClient.ts`

**Interfaces:**
- Consumes: `chapterAfter`, `isChapterComplete`, `chapterForComplete`, `campaignRoleNow`, `isCampaignNpc`, `npcReached`, `SIDE_CHAINS`/`sideChainForNpc`/`sideChainStep`, `questTurnInText`, `firstQuestId`.
- Produces: `campaignDialog(state, npcId): CampaignDialog | null` con `CampaignDialog { text: string; actionLabel: string; send: boolean }`; `SelfCombatSnapshot.sideChains: Record<string, { id: string; progress: number }>`; `AdventureState.sideChains?` (reemplaza `veilContractId`/`veilContractProgress`).

- [ ] **Step 1: Test de la función de diálogo (falla)**

`client/src/render/campaignDialog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { campaignDialog } from './campaignDialog.js';
import { getQuest, MEMORY_COMPLETE, MINES_COMPLETE, VEIL_COMPLETE } from '@aden/shared';

const at = (questId: string, questProgress = 0, level = 30) => ({ questId, questProgress, level });

describe('campaign dialog', () => {
  it('offers the next chapter only through its starter and checks the level', () => {
    const offer = campaignDialog(at(MEMORY_COMPLETE, 0, 15), 'smith')!;
    expect(offer.text).toContain(getQuest('f_arrival').intro); expect(offer.send).toBe(true); expect(offer.actionLabel).toBe('Iniciar expedición');
    expect(campaignDialog(at(MEMORY_COMPLETE, 0, 14), 'smith')!.send).toBe(false);
    const elsewhere = campaignDialog(at(MEMORY_COMPLETE), 'iria')!;
    expect(elsewhere.text).toContain('Herrero Dorne'); expect(elsewhere.send).toBe(false);
    expect(campaignDialog(at(VEIL_COMPLETE, 0, 12), 'maera')!.send).toBe(true);
  });
  it('delivers only to the receiver and reports progress otherwise', () => {
    expect(campaignDialog(at('f_diggers', 8), 'brenna')).toMatchObject({ actionLabel: 'Recibir recompensa', send: true });
    expect(campaignDialog(at('f_diggers', 3), 'brenna')!.text).toContain('(Progreso: 3/8)');
    expect(campaignDialog(at('f_diggers', 8), 'maera')).toMatchObject({ send: false });
    expect(campaignDialog(at('f_diggers', 8), 'maera')!.text).toContain('Capataz Brenna');
  });
  it('tells future NPCs it is not time yet and stays silent for non-campaign NPCs', () => {
    expect(campaignDialog(at('q3'), 'brenna')!.text).toContain('Todavía no es momento');
    expect(campaignDialog(at('q3'), 'merchant')).toBeNull();
    expect(campaignDialog(at(MINES_COMPLETE), 'brenna')!.text).toContain('Halden cayó');
  });
  it('offers the first quest only through Rowan', () => {
    expect(campaignDialog(at(''), 'elder')).toMatchObject({ actionLabel: 'Aceptar', send: true });
    expect(campaignDialog(at(''), 'maera')!.send).toBe(false);
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/render/campaignDialog.test.ts` (desde `client/`). Expected: FAIL.

- [ ] **Step 3: Implementar `campaignDialog.ts`**

```ts
import { chapterAfter, chapterForComplete, isChapterComplete, isCampaignNpc, npcReached, getQuest, getNpc, getZone, firstQuestId, questTurnInText } from '@aden/shared';

export interface CampaignState { questId: string; questProgress: number; level: number }
export interface CampaignDialog { text: string; actionLabel: string; send: boolean }

const info = (text: string): CampaignDialog => ({ text, actionLabel: 'Entendido', send: false });

/** Diálogo de campaña de un NPC según el registro de capítulos; null = el NPC no participa (tienda, servicio…). */
export function campaignDialog(state: CampaignState, npcId: string): CampaignDialog | null {
  const next = chapterAfter(state.questId);
  if (next?.start) {
    if (npcId === next.start.npcId) {
      const ready = state.level >= next.start.minLevel;
      return { text: `${getQuest(next.questOrder[0]).intro}\n\nRequiere nivel ${next.start.minLevel}.`, actionLabel: ready ? 'Iniciar expedición' : 'Volver al camino', send: ready };
    }
    if (!isCampaignNpc(npcId)) return null;
    const starter = getNpc(next.start.npcId);
    const done = chapterForComplete(state.questId)?.completeText;
    return info(`${done ? `${done}\n\n` : ''}${starter.name} te espera en ${getZone(starter.mapId ?? 'pueblo').name} para la próxima expedición (nivel ${next.start.minLevel}).`);
  }
  if (isChapterComplete(state.questId)) return isCampaignNpc(npcId) ? info(chapterForComplete(state.questId)!.completeText) : null;
  if (state.questId === '') {
    if (npcId === 'elder') return { text: getQuest(firstQuestId()).intro, actionLabel: 'Aceptar', send: true };
    return isCampaignNpc(npcId) ? info('Hablá con el Anciano Rowan en la plaza para comenzar tu aventura.') : null;
  }
  let quest;
  try { quest = getQuest(state.questId); } catch { return null; }
  const receiver = quest.returnNpcId ?? 'elder';
  if (npcId !== receiver) {
    if (!isCampaignNpc(npcId)) return null;
    return info(npcReached(state.questId, npcId)
      ? `${getNpc(receiver).name} espera noticias. Seguí el diario de misión y entregá allí tus descubrimientos.`
      : 'Todavía no es momento. Seguí tu camino: cuando llegue la hora te voy a necesitar.');
  }
  if (state.questProgress >= quest.amount) return { text: questTurnInText(quest.id), actionLabel: 'Recibir recompensa', send: true };
  return info(`${quest.intro}\n\n(Progreso: ${state.questProgress}/${quest.amount})`);
}
```

Run el test: PASS.

- [ ] **Step 4: Snapshot con encargos**

En `NetworkClient.ts`: `SelfCombatSnapshot` suma `sideChains: Record<string, { id: string; progress: number }>;` y `getSelf()` agrega

```ts
      sideChains: Object.fromEntries([...(p.sideChains?.entries?.() ?? [])].map(([k, v]: [string, { id: string; progress: number }]) => [k, { id: v.id, progress: v.progress }])),
```

- [ ] **Step 5: Rastreador genérico (test primero)**

En `AdventureTracker.test.ts` agregar:

```ts
  it('hands the Memory ending to Dorne and guides the Mines chapter to Brenna', () => {
    const ending = adventureGuide({ questId: 'memory_campaign_complete', questProgress: 0, mapId: 'pueblo' });
    expect(ending.hint).toContain('Herrero Dorne'); expect(ending.marker).toMatchObject({ label: 'Nueva expedición', x: 9, z: -1 });
    const ready = adventureGuide({ questId: 'f_armors', questProgress: 8, mapId: 'minas' });
    expect(ready.hint).toContain('Brenna'); expect(ready.marker).toMatchObject({ x: 1494, z: 194 });
    expect(adventureGuide({ questId: 'f_mark_1', questProgress: 0, mapId: 'minas' }).marker).toMatchObject({ x: 1478, z: 184 });
  });
  it('lists active errands from any announced side chain', () => {
    const parent = document.createElement('div'); const tracker = new AdventureTracker(parent);
    tracker.update({ questId: 'f_diggers', questProgress: 0, mapId: 'minas', sideChains: { tobias: { id: 't_supplies', progress: 1 }, varek: { id: 'b_forest', progress: 2 } } });
    expect(parent.textContent).toContain('Intendente Tobías · Carga perdida en el tajo');
    expect(parent.textContent).toContain('Listo para entregar');
    expect(parent.textContent).not.toContain('Limpieza del Bosque');
  });
```

En `AdventureTracker.ts`:
- `AdventureState`: reemplazar `veilContractId?`/`veilContractProgress?` por `sideChains?: Record<string, { id: string; progress: number }>;`.
- Reemplazar las tres ramas fijas (`VEIL_COMPLETE`, `MEMORY_COMPLETE`, `"campaign_complete"`) por:

```ts
  const done = chapterForComplete(state.questId);
  if (done) {
    const next = chapterAfter(state.questId);
    if (!next?.start) return { title: done.completeTitle, hint: done.completeText };
    const starter = getNpc(next.start.npcId), mapId = starter.mapId ?? 'pueblo';
    return { title: done.completeTitle,
      hint: `${done.completeText} Hablá con ${starter.name} en ${getZone(mapId).name} para iniciar la próxima expedición (nivel ${next.start.minLevel}).`,
      marker: state.mapId === mapId ? { ...starter, label: 'Nueva expedición' } : undefined };
  }
```

- En `update`, reemplazar el bloque de `getVeilContract` por:

```ts
    const errands = SIDE_CHAINS.filter(c => c.announce).flatMap(chain => {
      const entry = state.sideChains?.[chain.id]; const step = entry ? sideChainStep(chain, entry.id) : undefined;
      if (!entry || !step) return [];
      return [`${getNpc(chain.npcId).name} · ${step.title}\n${entry.progress >= step.amount ? `Listo para entregar. ${chain.returnHint ?? ''}` : step.intro}`];
    });
    const errandText = errands.join('\n\n');
    this.contract.hidden = errands.length === 0;
    if (this.contract.textContent !== errandText) this.contract.textContent = errandText;
```

- Imports: `chapterAfter`, `chapterForComplete`, `SIDE_CHAINS`, `sideChainStep` desde `@aden/shared`; quitar `VEIL_COMPLETE`, `MEMORY_COMPLETE`, `getVeilContract`.
- El test existente `'does not show unknown quest for campaign completion'` sigue esperando `Campaña completada` (título del capítulo act1). El de Veil sigue esperando `El camino recuperado` y el marcador `Nueva expedición` en Maera.

- [ ] **Step 6: `main.ts`**

a) Tiendas de campo por NPC: reemplazar `const fieldShop = new ShopPanel(...)` y su `setGreeting` por

```ts
  const FIELD_SHOP_GREETINGS: Record<string, string> = {
    boren: 'Llegaron sin nombres, pero todavía necesitan comer. Maera busca respuestas; yo mantengo este puesto en pie. Llevá pociones y munición antes de seguir al norte.',
    tobias: 'La mina no perdona al que baja sin provisiones. Llevá pociones y munición; lo demás lo pone Brenna.',
  };
  const fieldShops = new Map(NPCS.filter(n => n.shop).map(n => {
    const panel = new ShopPanel(itemId => net.sendBuyItem(itemId), { title: `Provisiones de ${n.name.split(' ').pop()}` });
    panel.setGreeting(FIELD_SHOP_GREETINGS[n.id] ?? '');
    return [n.id, panel] as const;
  }));
  const closeFieldShops = () => fieldShops.forEach(panel => panel.close());
```

b) En `interactNpc`, después del gate de cercanía, reemplazar desde `if (npcId === 'boren') {` hasta el final de la función por:

```ts
    const chain = sideChainForNpc(npcId);
    if (chain) {
      shopPanel.close(); smithPanel.close(); closeFieldShops();
      const entry = self.sideChains[chain.id], step = entry ? sideChainStep(chain, entry.id) : chain.steps[0];
      const finished = entry?.id === chain.completeId, ready = !!entry && !!step && entry.progress >= step.amount;
      const reward = step ? `Recompensa: ${step.rewardGold} oro${step.rewardItemId ? ` y ${step.rewardQty ?? 1} ${getItem(step.rewardItemId).name}` : ''}.` : '';
      const shop = fieldShops.get(npcId);
      dialog.open({ speaker,
        text: finished || !step ? (chain.finishedText ?? '') : `${step.title}\n\n${ready ? step.done : step.intro}\n\n${reward}`,
        actionLabel: finished ? 'Gracias' : ready ? 'Entregar encargo' : entry ? 'Seguir buscando' : 'Aceptar encargo',
        onAction: () => { if (!finished && (!entry || ready)) net.sendInteractNpc(npcId); },
        secondaryAction: shop ? { label: 'Comprar provisiones', onAction: () => { shop.updateGold(self.gold); shop.toggle(); } } : undefined });
      return;
    }
    const d = campaignDialog({ questId: self.questId, questProgress: self.questProgress, level: self.level }, npcId);
    if (!d) return;
    const advice = self.questId === 'q_alpha' && !d.send ? `\n\n${classAdvice(self.className, self.level)}` : '';
    dialog.open({ speaker, text: d.text + advice, actionLabel: d.actionLabel, onAction: () => { if (d.send) net.sendInteractNpc(npcId); } });
```

(Si `dialog.open` no acepta `secondaryAction: undefined`, construir el objeto sin esa clave cuando no hay tienda.)

c) `interactSmith`: al principio, después de `if (!net.getSelf()) return;` y del gate `nearTown()`:

```ts
    const self = net.getSelf()!;
    if (campaignRoleNow(self.questId, 'smith')) {
      const d = campaignDialog({ questId: self.questId, questProgress: self.questProgress, level: self.level }, 'smith')!;
      shopPanel.close(); smithPanel.close();
      dialog.open({ speaker: getNpc('smith').name, text: d.text, actionLabel: d.actionLabel,
        onAction: () => { if (d.send) net.sendInteractNpc('smith'); },
        secondaryAction: { label: 'Abrir la fragua', onAction: () => { smithPanel.setGreeting(serviceStory('smith', '')); smithPanel.toggle(); } } });
      return;
    }
```

d) Loop de NPC regionales: reemplazar `if(def.id==='boren')ready=...` por

```ts
      const chain = sideChainForNpc(def.id);
      if (chain) { const entry = selfCombat?.sideChains?.[chain.id]; const step = entry ? sideChainStep(chain, entry.id) : undefined; ready = !!entry && !!step && entry.progress >= step.amount; }
```

y las líneas de `fieldShop` por

```ts
    fieldShops.forEach((panel, npcId) => {
      if (myMapId !== getNpc(npcId).mapId) panel.close();
      else if (selfCombat && panel.isOpen()) panel.updateGold(selfCombat.gold);
    });
```

e) Imports: agregar `campaignDialog` (desde `./render/campaignDialog.js`), `NPCS`, `sideChainForNpc`, `sideChainStep`, `campaignRoleNow`; quitar los imports que queden sin uso (`VEIL_COMPLETE`, `MEMORY_COMPLETE`, `VEIL_QUEST_ORDER`, `MONASTERY_QUEST_ORDER`, `VEIL_CONTRACTS`, `VEIL_CONTRACTS_COMPLETE`, `getVeilContract`, `firstQuestId`, `questTurnInText` si ya no se usan acá). `tsc` los señala.

- [ ] **Step 7: Verificar**

Run: `npm test` + `npx tsc -p client/tsconfig.json --noEmit` (y los otros dos). Expected: verde.

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "refactor: drive NPC dialogs and the tracker from the chapter and errand registries"
```

---

### Task 4: Ambientación de las Minas

**Files:**
- Create: `client/src/render/MinesEnvironment.ts`, `client/src/render/MinesEnvironment.test.ts`
- Modify: `client/src/render/Environment.ts`

**Interfaces:**
- Consumes: `MINES_PITS`, `MINES_LIFT`, `MINES_GATE`, `getZone('minas')`.
- Produces: `addMinesEnvironment(scene: THREE.Scene): THREE.Group` (grupo `minas-landmarks`).

- [ ] **Step 1: Test (falla)**

`client/src/render/MinesEnvironment.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MINES_PITS, MINES_GATE, getZone } from '@aden/shared';
import { addMinesEnvironment } from './MinesEnvironment.js';

describe('Mines environment', () => {
  it('draws each pit on its authoritative footprint and keeps the scenery inside the map', () => {
    const scene = new THREE.Scene();
    const root = addMinesEnvironment(scene);
    expect(root.name).toBe('minas-landmarks');
    for (const [i, pit] of MINES_PITS.entries()) {
      const mesh = root.getObjectByName(`mines-pit-${i}`) as THREE.Mesh<THREE.PlaneGeometry>;
      expect(mesh.position.x).toBe(pit.x); expect(mesh.position.z).toBe(pit.z);
      expect(mesh.geometry.parameters.width).toBe(pit.width); expect(mesh.geometry.parameters.height).toBe(pit.depth);
    }
    expect(root.getObjectByName('mines-forge-glow')!.position.z).toBeLessThan(MINES_GATE.z + 1);
    const b = getZone('minas').bounds;
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const p = new THREE.Vector3(); o.getWorldPosition(p);
      expect(p.x).toBeGreaterThanOrEqual(b.minX); expect(p.x).toBeLessThanOrEqual(b.maxX);
      expect(p.z).toBeGreaterThanOrEqual(b.minZ - 6); expect(p.z).toBeLessThanOrEqual(b.maxZ);
    });
  });
});
```

- [ ] **Step 2: Correrlo y ver que falla**

Run: `npx vitest run src/render/MinesEnvironment.test.ts` (desde `client/`). Expected: FAIL.

- [ ] **Step 3: Implementar**

`client/src/render/MinesEnvironment.ts`:

```ts
import * as THREE from 'three';
import { MINES_PITS, MINES_LIFT, MINES_GATE, getZone } from '@aden/shared';
import { woodMat, metalMat, crackedStoneMat } from './textures.js';

/** Minas de Hierro Negro: pozos (mismas huellas que la navegación), vías, faroles, pared de roca y la Puerta encendida. */
export function addMinesEnvironment(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group(); root.name = 'minas-landmarks';
  const zone = getZone('minas'), b = zone.bounds;
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 1 });
  const timber = woodMat(0x5b4a38, [1, 2]), iron = metalMat(0x4d4f52), rock = crackedStoneMat(0x4a4540, [2, 2]);

  // Pozos: fondo oscuro y un marco de vigas al ras del suelo.
  for (const [i, pit] of MINES_PITS.entries()) {
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(pit.width, pit.depth), dark);
    hole.name = `mines-pit-${i}`; hole.rotation.x = -Math.PI / 2; hole.position.set(pit.x, 0.05, pit.z);
    hole.userData.ground = true; root.add(hole);
    for (const side of [-1, 1]) {
      const along = new THREE.Mesh(new THREE.BoxGeometry(pit.width + 0.6, 0.3, 0.3), timber);
      along.position.set(pit.x, 0.15, pit.z + side * pit.depth / 2); root.add(along);
      const across = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, pit.depth + 0.6), timber);
      across.position.set(pit.x + side * pit.width / 2, 0.15, pit.z); root.add(across);
    }
  }

  // Vías de vagoneta a lo largo del camino principal (planas: el suelo de colisión sigue en y=0).
  for (const dx of [-0.7, 0.7]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 96), iron);
    rail.position.set(zone.center.x + dx, 0.06, zone.center.z + 4); root.add(rail);
  }
  for (let i = 0; i < 48; i++) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.3), timber);
    tie.position.set(zone.center.x, 0.04, zone.center.z - 44 + i * 2); root.add(tie);
  }

  // Faroles de aceite a los costados del camino.
  for (let i = 0; i < 6; i++) {
    const z = 190 - i * 17;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), timber);
      post.position.set(zone.center.x + side * 4.5, 1.3, z); root.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffc36b, emissive: 0xff9a3c, emissiveIntensity: 1.6 }));
      lamp.position.set(zone.center.x + side * 4.5, 2.7, z); root.add(lamp);
    }
  }

  // Pared de roca en el borde norte, detrás de la Puerta.
  for (let x = b.minX + 4; x <= b.maxX - 4; x += 7) {
    const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rock);
    const s = 3.5 + ((x * 13) % 7) * 0.4;
    boulder.scale.set(s, s * 1.6, s); boulder.position.set(x, s * 0.7, b.minZ - 3); root.add(boulder);
  }

  // Resplandor de la Fragua detrás de la Puerta.
  const glow = new THREE.PointLight(0xff7a2a, 3.2, 30, 1.6);
  glow.name = 'mines-forge-glow'; glow.position.set(MINES_GATE.x, 4, MINES_GATE.z - 1); root.add(glow);
  const heart = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, opacity: 0.55 }));
  heart.position.set(MINES_GATE.x, 3.5, MINES_GATE.z - 1.4); root.add(heart);

  // Polea del castillete: gira lenta sobre el montacargas (decorativa, sin colisión).
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 18), iron);
  wheel.name = 'mines-lift-wheel'; wheel.position.set(MINES_LIFT.x, 7.3, MINES_LIFT.z); wheel.rotation.y = Math.PI / 2; root.add(wheel);

  scene.add(root);
  return root;
}
```

En `Environment.ts`: importar `addMinesEnvironment` y llamarlo en `structures()` junto a `addVeilEnvironment(this.scene); addMonasteryEnvironment(this.scene);`.

- [ ] **Step 4: Verificar**

Run: `npm test` + `npx tsc -p client/tsconfig.json --noEmit`. Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat: dress the Black Iron Mines with pits, rails, lamps and the forge gate"
```

---

### Task 5: Calibración del combate con el simulador

**Files:**
- Modify: `server/src/sim/scenarios.ts`, `server/scripts/balance.ts`, `server/src/sim/BalanceSimulator.test.ts`, `shared/src/combat.ts` (MOB_COMBAT de las Minas)
- Create: `artifacts/balance/mines.json` (generado)

**Interfaces:**
- Consumes: `BalanceSimulator.fight`, `questReward`.
- Produces: `minesScenarios(className): Scenario[]`; `npm run balance --workspace @aden/server -- --mines`.

- [ ] **Step 1: Escenarios**

En `scenarios.ts`:
- `GearStage` suma `'mines'` y `'mines_late'`.
- En `gearFor`: `case 'mines': return { weapon: crypt, armor: 'nihil_aegis', accessory: 'memory_locket', ring: 'aden_sello_del_veneno_antiguo' };` y `case 'mines_late': return { weapon: questReward(getQuest('f_foreman'), className)!, armor: 'nihil_aegis', accessory: 'memory_locket', ring: 'aden_sello_del_veneno_antiguo' };` (importar `questReward`, `getQuest`).
- Nueva función:

```ts
/** Enemigos de las Minas al nivel previsto de la ruta. */
export function minesScenarios(className: string): Scenario[] {
  return [
    scenario('Excavador', 'mine_digger', profile(className, 15, 'mines')),
    scenario('Armadura', 'mine_armor', profile(className, 16, 'mines')),
    scenario('Troll', 'cave_troll', profile(className, 18, 'mines')),
    scenario('Capataz', 'mine_foreman', profile(className, 19, 'mines')),
    scenario('Halden', 'halden', profile(className, 20, 'mines_late', 'f_halden')),
  ];
}
```

- [ ] **Step 2: CLI**

En `server/scripts/balance.ts`, agregar una rama antes del `else`:

```ts
  } else if (process.argv.includes('--mines')) {
    const rows: FightResult[] = [];
    for (const cls of CLASS_ORDER) for (const s of minesScenarios(cls)) for (const b of ['attentive', 'stationary'] as Behavior[]) rows.push(sim.fight(s, b));
    writeFileSync(`${OUT}/mines.json`, JSON.stringify(rows, null, 2));
    for (const name of [...new Set(rows.map(r => r.scenario))]) {
      const attentive = rows.filter(r => r.scenario === name && r.behavior === 'attentive');
      const times = attentive.filter(r => r.outcome === 'kill').map(r => r.seconds).sort((a, b) => a - b);
      console.log(`${name}: mediana ${times[Math.floor(times.length / 2)] ?? '—'} s · atento ${attentive.map(r => `${r.className}:${r.outcome}/${r.seconds}`).join(' ')} · quieto ${rows.filter(r => r.scenario === name && r.behavior === 'stationary').map(r => r.outcome).join(',')}`);
    }
```

(importar `minesScenarios`).

- [ ] **Step 3: Tests de balance (fallarán hasta calibrar)**

En `BalanceSimulator.test.ts`:

```ts
  it('calibrates the Mines: normals 5–9 s, the foreman 15–30 s and Halden 60–100 s (median, attentive)', () => {
    const median = (name: string) => {
      const t = CLASS_ORDER.map(cls => sim.fight(minesScenarios(cls).find(s => s.name === name)!, 'attentive'))
        .map(r => r.outcome === 'kill' ? r.seconds : Infinity).sort((a, b) => a - b);
      return t[Math.floor(t.length / 2)];
    };
    for (const name of ['Excavador', 'Armadura', 'Troll']) { const m = median(name); expect(m, name).toBeGreaterThanOrEqual(5); expect(m, name).toBeLessThanOrEqual(9); }
    const foreman = median('Capataz'); expect(foreman).toBeGreaterThanOrEqual(15); expect(foreman).toBeLessThanOrEqual(30);
    const halden = median('Halden'); expect(halden).toBeGreaterThanOrEqual(60); expect(halden).toBeLessThanOrEqual(100);
  });
  it('lets an attentive knight beat Halden but not a stationary one', () => {
    const halden = minesScenarios('knight').find(s => s.name === 'Halden')!;
    expect(sim.fight(halden, 'attentive').outcome).toBe('kill');
    expect(sim.fight(halden, 'stationary').outcome).not.toBe('kill');
  });
```

(importar `CLASS_ORDER` desde `@aden/shared` y `minesScenarios`).

- [ ] **Step 4: Calibrar**

Run: `npm run balance --workspace @aden/server -- --mines`. Para cada enemigo, ajustar `maxHp` en `MOB_COMBAT` con la regla `nuevo = round(actual × objetivo / mediana, a 50)`, donde objetivo es 7 s (normales), 22 s (capataz) y 80 s (Halden). Repetir hasta tres rondas. Si el caballero atento muere contra Halden con la vida ya calibrada, bajar `pAtk` de Halden un 5 % por ronda (máximo 3 rondas). Si el bot quieto vence a Halden, subir `pAtk` un 5 %. Si tras seis rondas no se cumplen los tests, **detenerse y reportar BLOCKED** con la tabla de rondas.

- [ ] **Step 5: Verificar y generar artefactos**

Run: `npm test` + tres `tsc`; luego `npm run balance --workspace @aden/server -- --mines`. Expected: verde y `artifacts/balance/mines.json` actualizado. Anotar los valores finales de `MOB_COMBAT` en el reporte de la tarea.

- [ ] **Step 6: Commit**

```bash
git add server/src/sim server/scripts shared/src/combat.ts artifacts/balance/mines.json
git commit -m "feat: calibrate the Mines enemies with the balance simulator"
```

---

### Task 6: Verificación final

- [ ] **Step 1: Suite, tipos y builds**

Run (raíz): `npm test`, los tres `tsc`, `npm run build --workspace @aden/client`, `npm run build --workspace @aden/server`. Expected: verde.

- [ ] **Step 2: Recorrido en navegador contra server local**

Levantar `server` y `client` con `preview_start` (server local sin `server/.env` = persistencia en memoria). En el navegador: crear un personaje; desde la consola del server no hay atajos, así que verificar lo visible:
- `M` muestra "Minas de Hierro Negro" (nivel 15) en la lista de mapas.
- Hablar con Dorne sin estar en el capítulo abre su tienda (sin diálogo de campaña).
- Sin errores de consola del juego.

El recorrido completo del capítulo lo cubre `MinesCampaign.test.ts`; la vista del mapa requiere nivel 15, que el personaje nuevo no tiene: dejar anotado en el reporte que la verificación visual del mapa queda para el usuario en producción.

- [ ] **Step 3: Entregar al usuario**

Reportar tests, tipos, builds, navegador y los valores calibrados. Pedir OK para integrar `fragua-minas` en `master` y pushear (el server se redeploya solo: el watch pattern incluye `/shared/**`).
