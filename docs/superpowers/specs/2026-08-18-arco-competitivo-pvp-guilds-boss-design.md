# Diseño — Arco competitivo: PvP + Guilds + Boss contestado + Leaderboard

Fecha: 2026-08-18
Estado: aprobado por el usuario (2026-08-18)

## Problema

El juego tiene loop de combate, clases, skills, quests y un jefe, pero todo es
PvE en soledad. No hay atractivo competitivo: nada genera rivalidad ni razón
para volver. En un MMO estilo Lineage 2 el gancho nunca fue el PvE, sino
**competir contra otros jugadores** y **querer estar más arriba que ellos**.

La base cara ya existe: servidor autoritativo multijugador en tiempo real
(Colyseus) con persistencia. Este arco la explota.

## Decisiones del usuario (2026-08-18)

- **PvP**: pueblo seguro, afuera PvP libre (estilo L2 clásico).
- **Premio del boss**: golpe final (last hit) — la guild del que remata gana.
- **Guilds**: mínimo (tag + roster + líder).
- **Muerte PvP**: pierde algo de oro/exp (sube las apuestas).

## Decisiones técnicas transversales

### Targeting unificado (habilitador central)
Hoy `SetTarget` solo acepta ids de mobs y el auto-ataque solo golpea mobs
(`GameRoom.ts`: handler `SetTarget` valida contra `state.mobs`; loop de
auto-ataque itera `state.mobs.get(p.targetId)`). Se generaliza: `targetId`
puede ser un mob **o** un `sessionId` de jugador. Un helper
`resolveTarget(id)` devuelve `{kind: "mob"|"player", entity}`. El motor de daño
(`resolveAttack` / `computeDamage`) ya sirve para ambos (ambos tienen
`hp/pAtk/pDef`). Esto convierte el combate PvE en PvP sin reescribir el motor.

### Zona segura
Se reusa `SAFE_RADIUS` (pueblo, centro `TOWN`). Regla PvP: para que un golpe
entre jugadores conecte, **ambos** (atacante y objetivo) deben estar fuera de
`SAFE_RADIUS`. Coherente con el aggro de mobs, que ya excluye el pueblo
(`eligiblePlayersForAggro`).

### Ataques de jugador instantáneos
El telegraph/esquive (E8) queda solo para mobs y jefe. En PvP el kiteo ya es el
skill; golpes de jugador instantáneos = más simple y justo. (YAGNI: sin
wind-up en PvP.)

### DoT en PvP fuera de alcance (MVP)
El veneno (skill `dot`) requiere campos de estado en el objetivo
(`dotMs/dotDps/...`, hoy solo en `MobState`). En este arco los skills `dot`
siguen aplicando solo a mobs; auto-ataque y skills `damage` sí aplican a
jugadores. Extender DoT a jugadores queda para después.

## Arquitectura por sub-etapa

Cada sub-etapa es jugable y verificable por separado, y se mergea andando antes
de pasar a la siguiente (mismo ritmo SDD que las etapas previas).

### 9a — PvP core

**Servidor (`GameRoom.ts`, `PlayerState.ts`, shared):**
- `SetTarget` acepta un `sessionId` de jugador: existente, vivo, distinto del
  propio. Se valida contra `state.players` además de `state.mobs`.
- Helper `resolveTarget(targetId)` → mob o jugador (o `null`).
- Loop de auto-ataque (`tick`): si el target es jugador, ambos fuera de
  `SAFE_RADIUS` y en `ATTACK_RANGE` → `resolveAttack` contra el jugador, se
  broadcastea `Damage`. Si `hp <= 0` → muerte PvP.
- Skills `damage` (handler `UseSkill`): mismo unificado — pueden apuntar a un
  jugador con las mismas reglas de zona/rango.
- **Muerte PvP** (`killPlayer(victim, victimId, killerId)`, nuevo helper que
  centraliza la muerte de jugador): marca `dead`, `respawnMs = PLAYER_RESPAWN_MS`,
  respawn en pueblo (ya existe el loop de respawn). Penalidad:
  `victim.gold = floor(victim.gold * (1 - PVP_GOLD_LOSS_PCT))` y resta
  `PVP_EXP_LOSS_PCT` de la exp del nivel actual **sin bajar de nivel** (piso en
  la exp base del nivel). El asesino: `killer.pvpKills++`.
- Constantes nuevas en shared (`pvp.ts` nuevo, o `combat.ts`):
  `PVP_GOLD_LOSS_PCT = 0.10`, `PVP_EXP_LOSS_PCT = 0.05`.
- `PlayerState`: `@type("number") pvpKills = 0;` (sincronizado). Persistido
  (`CharacterSave.pvpKills`, `toCharacterSave`, load en `onJoin`, columna
  Supabase).

**Cliente (`main.ts`, `EntityViews.ts`, HUD):**
- Click sobre otro jugador → lo targetea (anillo rojo de objetivo, reusa el de
  mobs). Los números de daño ya funcionan por `targetId`.
- Muerte de jugador ya se broadcastea via `Death`.
- Indicador chico en el HUD: "Zona segura" / "Zona PvP" según distancia del
  propio jugador a `TOWN` vs `SAFE_RADIUS`.

**Fuera de alcance 9a:** guilds (todo jugador es enemigo de todos afuera hasta
9b), leaderboard.

### 9b — Guilds (mínimo)

**Persistencia (nueva tabla `guilds`):**
- `PersistenceService` se extiende: `loadGuild(id)`, `saveGuild(g)`,
  `topGuilds(limit)`. `InMemoryPersistence` implementa las tres; Supabase idem
  (tabla `guilds`: `id text pk, name text, tag text, leaderName text,
  bossKills int, createdAt`).
- Motivo de tabla propia: el leaderboard de guilds (9d) y la persistencia del
  líder la requieren. La identidad de guild también se copia al personaje.
- `CharacterSave` gana `guildId`, `guildName`, `guildTag` (default "").

**Estado en sala (`GameState`, `GuildState` nuevo):**
- `GameState.guilds: MapSchema<GuildState>` — registro **vivo** de guilds con al
  menos un miembro online. `GuildState`: `id, name, tag, leaderName, bossKills`.
- El roster se arma en el cliente filtrando `state.players` por `guildId` (no se
  sincroniza lista de miembros aparte).

**Mensajes (protocol):**
- `CreateGuild {name, tag}`: valida tag (3–4 chars, único entre guilds vivas),
  crea `GuildState` + fila persistida, marca al creador `guildRole = "leader"`,
  setea `guildId/guildName/guildTag` en el jugador.
- `JoinGuild {guildId}`: copia identidad de la guild al jugador (rol "member").
- `LeaveGuild`: limpia identidad en el jugador. El líder que se va no destruye
  la guild (persiste); MVP: sigue existiendo con su fila.

**Jugador (`PlayerState`):** `@type("string") guildId = "";`,
`@type("string") guildTag = "";` (para el nameplate). `guildRole` server-only.

**Combate:** fuego amigo protegido — en la resolución PvP, si
`attacker.guildId !== "" && attacker.guildId === target.guildId` → sin daño.

**Cliente:** tag `[XXX]` en el nameplate; panel simple de guild (crear/unirse/
salir, ver roster de miembros online).

### 9c — Boss contestado (last hit)

- El jefe (`skeleton_king`) ya existe y respawnea por timer
  (`respawnForTemplate`). Con last-hit **no** se acumula daño.
- En `killMob`, si el mob es boss (`isBoss(templateId)`) y hay `killerId` con
  guild: `guild.bossKills++` (persistido via `saveGuild`) y se broadcastea un
  evento nuevo `BossKilled {tag, name, bossName}` → toast server-wide
  ("⚔ ¡La guild [TAG] abatió al Rey Esqueleto!").
- El drop raro (corona) ya cae al piso; lo agarra quien esté cerca (ya
  funciona). PvP activo en la arena (fuera del pueblo) = las guilds se disputan
  el remate a los golpes. Sale del combo 9a+9b sin lógica de "zona boss" nueva.
- Protocol: `BossKilled` event.

### 9d — Leaderboard

- Panel en pantalla (tecla `L`): dos tablas — **Jugadores** (top por nivel,
  desempate por `pvpKills`) y **Guilds** (top por `bossKills`).
- Incluye offline: el ranking se calcula en el servidor consultando la
  persistencia (`topCharacters(limit)` nuevo en `PersistenceService`, y
  `topGuilds`). El servidor sincroniza un snapshot chico (top 10 de cada uno) a
  `GameState` cada ~15s (nuevo `LeaderboardState` / `MapSchema` liviano), o lo
  envía on-demand por mensaje `RequestLeaderboard`. Se usa el snapshot
  periódico sincronizado (sin ida y vuelta por click).
- `PersistenceService`: `topCharacters(limit)` (nombre, nivel, pvpKills,
  className) y `topGuilds(limit)` (name, tag, bossKills). InMemory + Supabase.

## Flujo de datos (PvP kill)

1. Cliente A clickea a B → `SetTarget {targetId: B}`.
2. Tick: A en rango y ambos fuera de pueblo y (no misma guild) → `resolveAttack`
   → `Damage` broadcast → `B.hp` baja.
3. `B.hp <= 0` → `killPlayer(B, ...)`: `Death` broadcast, penalidad oro/exp a B,
   `A.pvpKills++`, B respawnea en pueblo por el loop existente.

## Manejo de errores / edge cases

- Target inválido/desaparecido: el loop limpia `targetId` (ya lo hace para mobs).
- Autoataque a sí mismo: `SetTarget` rechaza el propio `sessionId`.
- Golpe cruzando el borde del pueblo: se chequea zona de **ambos** cada tick, así
  que entrar al pueblo corta el PvP inmediatamente (refugio real).
- Tag de guild duplicado: `CreateGuild` valida unicidad entre guilds vivas.
- Guild sin líder online: la guild persiste por su fila; MVP no reasigna líder.
- Delevel por muerte PvP: prohibido en MVP (piso en exp base del nivel).

## Testing

- **shared**: constantes PvP, cálculo de penalidad (oro/exp con piso de nivel),
  validación de tag.
- **server (E2E @colyseus/testing)**: A pega a B fuera del pueblo → B pierde hp;
  dentro del pueblo → sin daño; misma guild → sin daño; B muere → penalidad +
  `A.pvpKills++` + respawn; crear/unirse/salir guild; boss last-hit →
  `guild.bossKills++` + `BossKilled`; leaderboard ordena bien.
- **persistencia**: `pvpKills`/guild fields en fixtures; `topCharacters`/
  `topGuilds` ordenan; guild CRUD.
- **cliente (smoke/unit)**: nameplate con tag; targetear jugador; panel guild;
  panel leaderboard; indicador de zona.
- **tsc estricto** en shared/server/client (`--noEmit`) + 0 artefactos.

## Orden de construcción

Un spec (este) → plan de implementación por sub-etapa vía writing-plans,
empezando por 9a. Cada sub-etapa se mergea a master andando antes de la
siguiente. Supabase: migraciones (`characters.pvpKills`/guild cols, tabla
`guilds`) vía MCP apply_migration cuando toque cada sub-etapa.
