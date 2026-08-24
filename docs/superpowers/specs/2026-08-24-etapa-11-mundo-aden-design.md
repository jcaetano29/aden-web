# Etapa 11 — El Mundo de Aden (rediseño de mundo, zonas y progresión)

## Problema

El juego tenía mecánicas sólidas (combate, IA, drops, quests, niveles, persistencia,
red, PvP, guilds) pero el MUNDO se sentía a prototipo: un único plano de pasto 100×100,
un solo bioma, 3 spawn-zones sueltas casi pegadas, y un boss = warrior escalado sobre
el mismo pasto. Cero sensación de viaje, exploración, progresión espacial ni "lugar".

## Objetivo

Transformar el prototipo en un mundo con sentido, con el loop:
EXPLORAR → COMBATIR → RECOMPENSA → MEJORAR → NUEVA ZONA → ENEMIGOS MÁS FUERTES → BOSS.
Reutilizar TODO el motor (no se reescribe combate/red/persistencia); se reconstruye el
mundo encima, aprovechando que ya era data-driven.

## Diseño

**Mundo encadenado sur→norte** (norte = -Z = peligro creciente, encaja con el lore
"las Ruinas del Norte"). Fuente de verdad compartida nueva: `shared/src/world.ts`
(`ZONES`, `zoneAt`, `getZone`, biomas). `MAP_BOUNDS` se estira a x[-70,70] z[-140,55].

Zonas (centro, nivel recomendado, bioma):
1. **Pueblo de Aden** (0,30) — seguro. Prado + plaza empedrada + NPCs + tienda. Spawn/respawn.
2. **Bosque de Umbra** (0,-14) — Lv 1-3. Coníferas densas, verde. Huesos musgosos (tinte verde).
3. **Ruinas de Nihil** (-34,-64) — Lv 3-6. Columnas rotas, cristales violeta. Guardianes de cripta (tinte violeta) + **mini-jefe Centinela de Nihil**.
4. **Yermo Ceniciento** (30,-82) — Lv 6-9. Árboles muertos, brasas ascendentes, rojo. Verdugos ardientes (tinte rojo, élites).
5. **Trono del Rey Nihil** (0,-120) — jefe. Arena de pilares de hueso, braseros, trono de obsidiana. Rey Nihil (1000 HP).

**Variedad de enemigos sin modelos nuevos**: los 2 modelos base (Skeleton_Minion/Warrior)
se reusan como variantes por zona vía `tint` (multiply de material, por instancia) + `scale`
+ stats escaladas. Mini-jefe (`miniBoss`) con trato visual propio (nameplate violeta) pero
sin crédito de guild (ese sigue siendo sólo del jefe final).

**Progresión / gating**: por dificultad + señalización, sin muros. Las stats/EXP/loot
escalan con la profundidad → un jugador de bajo nivel que se adentra es aplastado (gating
natural). La cadena de misiones (6, `q1..q6`) es la brújula: cada quest empuja una zona más
al norte; el marcador del minimapa apunta al spawn del enemigo objetivo. Loot mejora con la
profundidad (más oro, Poción Mayor, trofeos `ancient_relic`/`ember_core`, corona del jefe).

**Identidad visual (biomas)**: `Environment` se reescribe como sistema data-driven por zona:
disco de suelo coloreado por bioma, props temáticos, caminos de tierra que encadenan las
zonas, y **niebla + luz que se interpolan al cruzar** de una zona a otra (`updateMood`).
`ZoneBanner` anuncia cinemáticamente cada zona nueva con su nivel recomendado (descubrimiento
+ señal de peligro). El minimapa dibuja las zonas con su color de bioma (mapa de un vistazo).

## Fuera de alcance (siguiente etapa)

- Sistema de equipamiento/gear con rareza (el usuario lo listó como prioridad media, debajo
  de estructura de mundo). Los trofeos de zona quedan como base para engancharlo después.
- Cofres/secretos físicos explorables (hoy la recompensa es el loot escalado por zona).

## Verificación

233 tests (120 shared + 70 server + 43 client), tsc estricto limpio en los 3 workspaces,
build de producción del cliente OK, boot del cliente sin errores de consola. El render en
vivo del mundo 3D requiere conexión WS (bloqueada en el sandbox) → pendiente-usuario.
