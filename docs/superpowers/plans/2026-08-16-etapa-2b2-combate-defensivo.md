# Etapa 2b-2 — Combate defensivo + Power Strike (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los mobs contraatacan al jugador cuando lo alcanzan (daño autoritativo, reusando el CombatSystem simétrico). El jugador tiene HP y MP; si el HP llega a 0 muere y respawnea en el pueblo (zona segura) tras un timer con HP/MP full. El jugador puede usar la skill **Power Strike** (tecla) sobre su objetivo: más daño, cuesta MP y tiene cooldown. El cliente muestra un HUD propio (barras HP/MP), números de daño sobre el jugador al recibir golpes, animaciones de ataque (mob y jugador) y de muerte/respawn del jugador.

**Architecture:** Sobre E2b-1. `CombatSystem` (`canAttack`/`resolveAttack`) ya es simétrico atacante↔objetivo, así que mob→jugador reusa lo existente. Se suman: MP y muerte al `PlayerState`; ataque de mobs, muerte/respawn del jugador y el handler `useSkill` en el `GameRoom`; config de skill/MP y `TOWN`/respawn en shared; `attackerId` en `DamageEvent` para animar quién pega. El cliente agrega HUD self, input de skill y feedback de daño/muerte del jugador. Toda la lógica nueva testeable es pura; el HUD/anim es I/O verificado por smoke test.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js 0.160, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-15-aden-web-mmo-design.md` (§4 Combate, Muerte)

## Global Constraints

- ESM, `strict: true`. TDD en la lógica pura nueva (validación de skill, config).
- Server autoritativo: el cliente solo manda `moveTo`, `setTarget`, `useSkill`. El servidor decide TODO el daño, MP, muerte y respawn (jugador y mob). El cliente nunca muta HP/MP.
- Reusar `CombatSystem` (canAttack/resolveAttack/tickCooldown) para el ataque de mobs — NO duplicar lógica de daño.
- Tick 15 Hz. Cooldowns/respawn en ms.
- Config (rulings, shared): jugador `maxMp 50`; **Power Strike** `{ id:"power_strike", mpCost 10, cooldownMs 4000, factor 2.5 }`; `TOWN = { x:0, z:0 }` (zona segura, lejos de las spawn zones ±20/25); `PLAYER_RESPAWN_MS 4000`.
- En el pueblo (radio `SAFE_RADIUS 8` alrededor de TOWN) los mobs NO agrean al jugador (para que el respawn sea seguro).
- No romper etapas previas. Extender `DamageEvent` con `attackerId` sin romper a los consumidores existentes (el cliente actual ignora el campo nuevo).

---

## File Structure

```
shared/src/combat.ts              (MODIFICAR) PLAYER_COMBAT.maxMp; POWER_STRIKE; TOWN; SAFE_RADIUS; PLAYER_RESPAWN_MS; getSkill()
shared/src/combat.test.ts         (MODIFICAR) tests de config nueva + validación de skill si se agrega helper
shared/src/protocol.ts            (MODIFICAR) MessageType.UseSkill + UseSkillMessage; DamageEvent gana attackerId
shared/src/skills.ts              (NUEVO, opcional) canUseSkill(player, target, skillCfg, range) puro + test — o inline en combat.ts

server/src/state/PlayerState.ts   (MODIFICAR) mp,maxMp,dead (@type) + skillCooldownMs,respawnMs (planos)
server/src/rooms/GameRoom.ts      (MODIFICAR) init mp; ataque mob→jugador; muerte/respawn jugador; useSkill; guards de jugador muerto; MobAI/aggro ignora jugadores muertos y dentro del pueblo
server/src/systems/MobAISystem.ts (MODIFICAR) excluir jugadores muertos y en zona segura del aggro (parámetro/filtro)
server/src/systems/MobAISystem.test.ts (MODIFICAR) casos: no agrede a jugador muerto / en pueblo

client/src/render/Hud.ts          (NUEVO) overlay HTML con barras HP/MP del jugador propio
client/src/input/SkillInput.ts    (NUEVO) listener de tecla → onUseSkill("power_strike")
client/src/net/NetworkClient.ts   (MODIFICAR) sendUseSkill; snapshots de jugador con hp/mp/maxHp/maxMp/dead; damage/death ahora también para jugadores (targetId puede ser playerId)
client/src/render/EntityViews.ts  (MODIFICAR) anim de ataque de mob (por attackerId) y de jugador; daño/números sobre jugadores; muerte/respawn visual del jugador propio y de otros
client/src/main.ts                (MODIFICAR) wire HUD (update self hp/mp), SkillInput, ruteo de damage/death para jugadores
```

**Decomposición:** el ataque de mobs reusa `CombatSystem`; lo nuevo testeable es la config y (opcional) `canUseSkill`. El resto es wiring server + HUD/anim cliente, verificado por smoke test + E2E.

---

### Task 1: Shared — MP, Power Strike, pueblo/respawn y protocolo useSkill (TDD)

**Files:**
- Modify: `shared/src/combat.ts`, `shared/src/combat.test.ts`, `shared/src/protocol.ts`

**Interfaces:**
- Produces:
  - `PLAYER_COMBAT` gana `maxMp: 50` (extender `CombatStats` con `maxMp?` o un campo aparte `PLAYER_MAX_MP = 50` — elegir y ser consistente; recomendado agregar `maxMp` a `PLAYER_COMBAT` y `maxMp: 0` a los mobs).
  - `interface SkillConfig { id: string; mpCost: number; cooldownMs: number; factor: number }`; `POWER_STRIKE: SkillConfig` `{ "power_strike", 10, 4000, 2.5 }`; `SKILLS: Record<string, SkillConfig>`; `getSkill(id): SkillConfig` (lanza si falta).
  - `TOWN = { x: 0, z: 0 }`, `SAFE_RADIUS = 8`, `PLAYER_RESPAWN_MS = 4000`.
  - Protocolo: `MessageType.UseSkill = "useSkill"`; `interface UseSkillMessage { skillId: string }`; `DamageEvent` gana `attackerId: string` (además de targetId, amount, hp).

- [ ] **Step 1: Escribir tests que fallan (`combat.test.ts`, agregar)**

```ts
import { getSkill, POWER_STRIKE, TOWN, SAFE_RADIUS, PLAYER_RESPAWN_MS, PLAYER_COMBAT } from "./combat.js";

describe("skills y config defensiva", () => {
  it("Power Strike: coste MP, cooldown y factor > 1", () => {
    expect(POWER_STRIKE.mpCost).toBe(10);
    expect(POWER_STRIKE.cooldownMs).toBe(4000);
    expect(POWER_STRIKE.factor).toBeGreaterThan(1);
    expect(getSkill("power_strike")).toBe(POWER_STRIKE);
  });
  it("getSkill lanza para skill desconocida", () => {
    expect(() => getSkill("fireball")).toThrow();
  });
  it("jugador tiene MP; pueblo y respawn definidos", () => {
    expect(PLAYER_COMBAT.maxMp).toBe(50);
    expect(TOWN).toEqual({ x: 0, z: 0 });
    expect(SAFE_RADIUS).toBeGreaterThan(0);
    expect(PLAYER_RESPAWN_MS).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr → FAIL.** `npm test --workspace @aden/shared`.

- [ ] **Step 3: Implementar en `combat.ts`**

```ts
// extender CombatStats con maxMp (opcional para mobs) y PLAYER_COMBAT
export interface CombatStats { maxHp: number; maxMp?: number; pAtk: number; pDef: number; attackCooldownMs: number }
export const PLAYER_COMBAT: CombatStats = { maxHp: 100, maxMp: 50, pAtk: 15, pDef: 10, attackCooldownMs: 1500 };

export interface SkillConfig { id: string; mpCost: number; cooldownMs: number; factor: number }
export const POWER_STRIKE: SkillConfig = { id: "power_strike", mpCost: 10, cooldownMs: 4000, factor: 2.5 };
export const SKILLS: Record<string, SkillConfig> = { power_strike: POWER_STRIKE };
export function getSkill(id: string): SkillConfig {
  const s = SKILLS[id];
  if (!s) throw new Error(`getSkill: skill desconocida ${id}`);
  return s;
}

export const TOWN = { x: 0, z: 0 } as const;
export const SAFE_RADIUS = 8;
export const PLAYER_RESPAWN_MS = 4000;
```
(Los `MOB_COMBAT` no necesitan `maxMp`; `maxMp?` opcional lo permite.)

- [ ] **Step 4: Extender `protocol.ts`** — `MessageType.UseSkill = "useSkill"`; `interface UseSkillMessage { skillId: string }`; agregar `attackerId: string` a `DamageEvent`.

- [ ] **Step 5: Correr → PASS.**

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat(shared): MP, Power Strike, pueblo/respawn y protocolo useSkill"
```

---

### Task 2: Server — MP/muerte en PlayerState

**Files:** Modify: `server/src/state/PlayerState.ts`

- `PlayerState` agrega `@type("number") mp, maxMp` y `@type("boolean") dead = false`; planos `skillCooldownMs = 0`, `respawnMs = 0`.

- [ ] **Step 1:** Agregar los campos (mp/maxMp/dead con `@type`; skillCooldownMs/respawnMs sin `@type`).
- [ ] **Step 2:** `npx tsc --noEmit -p server/tsconfig.json`; `npm test --workspace @aden/server` (existentes verdes).
- [ ] **Step 3: Commit**
```bash
git add server/
git commit -m "feat(server): MP y estado de muerte en PlayerState"
```

---

### Task 3: Server — ataque mob→jugador + MobAI ignora muertos/pueblo (TDD para AI)

**Files:**
- Modify: `server/src/systems/MobAISystem.ts`, `server/src/systems/MobAISystem.test.ts`
- Modify: `server/src/rooms/GameRoom.ts`

**Interfaces:**
- `stepMobAI` (o su `players` de entrada) debe excluir jugadores **muertos** y dentro de la **zona segura** del cálculo de aggro. Enfoque: el llamador (GameRoom) filtra la lista de `players` que pasa a `stepMobAI` (excluye muertos y los que están dentro de `SAFE_RADIUS` de `TOWN`). Así `MobAISystem` no cambia su firma pero se testea que, dada una lista filtrada, no agrede a quien no está. Alternativa: pasar un flag. **Recomendado:** filtrar en el llamador y agregar 1-2 tests en MobAISystem que documenten que un jugador ausente de la lista no genera aggro (ya cubierto por "ignora fuera de rango"/"jugador desaparece"), MÁS un test nuevo del helper de filtrado si se extrae uno (`eligiblePlayersForAggro(players, town, safeRadius)` puro).

- [ ] **Step 1 (TDD):** extraer un helper puro en `MobAISystem.ts` (o un util): `eligiblePlayersForAggro(players: {id,x,z,dead}[], town:{x,z}, safeRadius:number): {id,x,z}[]` — excluye `dead` y los que están a ≤ `safeRadius` de `town`. Test: excluye muerto; excluye jugador en (0,0) con town (0,0); incluye jugador lejos y vivo.
- [ ] **Step 2:** `GameRoom.tick`: construir la lista de players para la IA con `eligiblePlayersForAggro([...players con dead], TOWN, SAFE_RADIUS)`. (Los players muertos/seguros no generan aggro.)
- [ ] **Step 3:** `GameRoom.tick` — **ataque de mobs**: para cada mob vivo cuyo `aggroTargetId` apunta a un jugador vivo en rango: `if (canAttack(mob, player, ATTACK_RANGE)) { const v=0.9+Math.random()*0.2; const dmg=resolveAttack(mob, player, 1, v, getMobCombat(mob.templateId).attackCooldownMs); broadcast(Damage, {attackerId: mobId, targetId: playerId, amount: dmg, hp: player.hp}); if (player.hp<=0) { player.dead=true; player.respawnMs=PLAYER_RESPAWN_MS; player.targetId=""; broadcast(Death, {entityId: playerId}); } }`. (La muerte/respawn del jugador se completa en Task 4.)
- [ ] **Step 4:** También pasar `attackerId` en el broadcast de Damage del **auto-attack del jugador** (Task 4 de 2b-1 lo emitía sin attackerId): `attackerId: playerSessionId`.
- [ ] **Step 5:** `npx tsc`; `npm test --workspace @aden/server` (MobAI tests nuevos + existentes verdes). Boot del server OK.
- [ ] **Step 6: Commit**
```bash
git add server/
git commit -m "feat(server): mobs atacan al jugador; aggro ignora muertos y zona segura"
```

---

### Task 4: Server — muerte/respawn del jugador, guards y Power Strike (useSkill)

**Files:** Modify: `server/src/rooms/GameRoom.ts`

- [ ] **Step 1: Init MP en `onJoin`** — `player.mp = player.maxMp = PLAYER_COMBAT.maxMp; player.dead=false; player.skillCooldownMs=0; player.respawnMs=0`.
- [ ] **Step 2: Guards de jugador muerto** en el tick: un jugador `dead` no se mueve (saltear su `advanceMovable`/movimiento), no auto-ataca (saltear su bloque de auto-attack), y no puede ser objetivo válido. En el handler `moveTo`/`setTarget`/`useSkill`: ignorar si `player.dead`.
- [ ] **Step 3: Respawn del jugador** en el tick: si `player.dead`, `player.respawnMs -= dtMs`; cuando ≤0: `player.hp=player.maxHp; player.mp=player.maxMp; player.dead=false; player.x=player.targetX=TOWN.x; player.z=player.targetZ=TOWN.z; player.moving=false; player.targetId=""`.
- [ ] **Step 4: Handler `useSkill`** (Power Strike):
```ts
this.onMessage(MessageType.UseSkill, (client, msg: UseSkillMessage) => {
  const p = this.state.players.get(client.sessionId);
  if (!p || p.dead) return;
  let skill; try { skill = getSkill(msg.skillId); } catch { return; }
  const mob = p.targetId ? this.state.mobs.get(p.targetId) : undefined;
  if (!mob || mob.dead) return;
  if (p.mp < skill.mpCost || p.skillCooldownMs > 0) return;
  if (!canAttack(p, mob, ATTACK_RANGE)) return; // en rango + cooldown de ataque
  const v = 0.9 + Math.random() * 0.2;
  const dmg = resolveAttack(p, mob, skill.factor, v, PLAYER_COMBAT.attackCooldownMs);
  p.mp -= skill.mpCost;
  p.skillCooldownMs = skill.cooldownMs;
  this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
  if (mob.hp <= 0) { mob.dead = true; mob.moving = false; mob.respawnMs = MOB_RESPAWN_MS; this.broadcast(MessageType.Death, { entityId: p.targetId }); }
});
```
- [ ] **Step 5: tick** — descontar `skillCooldownMs` de cada jugador (`tickCooldown` sobre un objeto `{attackCooldownMs: p.skillCooldownMs}` no aplica; usar un decremento directo o extender). Simple: `if (p.skillCooldownMs>0) p.skillCooldownMs = Math.max(0, p.skillCooldownMs - dtMs)`.
- [ ] **Step 6:** `npx tsc`; `npm test --workspace @aden/server`; boot OK. Si algún test de GameRoom existente se ve afectado, investigar (no debilitar sin razón).
- [ ] **Step 7: Commit**
```bash
git add server/
git commit -m "feat(server): muerte/respawn del jugador en pueblo + Power Strike (useSkill)"
```

---

### Task 5: Client — HUD del jugador (barras HP/MP)

**Files:** Create: `client/src/render/Hud.ts`; Modify: `client/src/main.ts`, `client/src/net/NetworkClient.ts`

**Interfaces:**
- `Hud` (overlay HTML fijo, esquina inferior izq): `update(hp,maxHp,mp,maxMp,dead)` refleja barras HP (rojo) y MP (azul), y un cartel "Has muerto — respawneando…" cuando `dead`.
- `NetworkClient`: el snapshot del jugador propio expone `hp,maxHp,mp,maxMp,dead`; un callback `onSelfChange(snap)` (o leer del estado en el loop).

- [ ] **Step 1:** `Hud.ts` — crea un contenedor `position:fixed;left:12px;bottom:12px;pointer-events:none` con dos barras (HP/MP) + label; `update(...)` ajusta anchos y muestra/oculta el cartel de muerte.
- [ ] **Step 2:** `main.ts` — instanciar `Hud`; en el loop (o en onChange del self) `hud.update(selfPlayer.hp, .maxHp, .mp, .maxMp, .dead)`. Obtener el self del estado por `room.sessionId`.
- [ ] **Step 3:** `npx tsc`; `npm run build --workspace @aden/client`.
- [ ] **Step 4: Smoke** — el HUD muestra HP/MP; al recibir daño (mob) baja el HP; al morir muestra el cartel; al respawnear se restaura. Consola limpia.
- [ ] **Step 5: Commit**
```bash
git add client/src
git commit -m "feat(client): HUD del jugador con barras HP/MP y estado de muerte"
```

---

### Task 6: Client — Power Strike input + feedback de daño/muerte del jugador + anim de ataque

**Files:** Create: `client/src/input/SkillInput.ts`; Modify: `client/src/render/EntityViews.ts`, `client/src/net/NetworkClient.ts`, `client/src/main.ts`

- [ ] **Step 1:** `SkillInput.ts` — `attach(dom)` escucha `keydown`; tecla **"1"** (y opcional barra espaciadora) → `onUseSkill("power_strike")`. `main.ts` cablea `onUseSkill: (id) => net.sendUseSkill(id)`.
- [ ] **Step 2:** `NetworkClient.sendUseSkill(skillId)` → `room.send(MessageType.UseSkill, { skillId })`.
- [ ] **Step 3:** Ruteo de `damage`/`death` para **jugadores**: en el handler de `Damage`, si `targetId` es un jugador (existe en `state.players`), spawn de número de daño sobre ese jugador y `playOnce("hit")` en su vista; si es el self, además refrescar HUD (ya lo hace el loop). En `Death`, si `entityId` es un jugador → `playOnce("death")` en su vista; para el self, el HUD muestra el cartel. En respawn del self (dead→false), reubicar/mostrar.
- [ ] **Step 4: Anim de ataque por `attackerId`:** en el handler de `Damage`, reproducir `playOnce("attack")` en la vista del **atacante** (`ev.attackerId`), sea mob o jugador — resolver la vista por id en `mobViews`/`views`. Esto anima tanto los golpes del jugador como los de los mobs.
- [ ] **Step 5:** `npx tsc`; `npm run build`.
- [ ] **Step 6: Smoke** (`npm run dev`): acercarse a un mob y dejar que ataque → el HUD de HP baja, aparecen números de daño sobre el jugador, el mob hace anim de ataque; apretar "1" con un objetivo en rango y MP → Power Strike pega más y baja el MP; morir → cartel + respawn en el pueblo. Verificar por estado/DOM lo observable; documentar lo no verificable (visual).
- [ ] **Step 7: Commit**
```bash
git add client/src
git commit -m "feat(client): Power Strike, feedback de daño/muerte del jugador y anim de ataque"
```

---

### Task 7: Verificación E2E (controller)

- [ ] **Step 1: Script 2 clientes** — A se queda quieto cerca de una spawn zone hasta que un mob lo alcance; verificar por estado: `A.hp` baja, y si baja a 0 `A.dead=true`, y tras `PLAYER_RESPAWN_MS` A vuelve con `hp=maxHp` en TOWN (0,0). Luego A manda `setTarget`+`useSkill` sobre un mob en rango: verificar que el `mp` de A baja y el `hp` del mob cae más que con auto-attack. Documentar PASS/FAIL.
- [ ] **Step 2: Boot del cliente** — carga sin errores; llegan `damage` (con attackerId)/`death`. (Visual queda para el usuario.)

---

## Self-Review (cobertura vs spec)

- **Mobs atacan al jugador (spec §4):** Task 3 (reusa CombatSystem; ataque en el tick).
- **HP/MP del jugador, muerte y respawn en pueblo (spec §4 Muerte):** Tasks 2,4.
- **Power Strike (spec §4):** Tasks 1,4,6 (config + useSkill autoritativo + input).
- **HUD y feedback (barras/números/anim):** Tasks 5,6.
- **Zona segura para respawn:** Tasks 1,3 (SAFE_RADIUS; aggro excluye pueblo).
- **Server autoritativo:** cliente solo manda moveTo/setTarget/useSkill; daño/MP/muerte/respawn 100% server; broadcasts damage(+attackerId)/death.
- **Fuera de alcance (Etapa 3):** EXP/nivel, loot, inventario, persistencia. Más skills, más mobs, pueblo con NPCs.

**Placeholder scan:** sin TBD/TODO; los steps con lógica traen el código; los de integración describen el cambio con precisión.
**Type consistency:** `Combatant` reusado para mobs como atacantes; `SkillConfig`/`getSkill`, `UseSkillMessage`, `DamageEvent.attackerId`, `TOWN`/`SAFE_RADIUS`/`PLAYER_RESPAWN_MS` compartidos; `eligiblePlayersForAggro` puro y testeado.
