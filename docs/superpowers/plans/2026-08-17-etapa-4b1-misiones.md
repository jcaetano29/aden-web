# Etapa 4b-1 — Sistema de misiones (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Darle un objetivo claro al juego. Un **NPC en el pueblo** da misiones de matar mobs; el server trackea el progreso al matar; cuando la completás, volvés al NPC y la entregás por recompensa (**EXP + oro**), y te da la siguiente. Un **tracker de misión** en el HUD muestra el objetivo y el progreso. El **oro** pasa a ser una moneda dedicada (el loot de tipo "currency" va a un contador de oro, no al inventario). Sin tienda/pociones todavía (Etapa 4b-2).

**Architecture:** Definiciones de misiones puras en `shared` (encadenadas). `PlayerState` suma `questId`, `questProgress`, `gold`. El progreso se incrementa server-side en `killMob` (si el mob matcha la misión activa). El NPC es una entidad fija del cliente en el pueblo (0,0); clickearlo manda `interactNpc`; el server acepta la misión (si no hay activa) o la entrega (si está completa) → recompensa + siguiente. La persistencia (Supabase/InMemory) suma gold/questId/questProgress. HUD muestra misión + oro. Server autoritativo; el cliente solo manda `interactNpc` + muestra estado sincronizado.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

**Spec:** feedback del usuario (2026-08-17): dinámica elegida = "Misiones + pueblo estilo L2".

## Global Constraints

- ESM, `strict: true`. TDD en lo puro (defs de misiones + avance de progreso + lógica de accept/turn-in si se extrae pura).
- Server autoritativo: progreso/recompensa/oro 100% server. Nuevo mensaje cliente→servidor: `interactNpc` (sin payload o `{npcId}`). Sin más.
- Oro = moneda dedicada: al levantar loot de tipo `currency` (gold), sumar a `player.gold` (no al inventario). El resto de ítems siguen al inventario.
- Persistir gold/questId/questProgress (extender CharacterSave + el wiring de load/save).
- v1: misiones SOLO de matar (`kill`) mobs de un template. Encadenadas (una activa a la vez). Al entregar la última, se puede repetir la cadena o marcar "sin misiones" (elegir: loop simple).
- No romper etapas previas.

---

## File Structure

```
shared/src/quests.ts             (NUEVO) Quest, QUESTS, QUEST_ORDER, getQuest, firstQuestId, nextQuestId (puros)
shared/src/quests.test.ts        (NUEVO)
shared/src/protocol.ts           (MODIFICAR) MessageType.InteractNpc (+ opcional QuestComplete event)

server/src/state/PlayerState.ts  (MODIFICAR) questId (@type ""), questProgress (@type 0), gold (@type 0)
server/src/persistence/CharacterSave.ts (MODIFICAR) gold, questId, questProgress en el save/serialize
server/src/rooms/GameRoom.ts     (MODIFICAR) init quest inicial en onJoin; progreso en killMob; gold en auto-pickup (currency→gold); handler interactNpc (accept/turn-in); load/save de los campos nuevos

client/src/render/Npc.ts         (NUEVO) mesh del NPC (quest giver) en el pueblo + halo/indicador
client/src/render/Hud.ts         (MODIFICAR) línea de misión ("Objetivo: matá X de Y — n/amount") + oro
client/src/input/InputController.ts (MODIFICAR) click sobre el NPC → onInteractNpc (raycast al NPC, antes que suelo/mob)
client/src/net/NetworkClient.ts  (MODIFICAR) sendInteractNpc; getSelf expone gold/questId/questProgress
client/src/main.ts               (MODIFICAR) instanciar Npc; wire interactNpc; pasar quest/gold al HUD
```

---

### Task 1: Shared — definiciones de misiones (puro, TDD)

**Files:** Create: `shared/src/quests.ts`, `shared/src/quests.test.ts`; Modify: `shared/src/protocol.ts`, `shared/src/index.ts`

**Interfaces:**
- `interface Quest { id: string; title: string; mobTemplateId: string; amount: number; rewardExp: number; rewardGold: number }`
- `QUESTS: Record<string, Quest>` (3 misiones, p.ej. `q1` matá 5 skeleton_minion → 50 exp/20 oro; `q2` matá 8 skeleton_minion → 80/40; `q3` matá 5 skeleton_warrior → 150/80).
- `QUEST_ORDER: string[]` (["q1","q2","q3"]).
- `getQuest(id): Quest` (lanza si falta); `firstQuestId(): string` (QUEST_ORDER[0]); `nextQuestId(current: string): string` — el siguiente en QUEST_ORDER, o vuelve al primero (loop) tras el último.
- Protocolo: `MessageType.InteractNpc = "interactNpc"`; `interface InteractNpcMessage {}` (o `{ npcId?: string }`).

- [ ] **Step 1: Test que falla** — getQuest+throw, firstQuestId, nextQuestId (q1→q2→q3→q1 loop), valores de una quest.
- [ ] **Step 2-4: RED → implementar → GREEN.** `npm test --workspace @aden/shared`.
- [ ] **Step 5: protocolo + index export. Step 6: Commit** `git commit -m "feat(shared): definiciones de misiones + protocolo interactNpc"`.

---

### Task 2: Server — campos de quest/oro en PlayerState + persistencia

**Files:** Modify: `server/src/state/PlayerState.ts`, `server/src/persistence/CharacterSave.ts` (+ su test), `server/src/rooms/GameRoom.ts` (load/save wiring)

- [ ] **Step 1:** `PlayerState` agrega `@type("string") questId = ""`, `@type("number") questProgress = 0`, `@type("number") gold = 0` (sincronizados — el HUD los muestra).
- [ ] **Step 2:** `CharacterSave` gana `gold`, `questId`, `questProgress`; `toCharacterSave` los incluye (desde el PlayerState). Actualizar el test de CharacterSave.
- [ ] **Step 3:** En `GameRoom` load (onJoin): aplicar `gold/questId/questProgress` del save si existe; si es personaje nuevo, `questId = firstQuestId()`, `questProgress = 0`, `gold = 0`. En save (toCharacterSave ya los toma).
- [ ] **Step 4:** `npx tsc`; `npm test --workspace @aden/server` (existentes + CharacterSave test). Boot OK.
- [ ] **Step 5: Commit** `git commit -m "feat(server): quest y oro en PlayerState + persistencia"`.

---

### Task 3: Server — progreso de misión, oro y handler interactNpc

**Files:** Modify: `server/src/rooms/GameRoom.ts`

- [ ] **Step 1: Progreso en `killMob`** — tras otorgar EXP al killer: si `killer.questId` está activa y `getQuest(killer.questId).mobTemplateId === mob.templateId` y `killer.questProgress < quest.amount`, incrementar `killer.questProgress`.
- [ ] **Step 2: Oro en auto-pickup** — en el bloque de auto-pickup, si `getItem(it.itemTemplateId).type === "currency"`, hacer `p.gold += it.qty` (en vez de agregar al inventario); el resto de ítems siguen al inventario como ahora.
- [ ] **Step 3: Handler `interactNpc`** — `onMessage(InteractNpc, (client) => {...})`:
  - `p = players.get(sessionId)`; si `p.dead` return.
  - `q = getQuest(p.questId)` (si `p.questId===""`, asignar `firstQuestId()` y return —"te doy una misión"—; o directamente asignar la primera).
  - Si `p.questProgress >= q.amount` → **entregar**: `gainExp(p, q.rewardExp)` (sube nivel si corresponde + LevelUp dirigido, como killMob), `p.gold += q.rewardGold`, `p.questId = nextQuestId(p.questId)`, `p.questProgress = 0`. Broadcast/emit opcional de feedback al client (o el HUD lo refleja del estado).
  - Si aún no está completa → no-op (o un mensaje "todavía no terminaste"). El NPC solo entrega cuando está lista.
  - Validar que el jugador esté cerca del NPC (pueblo 0,0, dentro de un radio ~4) para entregar — opcional pero lindo (el NPC está en el pueblo).
- [ ] **Step 4:** `npx tsc`; `npm test --workspace @aden/server` (existentes verdes). Boot OK.
- [ ] **Step 5: Commit** `git commit -m "feat(server): progreso de mision al matar, oro como moneda, y entrega en el NPC"`.

---

### Task 4: Client — NPC, tracker de misión y oro en el HUD

**Files:** Create: `client/src/render/Npc.ts`; Modify: `client/src/input/InputController.ts`, `client/src/render/Hud.ts`, `client/src/net/NetworkClient.ts`, `client/src/main.ts`

- [ ] **Step 1: `Npc.ts`** — un mesh simple del quest giver en el pueblo (0,0): reusar un modelo KayKit (p.ej. cargar `Knight`/`Mage` vía CharacterFactory y ponerlo fijo mirando al spawn), o un mesh estilizado; con un **nameplate "Anciano del Pueblo"** (CSS2D) y un signo "!" flotante (esfera/emisivo) para indicar que da misiones. Expone su `object`/posición para el raycast.
- [ ] **Step 2: `InputController`** — en el click, raycast primero contra el NPC (recursivo si es skinned); si golpea → `onInteractNpc()` y return; si no, seguir con mob/suelo como ahora.
- [ ] **Step 3: `NetworkClient.sendInteractNpc()`** → `room.send(MessageType.InteractNpc, {})`. `getSelf` expone `gold`, `questId`, `questProgress`.
- [ ] **Step 4: `Hud`** — agregar una línea de **misión**: usando `getQuest(questId)` (de shared), mostrar `"{title} — {questProgress}/{amount}"` y, si `questProgress>=amount`, "¡Volvé al NPC!". Y mostrar el **oro** (ícono/label). Manejar `questId===""`.
- [ ] **Step 5: `main.ts`** — instanciar `Npc`; wire `onInteractNpc: () => net.sendInteractNpc()`; pasar gold/questId/questProgress al `hud.update`.
- [ ] **Step 6:** `npx tsc -p client/tsconfig.json`; `npm run build --workspace @aden/client`.
- [ ] **Step 7: Smoke** — hay un NPC en el pueblo con "!"; clickearlo con una misión completa la entrega (verificable por estado: questId avanza, gold sube, questProgress 0); el HUD muestra la misión + progreso + oro; matar el mob de la misión sube el progreso. Consola limpia.
- [ ] **Step 8: Commit** `git commit -m "feat(client): NPC de misiones, tracker en HUD y oro"`.

---

### Task 5: Verificación (controller)

- [ ] **Step 1: E2E (script)** — cliente entra (questId = q1); mata mobs `skeleton_minion` y verificar que `questProgress` sube hasta `amount`; manda `interactNpc` → verificar que `gold` subió por `rewardGold`, `exp` por `rewardExp`, `questId` avanzó a q2 y `questProgress` volvió a 0. Además: levantar loot de oro suma a `gold` (no al inventario). Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — carga sin errores; el NPC se renderiza. (Visual del NPC/HUD lo confirma el usuario.)

---

## Self-Review (cobertura vs dinámica elegida)

- **NPC en el pueblo que da misiones (dinámica L2):** Tasks 3,4 (interactNpc + Npc render).
- **Misiones de matar con progreso + recompensa EXP/oro:** Tasks 1,3 (defs + progreso en killMob + entrega).
- **Tracker de objetivo:** Task 4 (HUD).
- **Oro como moneda:** Tasks 2,3 (gold field + currency→gold en pickup).
- **Persistencia del progreso:** Task 2 (CharacterSave + load/save).
- **Server autoritativo:** progreso/recompensa/oro 100% server; cliente manda interactNpc + muestra estado.
- **Fuera de alcance:** tienda + comprar/usar pociones (Etapa 4b-2); misiones de recolección (futuro); múltiples NPCs/diálogos ramificados; deploy (4c).

**Placeholder scan:** steps con lógica traen el cambio; los de integración lo describen con precisión.
**Type consistency:** `Quest`/`getQuest`/`nextQuestId`/`InteractNpcMessage` shared; `CharacterSave` gana gold/questId/questProgress; PlayerState los expone; cliente usa `getQuest` para el HUD.
