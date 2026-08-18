# Etapa 6 — El Rey Esqueleto (jefe) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Darle un objetivo climático al juego. Un **jefe** — el **Rey Esqueleto** — aparece en una arena lejos del pueblo: mucho HP, pega fuerte, respawnea lento, y suelta **loot especial** (mucho oro + pociones garantizadas + un trofeo raro, la **Corona del Rey Esqueleto**). Una **misión** (q4) pide derrotarlo. Aprovecha todo el kit de skills y las pociones. Server-autoritativo.

**Architecture:** Los sistemas ya son data-driven (spawn por `SPAWN_ZONES`, combate por `MOB_COMBAT`, loot por `DROP_TABLES[templateId]`, progreso de misión por `mobTemplateId`, exp por `MOB_EXP`). Así que el jefe es casi todo **config en `shared`** + un cambio chico en el server (respawn por-template) + un cambio chico en el cliente (escalar el modelo del jefe + nameplate). No hay mecánica nueva de combate.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints
- ESM, `strict: true`. TDD en lo puro. Server autoritativo. No romper etapas previas (spawns/combate/loot/misiones/tienda/clases/skills/persistencia).
- Reusar modelos existentes: el jefe usa el modelo `Skeleton_Warrior` **escalado** (~1.9x) — no hay modelo nuevo. Se distingue por tamaño + nameplate rojo.
- El jefe es 1 instancia en una arena lejos del pueblo y de las zonas actuales; respawn lento (~45s).

## Valores de referencia (ajustables manteniendo el balance)
- **skeleton_king**: name "Rey Esqueleto", model "Skeleton_Warrior", boss:true, scale 1.9, respawnMs 45000.
  - Combate: maxHp 600, pAtk 24, pDef 18, attackCooldownMs 2200 (pega fuerte pero lento → se puede kitear/curar).
  - EXP: 300. Zona: center (0, -42), radius 2, count 1.
- **Loot skeleton_king**: gold ×(50–100) chance 1.0; health_potion ×(2–3) chance 1.0; skull_crown ×1 chance 1.0; bone ×(3–5) chance 1.0.
- **skull_crown**: item type "material" (trofeo), name "Corona del Rey Esqueleto", stackable false.
- **Quest q4**: "Derrota al Rey Esqueleto", mobTemplateId "skeleton_king", amount 1, rewardExp 400, rewardGold 200. QUEST_ORDER = [q1,q2,q3,q4]; nextQuestId(q4)=q1.

---

## File Structure
```
shared/src/mobs.ts        (MODIFICAR) MobTemplate gana boss?:boolean, scale?:number, respawnMs?:number. Agregar skeleton_king. SPAWN_ZONES += zona del jefe. Helpers: isBoss(templateId), scaleForTemplate(templateId) (default 1), respawnForTemplate(templateId) (default MOB_RESPAWN_MS-equivalente vía undefined).
shared/src/combat.ts      (MODIFICAR) MOB_COMBAT += skeleton_king.
shared/src/progression.ts (MODIFICAR) MOB_EXP += skeleton_king: 300.
shared/src/items.ts       (MODIFICAR) ITEM_TEMPLATES += skull_crown; DROP_TABLES += skeleton_king.
shared/src/quests.ts      (MODIFICAR) QUESTS += q4; QUEST_ORDER += "q4".
shared/src/*.test.ts      (MODIFICAR/NUEVO) cubrir: template/combat/exp/drop del jefe, isBoss/scale, q4 y el loop q4→q1.

server/src/rooms/GameRoom.ts (MODIFICAR) en killMob (donde hoy setea mob.respawnMs = MOB_RESPAWN_MS): usar el respawn por-template del jefe (getTemplate(templateId).respawnMs ?? MOB_RESPAWN_MS). El spawn del jefe ya sale de SPAWN_ZONES. Nada más.

client/src/render/EntityViews.ts (MODIFICAR) addMob acepta el templateId (o un scale): escalar view.object (scaleForTemplate) y, si isBoss, agregar un nameplate rojo con el nombre del jefe (getTemplate(templateId).name).
client/src/assets/manifest.ts   (MODIFICAR) modelForTemplate ya resuelve skeleton_king→Skeleton_Warrior (usa template.model). (Verificar; si falta el template, Task 1 lo agrega.)
client/src/main.ts              (MODIFICAR) onMobAdd pasa templateId a addMob (hoy pasa modelName+snap).
```

---

### Task 1: Shared — el jefe como config (mob, combate, exp, loot, quest) (puro, TDD)
**Files:** Modify `shared/src/mobs.ts`, `combat.ts`, `progression.ts`, `items.ts`, `quests.ts`, `index.ts`, tests.
- `MobTemplate`: `boss?: boolean; scale?: number; respawnMs?: number`. Agregar `skeleton_king` (valores de arriba). `SPAWN_ZONES` += `{ id:"boss_rey", templateId:"skeleton_king", centerX:0, centerZ:-42, radius:2, count:1 }`.
- Helpers en mobs.ts: `isBoss(templateId): boolean` (template.boss===true), `scaleForTemplate(templateId): number` (template.scale ?? 1), `respawnForTemplate(templateId): number | undefined` (template.respawnMs).
- `combat.ts` MOB_COMBAT += skeleton_king {maxHp:600, pAtk:24, pDef:18, attackCooldownMs:2200}. `progression.ts` MOB_EXP += skeleton_king:300.
- `items.ts`: ITEM_TEMPLATES += `skull_crown {id, name:"Corona del Rey Esqueleto", type:"material", stackable:false}`. DROP_TABLES += skeleton_king (gold 50-100 c1, health_potion 2-3 c1, skull_crown 1 c1, bone 3-5 c1).
- `quests.ts`: QUESTS += q4 {id:"q4", title:"Derrota al Rey Esqueleto", mobTemplateId:"skeleton_king", amount:1, rewardExp:400, rewardGold:200}. QUEST_ORDER = ["q1","q2","q3","q4"]. (nextQuestId(q4) debe volver a q1 — ya lo hace por el loop.)
- [ ] Tests RED→GREEN (`npm test --workspace @aden/shared`): getTemplate("skeleton_king").boss===true, scaleForTemplate 1.9, getMobCombat 600hp, getMobExp 300, rollDrops del jefe incluye skull_crown, getQuest("q4"), nextQuestId("q4")==="q1". Preservar todo lo previo.
- [ ] Commit `feat(shared): jefe Rey Esqueleto (mob/combate/exp/loot/quest q4)`.

### Task 2: Server — respawn por-template del jefe
**Files:** Modify `server/src/rooms/GameRoom.ts`.
- En `killMob` (línea ~328, `mob.respawnMs = MOB_RESPAWN_MS`): `mob.respawnMs = respawnForTemplate(mob.templateId) ?? MOB_RESPAWN_MS;` (import respawnForTemplate). El resto (spawn del jefe vía SPAWN_ZONES, loot, exp, progreso de misión) ya funciona genérico.
- [ ] `npx tsc -p server/tsconfig.json --noEmit` + `npm test --workspace @aden/server`. Boot OK: confirmar que aparece 1 `skeleton_king` en el estado al crear la sala.
- [ ] Commit `feat(server): respawn lento del jefe (por-template)`.

### Task 3: Client — jefe grande + nameplate
**Files:** Modify `client/src/render/EntityViews.ts`, `client/src/main.ts`, (verificar `manifest.ts`).
- `main.ts` onMobAdd: pasar `templateId` a `addMob` (además del modelName+snap), o pasar el scale ya calculado.
- `EntityViews.addMob`: aplicar `view.object.scale.setScalar(scaleForTemplate(templateId))`. Si `isBoss(templateId)`: agregar un nameplate (reusar Nameplates o un CSS2D) con `getTemplate(templateId).name` en rojo, y (opcional) barra de HP más grande/roja. La HealthBar sobre la cabeza ya muestra HP.
- Verificar `modelForTemplate("skeleton_king")` → "Skeleton_Warrior" (via template.model). 
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): render del jefe (modelo escalado + nameplate del Rey Esqueleto)`.

### Task 4: Verificación (controller)
- [ ] E2E (@colyseus/testing): al crear la sala hay exactamente 1 mob con templateId "skeleton_king" y hp 600. Simular su muerte (via killMob o bajando hp y matándolo) con un killer → dropea skull_crown (aparece en droppedItems) y da 300 exp; si el killer tenía q4 activa con progreso 0, questProgress sube a 1 (completa). Documentar PASS/FAIL. Correr tsc estricto server + full suite.
- [ ] Boot del cliente: el Rey Esqueleto renderiza más grande con su nombre. (Visual lo confirma el usuario.)

---

## Self-Review
- **Objetivo climático / jefe:** Tasks 1–3 (mob potente + arena + loot + quest).
- **Loot especial (trofeo):** Task 1 (skull_crown + drop garantizado).
- **Reusa sistemas:** spawn/combate/loot/quest/exp genéricos → cambio mínimo server/cliente.
- **Server autoritativo:** combate/loot/respawn/quest 100% server.
- **Fuera de alcance (futuro):** barra de jefe en pantalla (screen boss-bar), mecánicas de jefe (fases/AoE), modelo propio del jefe, party/raid, uso del trofeo (craftear/vender), balance fino.
