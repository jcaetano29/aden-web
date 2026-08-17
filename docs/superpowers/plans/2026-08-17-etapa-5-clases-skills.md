# Etapa 5 — Clases + skills (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Que **elegir clase importe**. Al crear el personaje elegís una de 4 clases (Caballero, Mago, Bárbaro, Pícaro), cada una con **stats base + crecimiento propios** y una **skill característica** distinta (tecla `1`). La clase se **persiste** y define el **modelo** que se renderiza (para vos y para los demás). Server-autoritativo.

**Architecture:** `shared/src/classes.ts` define las 4 clases (stats base, crecimiento por nivel, modelo, skill). Los stats dejan de ser un único `PLAYER_COMBAT`+`statsForLevel(level)` y pasan a `statsForClass(className, level)`; `gainExp` se vuelve class-aware (recomputa desde `statsForClass`). Cada clase tiene su `skillId` en el registro `SKILLS`. `PlayerState.className` (@type) se sincroniza; el server lo aplica en onJoin (nuevo: desde las join options; cargado: desde el save) y en cada level-up. El cliente agrega un **selector de clase** al inicio, renderiza cada jugador con el modelo de SU clase, manda la skill de su clase, y muestra clase+skill en el HUD. Persistencia (E3c) suma `className`.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints
- ESM, `strict: true`. TDD en lo puro (defs de clases, statsForClass, gainExp class-aware, skills).
- Server autoritativo: stats/daño/skill/level 100% server. La clase se manda UNA vez en las join options (`{ name, className }`). El cliente no puede cambiarla en caliente.
- Compatibilidad: saves viejos sin `className` → default `"knight"`. No romper etapas previas (misiones, tienda, pociones, loot, persistencia).
- v1: 1 skill característica por clase (bind `1`/Space). Multi-skill/árbol/proyectiles = futuro. Todas las skills a rango melee (`ATTACK_RANGE`) salvo que se indique — mantener el sistema de combate actual (sin proyectiles).

## Clases (valores de referencia — el implementador puede ajustar ±, manteniendo el balance relativo)
| Clase | id | modelo | HP base | MP base | pAtk | pDef | atkCd | crecimiento (hp/mp/atk/def) | skill |
|---|---|---|---|---|---|---|---|---|---|
| Caballero | knight | Knight | 140 | 30 | 13 | 16 | 1600 | 26/3/3/3 | shield_bash (f2.0, mp8, cd5000) |
| Mago | mage | Mage | 80 | 90 | 18 | 7 | 1500 | 14/10/4/1 | fireball (f3.6, mp22, cd4500) |
| Bárbaro | barbarian | Barbarian | 120 | 30 | 18 | 10 | 1500 | 22/3/4/2 | brutal_strike (f3.0, mp12, cd4000) |
| Pícaro | rogue | Rogue | 95 | 45 | 16 | 9 | 1100 | 18/5/4/2 | backstab (f2.8, mp8, cd2500) |

---

## File Structure
```
shared/src/classes.ts        (NUEVO) ClassDef, CLASSES, CLASS_ORDER, getClass, isValidClass
shared/src/classes.test.ts   (NUEVO)
shared/src/combat.ts         (MODIFICAR) agregar las 4 skills característica a SKILLS (shield_bash/fireball/brutal_strike/backstab). PLAYER_COMBAT queda como fallback/default.
shared/src/progression.ts    (MODIFICAR) statsForClass(className, level); gainExp(p, amount, className) recomputa maxHp/maxMp/pAtk/pDef desde statsForClass en cada level-up (una sola fuente de verdad). Mantener statsForLevel como alias de statsForClass("knight",·) o marcar deprecado; migrar usos.
shared/src/index.ts          (MODIFICAR) export classes
shared/src/progression.test.ts / combat.test.ts (MODIFICAR) cubrir statsForClass + gainExp class-aware + skills nuevas

server/src/state/PlayerState.ts (MODIFICAR) @type("string") className = "knight"
server/src/persistence/CharacterSave.ts (MODIFICAR) className en save/serialize (+ test)
server/src/rooms/GameRoom.ts (MODIFICAR) onJoin: className desde options (validar con isValidClass; default knight) y aplicar statsForClass(className, level) a los stats base; load: className desde save + statsForClass; grantExp/gainExp pasa className (level-up recomputa por clase); useSkill resuelve la skill de la clase (getClass(p.className).skillId) — validar que la skill pedida sea la de su clase; el cooldown de auto-attack usa el atkCd de la clase.

client/src/render/ClassSelect.ts (NUEVO) overlay de selección de clase (4 cards) → resuelve a className antes de conectar
client/src/net/NetworkClient.ts (MODIFICAR) connect(name, className, handlers) manda { name, className } en join; snapshot del player incluye className; getSelf expone className
client/src/assets/manifest.ts (MODIFICAR) modelForClass(className) → nombre de modelo KayKit (reemplaza el hash para jugadores)
client/src/main.ts (MODIFICAR) flujo: nombre → ClassSelect → connect(name, className); render de cada player con el modelo de su clase (snap.className); SkillInput manda la skill de la clase; HUD recibe className + skillId
client/src/render/Hud.ts (MODIFICAR) mostrar la clase y el nombre/estado de la skill característica
client/src/input/SkillInput.ts (MODIFICAR) recibe el skillId activo (de la clase) en vez de hardcodear power_strike
```

---

### Task 1: Shared — clases, stats por clase, skills, gainExp class-aware (puro, TDD)
**Files:** Create `shared/src/classes.ts`(+test); Modify `shared/src/combat.ts`, `shared/src/progression.ts`, `shared/src/index.ts`, tests de progression/combat.
- `ClassDef { id; name; model; base: CombatStats; growth: {hp;mp;pAtk;pDef}; skillId }`. `CLASSES` (4, tabla de arriba). `CLASS_ORDER`. `getClass(id)` (lanza si falta). `isValidClass(id): boolean`.
- `combat.ts`: agregar `shield_bash/fireball/brutal_strike/backstab` a `SKILLS` (con sus factor/mpCost/cooldownMs). Mantener `power_strike` (compat/tests viejos) o migrarlo — no romper `getSkill`.
- `progression.ts`: `statsForClass(className, level): {maxHp,maxMp,pAtk,pDef}` = base(clase) + (level-1)*growth(clase). `gainExp(p, amount, className)`: sube nivel y **recomputa** maxHp/maxMp/pAtk/pDef con `statsForClass(className, p.level)`, refill hp/mp al subir. `statsForLevel(level)` = `statsForClass("knight", level)` (alias, para no romper llamadas viejas mientras se migran).
- [ ] Step 1: tests RED — getClass ok/throw, isValidClass, stats de mage vs knight difieren (mage más MP/menos HP), gainExp con className sube stats por la clase correcta, skills nuevas existen en SKILLS. → implementar → GREEN (`npm test --workspace @aden/shared`). Preservar MessageType/SKILLS existentes.
- [ ] Step 2: Commit `feat(shared): clases (stats+skill por clase), statsForClass y gainExp class-aware`.

### Task 2: Server — className en estado/persistencia + combate por clase
**Files:** Modify `server/src/state/PlayerState.ts`, `server/src/persistence/CharacterSave.ts`(+test), `server/src/rooms/GameRoom.ts`.
- `PlayerState`: `@type("string") className = "knight"` (sincronizado — el cliente lo usa para el modelo/HUD).
- onJoin: `const className = isValidClass(options?.className) ? options.className : "knight";` set **synchronously** antes de `players.set` (para que entre en el primer patch). Aplicar `statsForClass(className, 1)` a maxHp/maxMp/pAtk/pDef + hp/mp llenos. Load (save existe): `className = save.className ?? "knight"`; recomputar stats con `statsForClass(className, save.level)`.
- `CharacterSave`: `className`; `toCharacterSave` lo incluye; test actualizado.
- `grantExp`/level-up: pasar `className` a `gainExp` (recomputa por clase). LevelUp dirigido igual.
- `useSkill`: resolver la skill de la clase: `const skillId = getClass(p.className).skillId;` — usar esa (ignorar/validar el id del cliente). Coste MP/rango/cooldown/factor de esa skill (mismo flujo actual de Power Strike).
- Auto-attack: el intervalo de cooldown usa el `attackCooldownMs` de la clase (`getClass(p.className).base.attackCooldownMs`) en vez de `PLAYER_COMBAT.attackCooldownMs`.
- [ ] `npx tsc` + `npm test --workspace @aden/server` (existentes + CharacterSave). Boot OK.
- [ ] Commit `feat(server): clase del jugador (stats/skill/atk-speed por clase) + persistencia`.

### Task 3: Client — selector de clase, modelo por clase, skill de clase, HUD
**Files:** Create `client/src/render/ClassSelect.ts`; Modify `client/src/net/NetworkClient.ts`, `client/src/assets/manifest.ts`, `client/src/input/SkillInput.ts`, `client/src/render/Hud.ts`, `client/src/main.ts`.
- `ClassSelect.ts`: overlay con 4 cards (nombre + una línea de rol: "Caballero — tanque", "Mago — daño mágico/frágil", "Bárbaro — daño físico", "Pícaro — rápido"). `select(): Promise<string>` (resuelve al className elegido). pointer-events:auto.
- `manifest.ts`: `modelForClass(className)` → `CLASSES[className].model`. Reemplaza `pickModelForSession` para jugadores (mobs siguen con `modelForTemplate`).
- `NetworkClient`: `connect(name, className, handlers)` manda `{ name, className }`. El snapshot del player incluye `className`. `getSelf()` expone `className`.
- `main.ts`: flujo nombre → `await classSelect.select()` → `net.connect(name, className, ...)`. En `onAdd`, usar `modelForClass(snap.className)` para el modelo (tanto self como otros). Pasar el `skillId` de la clase al `SkillInput` y a la HUD.
- `SkillInput.ts`: recibe el `skillId` activo (constructor/setter) y lo manda en `onUseSkill(skillId)` (en vez de "power_strike" fijo).
- `Hud.ts`: mostrar la **clase** (p.ej. "Caballero") y el nombre de la **skill** (con su estado/cooldown si es fácil).
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): selector de clase, modelo/skill por clase y HUD de clase`.

### Task 4: Verificación (controller)
- [ ] E2E (colyseus.js / @colyseus/testing): (a) dos clientes con clases distintas (mage vs knight) → sus stats base difieren (maxHp/maxMp) según la clase. (b) `useSkill` aplica la skill de la clase (el daño/coste MP corresponde a esa skill; p.ej. fireball gasta 22 MP). (c) subir de nivel recomputa stats por la clase. (d) save/load conserva className y stats. Documentar PASS/FAIL.
- [ ] Boot del cliente: selector aparece, se elige clase, se rendea el modelo de la clase. (Visual lo confirma el usuario.)

---

## Self-Review
- **Elegir clase importa:** Tasks 1–3 (stats/skill/modelo por clase).
- **Skill característica por clase:** Tasks 1–3 (SKILLS + useSkill por clase + SkillInput).
- **Persistencia de la clase:** Task 2 (CharacterSave.className + statsForClass en load).
- **Server autoritativo:** stats/daño/skill/level 100% server; el cliente solo elige clase al entrar y muestra estado.
- **Fuera de alcance:** múltiples skills / árbol de skills / proyectiles-rango mágico real / cambiar de clase / balance fino (E5b+); deploy (E4c).
