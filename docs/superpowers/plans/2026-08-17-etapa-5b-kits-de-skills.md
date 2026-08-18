# Etapa 5b — Kits de skills por clase (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Que cada clase se juegue distinto. Cada clase pasa de 1 skill a **3 skills** (teclas `1`/`2`/`3`) de **tipos variados**: **daño**, **curación** (self), **buff temporal** (subir pAtk o pDef un rato) y **veneno/DoT** (daño por tiempo al objetivo). Server-autoritativo; cooldown por-skill.

**Architecture:** `SkillConfig` gana un `type` + params por tipo. `CLASSES[c].skills: string[]` (3 ids). El server resuelve `useSkill` por tipo: daño (como hoy), curación (cura al caster), buff (setea multiplicador temporal en el PlayerState), dot (setea veneno en el MobState objetivo). El tick del server decrementa buffs y aplica ticks de veneno (ruteando la muerte por killMob → exp/loot al que lo enveneno). El combate aplica el multiplicador de buff a pAtk/pDef efectivos. Cooldowns por-skill (Map server-only). El cliente bindea 1/2/3 a las 3 skills de su clase, trackea cooldown local para la UI, y da feedback (toast) por tipo.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints
- ESM, `strict: true`. TDD en lo puro (defs de skills/kits + cálculo de daño/buff efectivo si se extrae). Server autoritativo: costo MP, cooldown, daño, cura, buff y veneno 100% server.
- `useSkill {skillId}`: el server valida que `skillId ∈ getClass(p.className).skills` (si no, ignora). El cliente manda el id de la tecla apretada.
- Buffs: SOLO afectan al jugador que los castea (self-buff). Los mobs no se buffean. Duración fija; al expirar, multiplicador vuelve a 1.
- DoT: se aplica al mob objetivo; ticks de daño en el tick del server; si mata, va por `killMob(mob,id,attackerId)` (exp/loot al atacante). Reemplaza cualquier veneno previo (no se apilan).
- Cooldown por-skill (no un único cooldown global). MP se descuenta al castear.
- No romper etapas previas (misiones, tienda, pociones, persistencia, combate).

## Kits por clase (referencia; el implementador puede ajustar ± manteniendo el rol)
- **Knight (Caballero) — tanque sostenido:**
  1. `shield_bash` — daño (factor 2.0, mp8, cd5000)
  2. `guard` — buff pDef ×1.6, 6s (mp10, cd12000)
  3. `second_wind` — cura 40% maxHp (mp15, cd15000)
- **Mage (Mago) — burst mágico:**
  1. `fireball` — daño (factor 3.6, mp22, cd4500)
  2. `ice_lance` — daño (factor 2.2, mp12, cd2500)
  3. `arcane_mend` — cura 30% maxHp (mp18, cd12000)
- **Barbarian (Bárbaro) — físico agresivo:**
  1. `brutal_strike` — daño (factor 3.0, mp12, cd4000)
  2. `rage` — buff pAtk ×1.5, 6s (mp12, cd12000)
  3. `cleave` — daño (factor 2.4, mp10, cd3000)
- **Rogue (Pícaro) — veneno/rápido:**
  1. `backstab` — daño (factor 2.8, mp8, cd2500)
  2. `poison` — DoT (12 dps, 5s, mp10, cd6000)
  3. `evasion` — buff pDef ×1.8, 4s (mp8, cd10000)

---

## File Structure
```
shared/src/combat.ts        (MODIFICAR) SkillConfig gana type ("damage"|"heal"|"buff"|"dot") + name + params (factor?/healPct?/buffStat?/buffMult?/buffMs?/dotDps?/dotMs?/range?). Definir las 12 skills. getSkill sigue.
shared/src/classes.ts       (MODIFICAR) ClassDef.skills: string[] (3 ids); getClassSkills(className). Mantener skillId = skills[0] (compat) o migrar usos.
shared/src/combat.test.ts / classes.test.ts (MODIFICAR/NUEVO) tipos y params de skills, 3 por clase.

server/src/state/PlayerState.ts (MODIFICAR) buffs server-only: atkBuffMs=0, atkBuffMult=1, defBuffMs=0, defBuffMult=1; cooldowns por-skill server-only: skillCooldowns = new Map<string,number>() (reemplaza skillCooldownMs). (Sin @type — son internos; el efecto se ve por el combate/HP.)
server/src/state/MobState.ts (MODIFICAR) veneno server-only: dotMs=0, dotDps=0, dotAttackerId="", dotAccumMs=0.
server/src/systems/CombatSystem.ts (MODIFICAR) daño usa pAtk/pDef EFECTIVOS: si el atacante/target tiene buff activo (campo presente y ms>0), multiplicar. (duck-typing "atkBuffMs" in entity.)
server/src/rooms/GameRoom.ts (MODIFICAR) useSkill: validar skillId ∈ kit de la clase; chequear MP + cooldown por-skill; branch por type (damage/heal/buff/dot). Tick: decrementar buffs y skillCooldowns; aplicar ticks de veneno a mobs (killMob con dotAttackerId si muere; broadcast damage por tick). grantExp/killMob sin cambios salvo ruteo del veneno.

client/src/input/SkillInput.ts (MODIFICAR) bindea teclas 1/2/3 → las 3 skills de la clase (setSkills(string[])); manda onUseSkill(skillId) del slot. (Space = slot 1.)
client/src/render/Hud.ts (MODIFICAR) barra de 3 skills: nombre + tecla + estado de cooldown (trackeo local). 
client/src/render/SkillBar.ts (NUEVO, opcional) o dentro de Hud: 3 slots con cooldown local (al castear, arranca cd local = skill.cooldownMs para la UI).
client/src/main.ts (MODIFICAR) pasar getClassSkills(className) al SkillInput y a la HUD; feedback por tipo (toast: "¡Furia!", "Te curaste", "Veneno aplicado"). Trackear cooldown local al apretar.
```

---

### Task 1: Shared — tipos de skill + kits de 3 por clase (puro, TDD)
**Files:** Modify `shared/src/combat.ts`, `shared/src/classes.ts`, `shared/src/index.ts`, tests.
- `SkillConfig`: `{ id; name; mpCost; cooldownMs; type: "damage"|"heal"|"buff"|"dot"; factor?; healPct?; buffStat?: "pAtk"|"pDef"; buffMult?; buffMs?; dotDps?; dotMs?; range? }`.
- Definir las 12 skills de la tabla (con `name` legible en español, p.ej. "Bola de Fuego", "Furia", "Veneno", "Segundo Aire"). Mantener las 4 existentes con su `type: "damage"`.
- `ClassDef.skills: string[]` (3 ids por clase, tabla). `getClassSkills(className): string[]`. `skillId` = `skills[0]` para compat (o migrar sus usos server/client).
- [ ] Tests RED → GREEN (`npm test --workspace @aden/shared`): cada clase tiene 3 skills; getSkill("guard").type==="buff" y buffStat/buffMult/buffMs presentes; poison.type==="dot" con dotDps/dotMs; heal con healPct; damage con factor. Preservar SKILLS/MessageType/getSkill.
- [ ] Commit `feat(shared): tipos de skill (damage/heal/buff/dot) y kits de 3 por clase`.

### Task 2: Server — resolución de skills por tipo + buffs + veneno + cooldown por-skill
**Files:** Modify `server/src/state/PlayerState.ts`, `server/src/state/MobState.ts`, `server/src/systems/CombatSystem.ts`, `server/src/rooms/GameRoom.ts`.
- **PlayerState:** buffs (atkBuffMs/atkBuffMult/defBuffMs/defBuffMult, server-only) + `skillCooldowns: Map<string,number>` (reemplaza skillCooldownMs; server-only). Init en constructor/onJoin.
- **MobState:** dotMs/dotDps/dotAttackerId/dotAccumMs (server-only).
- **CombatSystem.resolveAttack:** usar pAtk efectivo del atacante (× atkBuffMult si "atkBuffMs" in attacker && >0) y pDef efectivo del target (× defBuffMult si activo). Mobs no tienen esos campos → factor 1.
- **useSkill handler:** `const kit = getClass(p.className).skills; if (!kit.includes(msg.skillId)) return;` `const s = getSkill(msg.skillId);` chequear `p.mp>=s.mpCost` y cooldown (`(p.skillCooldowns.get(s.id)??0)<=0`). Si ok: descontar MP, set cooldown `p.skillCooldowns.set(s.id, s.cooldownMs)`, y por type:
  - `damage`: requiere target mob en rango → resolveAttack(p, mob, s.factor, variance, atkCd). (como hoy)
  - `heal`: `p.hp = min(p.maxHp, p.hp + round(p.maxHp * s.healPct))`. Sin target. (broadcast damage negativo/heal opcional; mínimo: sube hp.)
  - `buff`: setear el buff de la clase: si buffStat "pAtk" → atkBuffMs=s.buffMs, atkBuffMult=s.buffMult; si "pDef" → defBuff*. Sin target.
  - `dot`: requiere target mob en rango → mob.dotMs=s.dotMs, mob.dotDps=s.dotDps, mob.dotAttackerId=p.sessionId, mob.dotAccumMs=0. (reemplaza veneno previo)
- **Tick:** decrementar atkBuffMs/defBuffMs (al llegar a 0, mult=1) y cada entry de skillCooldowns; para cada mob con dotMs>0: dotAccumMs+=dtMs; mientras dotAccumMs>=500 (tick cada 0.5s) aplicar dmg=round(dotDps*0.5) → mob.hp-=dmg, broadcast damage {targetId, amount:dmg, attackerId:dotAttackerId}, dotAccumMs-=500; dotMs-=dtMs; si mob muere → killMob(mob,id,dotAttackerId) y limpiar dot; si dotMs<=0 limpiar.
- [ ] `npx tsc` + `npm test --workspace @aden/server`. **CORRÉ TAMBIÉN `npx tsc -p server/tsconfig.json --noEmit`** (vitest no typechea). Boot OK.
- [ ] Commit `feat(server): skills por tipo (dano/cura/buff/veneno), cooldown por-skill y stats efectivos`.

### Task 3: Client — 3 slots de skill (teclas 1/2/3), barra en HUD y feedback
**Files:** Modify `client/src/input/SkillInput.ts`, `client/src/render/Hud.ts` (o `SkillBar.ts` nuevo), `client/src/main.ts`.
- **SkillInput:** `setSkills(ids: string[])`; teclas `1`/`2`/`3` (y Space = slot 1) → `onUseSkill(ids[slot])`. 
- **HUD/SkillBar:** 3 slots visibles con nombre (`getSkill(id).name`) + tecla + overlay de cooldown (trackeo LOCAL: al apretar, arranca un timer = `getSkill(id).cooldownMs`; el server es la autoridad real, esto es solo UI). 
- **main.ts:** tras conectar, `skillInput.setSkills(getClassSkills(className))` y pasar el kit a la HUD. Al apretar una skill, además del send, feedback por tipo (toast usando `getSkill(id).type`/`name`: daño→(nada o "usaste X"), heal→"Te curaste", buff→"¡{name}!", dot→"Veneno aplicado") y arrancar el cooldown local del slot.
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): 3 slots de skill por clase (1/2/3), barra con cooldown y feedback`.

### Task 4: Verificación (controller)
- [ ] E2E (@colyseus/testing): (a) heal — bajar hp, castear la skill de cura de la clase → hp sube ~healPct*maxHp y baja MP. (b) buff — castear rage (barbarian) → atkBuffMs>0 y el daño de auto-attack sube vs sin buff. (c) dot — envenenar un mob → su hp baja por ticks en el tiempo sin volver a atacar. (d) cooldown — castear dos veces seguidas la misma skill → la segunda es no-op (sigue en cooldown). (e) validación — un knight mandando "fireball" → no-op (no está en su kit). Documentar PASS/FAIL. Correr tsc estricto de server + full suite.
- [ ] Boot del cliente: la barra de 3 skills aparece según la clase; smoke visual.

---

## Self-Review
- **Skills/habilidades diferentes por clase:** Tasks 1–3 (3 por clase, 4 tipos: daño/cura/buff/veneno).
- **Server autoritativo:** MP/cooldown/daño/cura/buff/veneno 100% server; cliente manda slot + UI local.
- **No rompe:** combate/persistencia/tienda/misiones intactos; buffs solo a jugadores; veneno rutea exp/loot por killMob.
- **Fuera de alcance (E5c+):** AoE/multi-target, rasgos pasivos por clase, más de 3 skills/árbol, sincronizar buffs/cooldowns al cliente (hoy UI local), balance fino, cambiar de clase.
