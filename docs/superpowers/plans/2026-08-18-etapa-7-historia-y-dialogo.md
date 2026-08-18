# Etapa 7 — Historia y diálogo (El Asedio de Aden) (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Convertir las mecánicas en un **juego de rol con historia**. Hoy el juego no cuenta nada: nadie explica quién sos, por qué hay esqueletos, quién es el Rey Esqueleto ni qué está en juego. Esta etapa agrega una **capa narrativa**: una **premisa/intro** al entrar, **diálogo** con el Anciano (deja de ser un botón mudo y te cuenta la historia según tu avance), y un **arco de misiones** reescrito como un relato con principio, desarrollo y clímax. Sin cambios de mecánica: es contenido (texto) + UI de diálogo.

**Architecture:** El texto vive en `shared` (premisa/lore + campos narrativos en cada `Quest`) para tener una sola fuente y poder testearlo. El cliente muestra: una **StoryCard** (premisa) tras elegir clase, y un **DialogPanel** al interactuar con el Anciano, con texto **contextual** derivado de `questId`/`questProgress` (server-autoritativo como hoy: el botón del diálogo dispara el mismo `interactNpc` de aceptar/entregar). El server NO cambia — el diálogo es presentación.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints
- ESM, `strict: true`. TDD en lo puro (campos narrativos presentes/no vacíos, títulos nuevos). El diálogo/StoryCard es UI (se verifica por tsc+build+smoke).
- No romper mecánicas: la aceptación/entrega de misiones sigue por `interactNpc` (server autoritativo). El diálogo es el envoltorio narrativo que llama a ese mismo intent.
- Tono: alta fantasía clásica, sabor L2, en español. El Anciano tiene nombre ("Anciano Rowan"). El jefe es "el Rey Nihil / el Rey Esqueleto".

## Contenido narrativo (canónico — implementar tal cual, ajustes menores de estilo OK)
**Premisa (StoryCard / intro), título "El Asedio de Aden":**
> "Hace tres inviernos, el Rey Nihil marchó a las Ruinas del Norte buscando la inmortalidad. La encontró — pero no como esperaba: su cuerpo cayó, su ambición no. Se alzó como el Rey Esqueleto, y con él, un ejército de muertos.
> Ahora sus exploradores merodean los caminos del pueblo de Aden. Sos un aventurero recién llegado. En la plaza, el Anciano Rowan te espera: el pueblo necesita una espada, y quizás vos necesites una causa."

**Anciano Rowan** (nombre del NPC de misiones; reemplaza "Anciano del Pueblo").

**Arco de misiones** (extender cada Quest con `intro` = qué dice al dar/mientras está activa, y `done` = qué dice al entregar):
- **q1 "Los primeros huesos"** (skeleton_minion ×5):
  - intro: "Han visto esqueletos merodeando cerca de los campos. Aún son pocos y torpes, exploradores del Rey Nihil. Acabá con 5 antes de que aprendan el camino a nuestras puertas."
  - done: "Lo hiciste. Pero por cada uno que cae, las Ruinas escupen dos más. Esto recién empieza, aventurero."
- **q2 "La marea crece"** (skeleton_minion ×8):
  - intro: "Tenías razón en temer. Ahora bajan en manada desde el norte. Derribá 8 esta vez: hay que quebrarles el avance."
  - done: "El pueblo respira gracias a vos. Pero mis exploradores traen malas nuevas: entre los muertos caminan cosas peores."
- **q3 "Los guerreros caídos"** (skeleton_warrior ×5):
  - intro: "No son simples huesos: son los Guerreros Caídos, la vieja guardia del Rey Nihil, alzada de nuevo. Derrotá a 5. Cuidate: golpean como en vida."
  - done: "Sos más fuerte de lo que este viejo esperaba. Ya no quedan excusas: hay que ir por quien mueve los hilos."
- **q4 "El Rey Esqueleto"** (skeleton_king ×1):
  - intro: "El Rey Nihil comanda a los muertos desde la arena de las Ruinas, al norte. Mientras persista, no habrá paz. Andá. Terminá con esto. Que Aden vuelva a dormir tranquila."
  - done: "¡Lo lograste! El Rey ha caído y su ejército se deshace en polvo. Aden vivirá, y tu nombre con ella. Sos un héroe. (La amenaza podría regresar algún día... pero hoy, descansá.)"

Tras q4 → loop a q1 (narrativamente: "la amenaza regresa").

---

## File Structure
```
shared/src/quests.ts       (MODIFICAR) Quest gana `intro: string` y `done: string`; renarrar q1-q4 (títulos + intro + done de arriba).
shared/src/story.ts        (NUEVO) LORE = { title:"El Asedio de Aden", body:"...premisa..." }; ELDER_NAME = "Anciano Rowan".
shared/src/index.ts        (MODIFICAR) export story.
shared/src/quests.test.ts  (MODIFICAR) cubrir intro/done presentes y no vacíos, títulos nuevos.

client/src/render/StoryCard.ts  (NUEVO) overlay de premisa: título + cuerpo + botón "Comenzar". show(): Promise<void> (se cierra al aceptar).
client/src/render/DialogPanel.ts (NUEVO) caja de diálogo (nombre del NPC + texto + botón de acción). open({speaker, text, actionLabel, onAction}) / close(). pointer-events:auto en el botón.
client/src/render/Npc.ts    (MODIFICAR) nameplate del Anciano → ELDER_NAME ("Anciano Rowan").
client/src/main.ts          (MODIFICAR) tras ClassSelect y antes/después de conectar, mostrar StoryCard una vez (premisa). Cambiar `interactNpc()` para abrir el DialogPanel con texto contextual: si la quest está completa (questProgress>=amount) → mostrar `done` + botón "Continuar" que llama a net.sendInteractNpc() (entrega) y luego muestra el `intro` de la siguiente; si está en progreso → mostrar `intro` (recordatorio) + progreso "(n/amount)" + botón "Entendido"; si questId==="" → premisa/oferta de la primera. Mantener el gate de cercanía (toast "Acercate a Rowan" si estás lejos).
```

---

### Task 1: Shared — contenido narrativo (premisa + arco de misiones) (puro, TDD)
**Files:** Modify `shared/src/quests.ts`, `shared/src/index.ts`; Create `shared/src/story.ts`; update `shared/src/quests.test.ts`.
- `Quest` gana `intro: string; done: string;`. Renarrar q1-q4: nuevos `title`, `intro`, `done` (contenido de arriba). Mantener id/mobTemplateId/amount/rewardExp/rewardGold intactos (mecánica sin cambios).
- `story.ts`: `export const LORE = { title: "El Asedio de Aden", body: "..." } as const;` `export const ELDER_NAME = "Anciano Rowan";`.
- [ ] Tests RED→GREEN (`npm test --workspace @aden/shared`): cada quest tiene intro/done no vacíos; getQuest("q1").title==="Los primeros huesos"; getQuest("q4").mobTemplateId sigue "skeleton_king"; LORE.title y ELDER_NAME existen. Preservar QUEST_ORDER/nextQuestId/recompensas. `npx tsc -p shared/tsconfig.json --noEmit` limpio.
- [ ] Commit `feat(shared): historia — premisa (El Asedio de Aden) y arco narrativo de misiones`.

### Task 2: Client — StoryCard, DialogPanel y diálogo contextual del Anciano
**Files:** Create `client/src/render/StoryCard.ts`, `client/src/render/DialogPanel.ts`; Modify `client/src/render/Npc.ts`, `client/src/main.ts`.
- **StoryCard.ts**: overlay full-screen (fondo oscuro, panel centrado) con `LORE.title` (grande) + `LORE.body` (párrafos) + botón "Comenzar". `show(): Promise<void>` que resuelve al click (y se oculta). pointer-events:auto.
- **DialogPanel.ts**: caja inferior/centro (estilo RPG): barra con el nombre del hablante (speaker), el texto, y un botón de acción. API: `open(opts: { speaker: string; text: string; actionLabel: string; onAction: () => void })` (el botón llama onAction y cierra), `close()`, `isOpen()`. pointer-events:auto en el botón; el resto no bloquea el juego.
- **Npc.ts**: el nameplate del Anciano usa `ELDER_NAME` (import de @aden/shared).
- **main.ts**:
  - Tras `await classSelect.select()`, `await storyCard.show()` (premisa una vez), luego `net.connect(...)`.
  - Reescribir `interactNpc()`: mantener el gate de cercanía (si lejos → toast "Acercate al Anciano Rowan"). Si cerca:
    - `const self = net.getSelf();` `const q = self.questId ? getQuest(self.questId) : null;`
    - Si `q && self.questProgress >= q.amount` (lista para entregar): `dialog.open({ speaker: ELDER_NAME, text: q.done, actionLabel: "Continuar", onAction: () => { net.sendInteractNpc(); /* el server entrega y encadena; el HUD/estado se actualizan solos */ } })`. (Opcional: tras entregar, en el próximo interact se verá el intro de la nueva.)
    - Si `q` en progreso (`self.questProgress < q.amount`): `dialog.open({ speaker: ELDER_NAME, text: `${q.intro}  (${self.questProgress}/${q.amount})`, actionLabel: "Entendido", onAction: () => {} })`.
    - Si `!q` (questId===""): abrir el diálogo con la primera misión (intro de firstQuest) y onAction → net.sendInteractNpc() (asigna). 
  - Mantener el resto (toasts de "acercate", HUD tracker con el nuevo título narrativo — ya sale de getQuest().title).
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): premisa (StoryCard) y diálogo narrativo del Anciano Rowan`.

### Task 3: Verificación (controller)
- [ ] tsc estricto (shared+server+client) + `npm run build` cliente + full suite verde.
- [ ] Smoke (sandbox): tras elegir clase aparece la StoryCard con "El Asedio de Aden" y el botón "Comenzar"; el nameplate del NPC dice "Anciano Rowan"; (el diálogo contextual completo necesita conexión → pendiente-usuario, pero el DialogPanel se instancia sin errores). Consola limpia.

---

## Self-Review
- **Historia / "algo que hacer" con sentido:** Tasks 1–2 (premisa + arco narrativo + diálogo contextual).
- **Se siente RPG:** el NPC tiene nombre y habla; las misiones cuentan un relato con clímax (el Rey Nihil); hay una intro que sitúa al jugador.
- **Sin romper mecánica:** aceptar/entregar sigue por interactNpc (server); el diálogo solo envuelve.
- **Fuera de alcance (futuro):** diálogos ramificados/opciones, más NPCs con historia, cinemáticas, voz, journal/diario de misiones con historial, recompensas narrativas (título/ítem único), varias líneas argumentales.
```
