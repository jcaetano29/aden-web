# Eventos de servidor: invasiones de jefes — diseño

**Estado:** aprobado por el usuario (2026-09-26), sección por sección.
**Contexto:** primer subproyecto del sistema de eventos. Después vienen el Castillo del Caos (arena todos contra todos, inspirado en Chaos Castle de MU) y más eventos (invasión dorada, oleadas, carreras), cada uno con su propio diseño sobre esta base.

## Objetivo

Que el mundo tenga momentos compartidos: un jefe invade el pueblo o un mapa de caza por tiempo limitado, los gremios se organizan para matarlo y compiten por su botín único. Es contenido de grupo que alimenta la economía de intercambio (piezas únicas que no caen en ningún otro lado).

## Decisiones del usuario

| Tema | Decisión |
|---|---|
| Quién se lleva el botín único | El gremio (o jugador sin gremio) que más daño hizo. El resto recibe una recompensa de participación. |
| Dónde | Pueblo y mapas de caza. Mientras dura, el área alrededor del jefe es zona PvP para nivel 10+; los menores de 10 quedan protegidos. |
| Cuándo | Una gran invasión diaria en horario fijo (21:00 Argentina) + invasiones chicas al azar cada 2–4 h. Todas se anuncian 5 minutos antes. |
| Dificultad | Fija, siempre difícil: pensada para grupo. No se adapta a la cantidad de jugadores. |

## Ciclo de una invasión

1. **Anuncio** (5 min antes): mensaje global con el lugar ("Se avistan dragones sobre el Pueblo de Aden"), marcador en el minimapa y en el mapa de viaje, cartel de evento con cuenta regresiva.
2. **Invasión** (20 min): aparece el jefe en el punto elegido. Se forma el **área de invasión** (radio 30) centrada en su punto de aparición.
3. **Cierre:**
   - Si muere: se anuncia el gremio ganador, cae el botín único reservado y se entregan las recompensas de participación.
   - Si se acaba el tiempo: el jefe se retira ("El Dragón Carmesí se retira hacia las montañas"), sin botín.

Nunca hay dos invasiones activas o anunciadas a la vez.

## Horarios

- **Gran invasión diaria:** 21:00 hora de Argentina (UTC−3, sin horario de verano) = 00:00 UTC. El anuncio sale a las 20:55. Lugar: el pueblo o un mapa grande, elegido al azar de su lista.
- **Invasiones chicas:** la siguiente se programa entre 2 y 4 horas después del cierre de la anterior (o del arranque del server). Lugar: un mapa de caza al azar de la lista del invasor. Solo se disparan si hay al menos 2 jugadores conectados en el momento del anuncio; si no, se reprograma la ventana siguiente.
- Si una chica caería dentro de los 30 minutos previos a la gran invasión, se corre para después.
- Los eventos no se guardan: si el server se reinicia, la invasión en curso se pierde y los horarios se recalculan.

## Jefes invasores

Plantillas nuevas de mob con modelos existentes y tinte propio. Usan los ataques anunciados ya existentes (cono, círculo, canalización) y no apuntan ni dañan a jugadores de menos de nivel 10. Son `rank: 'boss'` (botín de jefe: 90 % pieza del catálogo, 25 % Excelente).

| Invasor | Nivel | Dónde | Modelo | Pensado para |
|---|---|---|---|---|
| Dragón Carmesí (gran invasión) | 25 | Pueblo, Marismas, Minas, Fragua | AncientDrake grande | 5–6 jugadores, ~5 min |
| Heraldo del Yermo | 10 | Bosque, Ruinas, Yermo | InfernalDemon | ~3 jugadores, 2–3 min |
| Espectro del Velo | 16 | Marismas, Monasterio | DeathWraith | ~3 jugadores, 2–3 min |
| Coloso de Brasa | 26 | Minas, Fragua | ForestTroll | ~3 jugadores, 2–3 min |

- El punto de aparición es fijo por mapa (plaza del pueblo, claros abiertos de cada mapa), elegido para que haya espacio para pelear y esquivar.
- **Dificultad fija, calibrada con el simulador de grupo:** el grupo objetivo gana dentro del tiempo; un jugador solo, atento y al nivel, no llega a matarlo en los 20 minutos o muere.

## Daño, botín y recompensas

- **Conteo de daño:** el server suma el daño que cada jugador hace al jefe (golpes, skills y daño en el tiempo) y lo agrupa por gremio (`guildId`); un jugador sin gremio compite solo. El ranking de los 3 primeros se comparte con los clientes.
- **Botín único reservado:** al morir, el jefe suelta su pieza única reservada durante 60 s para el gremio ganador (solo sus miembros pueden levantarla; si ganó un jugador sin gremio, solo él). Después es pública como cualquier botín. La pieza sigue en el mundo: quien pierde la pelea o tarda, puede perderla.
- **Piezas únicas** (reuso del catálogo; nada de esto cae en otro lado):
  - Dragón Carmesí: una de las 3 alas (nivel 40) o una de las 3 mascotas, más una gema de mejora garantizada.
  - Invasores chicos: una mascota con 20 % de chance; si no, una gema de mejora.
- **Botín normal de jefe** además de la pieza única.
- **Participación:** todo jugador que hizo al menos 1 % del daño total recibe directo en el inventario oro y EXP escalados al invasor, más 15 % de chance de una gema de mejora. El último golpe no da nada extra.
- **PvP en el área:** matar a otro jugador dentro del área de invasión activa no aplica la penalidad de muerte PvP (10 % del oro, 5 % de la EXP del nivel).

## Reglas del área de invasión

- Un jugador está en el área si está en el mapa del evento, a 30 unidades o menos del punto de aparición, con la invasión en fase activa.
- Dentro del área, dos jugadores de nivel 10+ pueden atacarse aunque el mapa sea seguro (pueblo). Fuera del área rige la regla normal del mapa.
- Menores de nivel 10: no pueden atacar ni ser atacados en el área, el jefe no los elige de objetivo y sus ataques anunciados no los dañan.

## Cliente

- **Cartel de evento** (arriba al centro): nombre del invasor, lugar y cuenta regresiva; en fase activa, tiempo restante y top 3 de gremios con su porcentaje de daño.
- **Marcador** en el minimapa y en el mapa de viaje (M) mientras el evento está anunciado o activo.
- **Indicador de zona:** "Área de invasión · PvP" al entrar al área; "Área de invasión · protegido" para menores de 10.
- **Anuncios** con los mensajes globales existentes: aviso, aparición, gremio ganador o retirada.
- La pieza reservada muestra en su etiqueta el gremio dueño y el tiempo de reserva.

## Arquitectura

- **`shared/src/events.ts`** (puro, testeable con reloj inyectado):
  - `INVADERS`: definiciones (plantilla, mapas y puntos de aparición, piezas únicas, recompensas).
  - Horarios: `nextDailyInvasion(now)`, `nextMinorInvasion(from, rng)`, constantes (aviso 5 min, duración 20 min, radio 30, reserva 60 s, nivel mínimo 10).
  - Reglas: `inInvasionArea(event, mapId, x, z)`, `invasionProtected(level)`.
- **Mobs y encuentros:** plantillas nuevas en `mobs.ts`, `MOB_COMBAT`, `MOB_EXP`, tablas de botín base y patrones en `encounters.ts`, con un campo nuevo de nivel mínimo de objetivo (`minTargetLevel: 10`) que respetan la IA y los ataques anunciados.
- **`server/src/systems/EventSystem.ts`:** ciclo de vida (programado → anunciado → activo → cerrado), conteo de daño, resolución del botín y las recompensas. Recibe el reloj y el azar por inyección.
- **Enganches en `GameRoom`:** el tick; el registro de daño a mobs (skills, golpes, daño en el tiempo); la muerte de mobs; la regla de zona PvP (`inPvpZone`) y la penalidad de muerte PvP.
- **Botín reservado:** campos server-only en `DroppedItemState` (`reservedGuildId`, `reservedPlayerId`, `reservedMs`); `tryPickup` los respeta y el tick los libera. La etiqueta del cliente recibe el nombre del gremio por un campo sincronizado nuevo.
- **Estado sincronizado:** `WorldEventState` en `GameState` (`worldEvent`): id, invasor, fase, mapa, x, z, radio, inicio, fin y ranking (top 3). Es un cambio de schema: cliente y server se publican juntos (pasa solo al pushear a master).

## Tests

- **Unitarios (`shared`):** 21:00 Argentina = 00:00 UTC; ventanas chicas entre 2 y 4 h; sin superposición y con margen de 30 min antes de la gran invasión; mínimo de jugadores; área y protección.
- **Server con conexiones reales:** invasión completa con dos gremios (anuncio → aparición → daño → muerte → pieza reservada solo para el ganador 60 s → pública → recompensas de participación); retirada al acabarse el tiempo; menores de 10 protegidos; PvP en el área del pueblo sin penalidad y fuera del área sin PvP.
- **Simulador de grupo:** el simulador de balance pelea con varios bots a la vez; el grupo objetivo gana dentro del tiempo y el jugador solo no.
- **Navegador:** server semilla temporal que dispara una invasión al instante; se verifican cartel, marcador, indicador de zona, ranking y consola sin errores.

## Fuera de alcance

- Castillo del Caos, invasión dorada, oleadas y carreras (subproyectos siguientes).
- Guardado de eventos entre reinicios del server.
- Herramientas de administración para disparar eventos en producción.
