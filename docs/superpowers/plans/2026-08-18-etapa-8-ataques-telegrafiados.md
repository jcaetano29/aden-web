# Etapa 8 — Ataques telegrafiados y esquive (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o executing-plans, task-by-task. Steps con checkbox (`- [ ]`).

**Goal:** Darle skill al combate. Los mobs (y el jefe) dejan de pegar al instante: cuando van a atacar, **avisan** con un **wind-up** (~700ms) durante el cual se **plantan** (no se mueven) y muestran un **anillo rojo** del rango en el piso. El golpe **solo conecta si el jugador sigue dentro del rango** al terminar el wind-up; si se salió, lo **esquivó**. Como el jugador es más rápido que los mobs y estos quedan plantados mientras cargan, esquivar es viable → posicionamiento importa.

**Architecture:** El combate mob→jugador pasa a dos fases. Se sincroniza `MobState.windupMs` (@type) para que el cliente dibuje el telegraph desde el estado (robusto, sin evento nuevo obligatorio). Al resolverse, si el objetivo salió de rango → esquivado (feedback vía `DamageEvent.dodged`). Los mobs no se mueven mientras `windupMs>0`. Server autoritativo: el daño/esquive lo decide el server; el cliente solo dibuja el aviso y el feedback.

**Tech Stack:** TypeScript monorepo, Colyseus 0.15, Three.js, Vitest.

## Global Constraints
- ESM, `strict:true`. Server autoritativo. No romper: auto-attack del jugador, skills, aggro, loot, muerte/respawn, jefe.
- El wind-up aplica al ataque de MOBS (incluye el jefe). El ataque del JUGADOR sigue instantáneo (no cambia).
- Ventana de esquive global `ATTACK_WINDUP_MS = 700`. El mob queda plantado (no avanza) mientras carga.

---

## File Structure
```
shared/src/combat.ts     (MODIFICAR) export const ATTACK_WINDUP_MS = 700;
shared/src/protocol.ts   (MODIFICAR) DamageEvent gana `dodged?: boolean` (opcional; true = ataque esquivado, amount 0).
shared/src/*.test.ts     (MODIFICAR) ATTACK_WINDUP_MS existe / >0.

server/src/state/MobState.ts (MODIFICAR) @type("number") windupMs = 0 (SINCRONIZADO, para el telegraph); server-only windupTargetId = "".
server/src/rooms/GameRoom.ts (MODIFICAR)
  - En el loop de movimiento de mobs (~378): si mob.windupMs>0 → mob.moving=false y NO avanzar (plantado); igual seguir con los demás.
  - Reemplazar el ataque instantáneo de mobs (~436-450) por dos fases:
    * Si windupMs>0: decrementar; si llega a 0 → resolver: setear cooldown (getMobCombat.attackCooldownMs); si el objetivo existe/vivo y distance2D(mob,target)<=ATTACK_RANGE → daño (computeDamage con def efectiva/buffs; broadcast Damage; muerte/respawn); si NO en rango → esquivado (broadcast Damage {amount:0, dodged:true}); limpiar windupTargetId.
    * Si windupMs==0: si hay aggroTargetId vivo, en rango, y attackCooldownMs<=0 → iniciar wind-up (windupMs=ATTACK_WINDUP_MS, windupTargetId=aggroTargetId). NO setear cooldown todavía.
  - onJoin/spawn: windupMs=0, windupTargetId="".

client/src/render/EntityViews.ts (MODIFICAR) por cada mob, un anillo de telegraph (RingGeometry ~ATTACK_RANGE, rojo, plano en el piso, oculto). En updateMob: mostrarlo si snap.windupMs>0 (opcional: opacidad/escala según progreso), ocultarlo si 0. Limpiar en removeMob.
client/src/render/MobSnapshot / net (MODIFICAR) el snapshot del mob incluye windupMs (para updateMob).
client/src/render/DamageNumbers.ts o main onDamage (MODIFICAR) si ev.dodged → mostrar "¡Esquivado!" (texto verde) en vez de número.
```

---

### Task 1: Shared — constante de wind-up + flag de esquive (puro, TDD)
**Files:** Modify `shared/src/combat.ts`, `shared/src/protocol.ts`, tests.
- `combat.ts`: `export const ATTACK_WINDUP_MS = 700;`.
- `protocol.ts`: `DamageEvent` gana `dodged?: boolean;` (opcional, no rompe emisores actuales).
- [ ] Tests: ATTACK_WINDUP_MS > 0; el tipo DamageEvent acepta dodged. `npm test --workspace @aden/shared` + `npx tsc -p shared/tsconfig.json --noEmit`.
- [ ] Commit `feat(shared): ATTACK_WINDUP_MS y DamageEvent.dodged (base de esquive)`.

### Task 2: Server — ataque de mobs en dos fases (wind-up + esquive)
**Files:** Modify `server/src/state/MobState.ts`, `server/src/rooms/GameRoom.ts`.
- `MobState`: `@type("number") windupMs = 0;` (sincronizado) + server-only `windupTargetId = "";`.
- **Movimiento de mobs (~378 forEach):** al inicio, `if (mob.windupMs > 0) { mob.moving = false; return; }` (plantado mientras carga) — antes de stepMobAI/advanceMovable.
- **Ataque de mobs (~436 forEach):** reescribir a dos fases (ver File Structure). Usar `distance2D` (ya importado) y `computeDamage`/`getMobCombat`. Para la def efectiva del jugador con buff, reusar el mismo criterio que resolveAttack (o llamar resolveAttack en el impacto — pero OJO: resolveAttack setea attacker.attackCooldownMs; está OK setearlo en el impacto). Si esquivado, NO llamar resolveAttack (setear cooldown a mano) y broadcast Damage {attackerId:mobId, targetId, amount:0, hp:player.hp, dodged:true}.
- spawnMob/onJoin del mob: windupMs=0, windupTargetId="".
- [ ] `npx tsc -p server/tsconfig.json --noEmit` + `npm test --workspace @aden/server`. Boot OK.
- [ ] Commit `feat(server): ataque de mobs telegrafiado (wind-up plantado + esquive por rango)`.

### Task 3: Client — telegraph del wind-up + feedback de esquive
**Files:** Modify `client/src/render/EntityViews.ts` (+ el snapshot de mob en `net/NetworkClient.ts` para incluir windupMs), `client/src/main.ts` (onDamage → dodged).
- El snapshot de mob que arma NetworkClient debe incluir `windupMs` (leer `m.windupMs ?? 0`).
- `EntityViews`: por cada mob, crear un anillo de telegraph — `new THREE.Mesh(new THREE.RingGeometry(ATTACK_RANGE*0.82, ATTACK_RANGE, 32), new THREE.MeshBasicMaterial({ color:0xff2a2a, transparent:true, opacity:0.5, side:THREE.DoubleSide }))`, `rotation.x=-Math.PI/2`, `position.y=0.05`, agregado a la escena o como hijo del mob root (seguir su posición). Oculto por defecto (`visible=false`). En `updateMob`: `ring.visible = snap.windupMs > 0` (opcional: subir opacidad a medida que windupMs baja, para "inminencia"). Posicionar el anillo en x/z del mob. Disponer geometría/material en removeMob (o compartir la geometría entre mobs y solo disponer al final).
- `main.ts onDamage`: si `ev.dodged` → `damageNumbers` (o un toast) muestra "¡Esquivado!" en verde en la posición del target, en vez del número 0. (Si es más simple, DamageNumbers.spawn con un texto/coloreado especial.)
- [ ] `npx tsc -p client/tsconfig.json` + `npm run build --workspace @aden/client`.
- [ ] Commit `feat(client): telegraph del wind-up (anillo de rango) y feedback de esquive`.

### Task 4: Verificación (controller)
- [ ] E2E (@colyseus/testing): poner un mob con aggro sobre un jugador en rango; avanzar sim ticks → `mob.windupMs` se activa (>0) y el mob no se mueve; seguir avanzando hasta que windupMs llegue a 0 CON el jugador en rango → el hp del jugador baja (impacto). Segundo caso: durante el wind-up, mover al jugador fuera de rango (setear p.x lejos) → al resolver, el hp NO baja (esquivado). Documentar PASS/FAIL. tsc estricto server + full suite.
- [ ] Boot cliente: al pelear, aparece el anillo rojo bajo el mob antes de pegar. (Visual lo confirma el usuario.)

---

## Self-Review
- **Esquivable / posicionamiento:** Tasks 2-3 (wind-up plantado + chequeo de rango al impacto + telegraph).
- **Aviso visible:** Task 3 (anillo del rango) + Task 2 (windupMs sincronizado).
- **Server autoritativo:** daño/esquive 100% server; cliente dibuja aviso + feedback.
- **No rompe:** auto-attack del jugador y skills intactos; aggro/loot/muerte igual; aplica también al jefe.
- **Fuera de alcance (futuro):** ataques en cono/línea, patrones de jefe, indicador de dirección, i-frames/roll dedicado, telegraph para skills del jugador.
```
