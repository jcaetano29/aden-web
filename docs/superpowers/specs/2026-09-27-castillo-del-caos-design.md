# Castillo del Caos — diseño

**Estado:** aprobado por el usuario (2026-09-27), sección por sección.
**Contexto:** segundo subproyecto del sistema de eventos, inspirado en Chaos Castle de MU Online. Se apoya en el sistema de eventos de las invasiones (programación, anuncios, cartel, estado compartido).

## Objetivo

Una arena todos contra todos por horario, con entrada por un ítem intercambiable, donde el piso se derrumba desde los bordes y gana el último en pie. Suma PvP organizado, un bien de comercio (el Sello del Caos) y premios en gemas para la economía.

## Decisiones del usuario

| Tema | Decisión |
|---|---|
| Entrada | Un ítem de entrada (Sello del Caos) que cae de enemigos con baja chance y se puede intercambiar. |
| Niveles | Dos tramos alternados: Castillo Menor (10–19) y Castillo Mayor (20+). |
| Frecuencia | Cada 2 horas, a la media hora de las horas pares de Argentina, alternando tramos; inscripción de 5 min y partida de hasta 10 min. |

## Reglas de la partida

- **Inscripción:** abre 5 min antes del inicio. El jugador del tramo, en el pueblo y cerca del **Custodio del Caos**, le entrega un Sello del Caos (se consume). No se puede inscribir dos veces. Si al cerrar la inscripción hay menos de 2 inscriptos conectados, se devuelven los sellos con un aviso y no hay partida.
- **Arranque:** los inscriptos conectados aparecen en posiciones al azar del anillo exterior. La arena se completa con **Guardias del Caos** del tramo hasta 16 participantes en total (jugadores + monstruos), repartidos al azar por la plataforma.
- **Todos contra todos:** adentro no valen el grupo ni el gremio. El daño entre jugadores se multiplica por 0,5.
- **Puntos:** 2 por monstruo, 1 por jugador eliminado por vos.
- **Derrumbe:** la plataforma es un cuadrado de 60×60 con tres anillos (distancia Chebyshev al centro: borde 20–30, medio 10–20, centro 0–10). Cae primero el borde y después el medio. Cada derrumbe se dispara cuando quedan 12 (y después 8) participantes vivos, o a los 2:30 (y después a los 5:00) de partida, lo que ocurra primero. Se anuncia 5 s antes (anillo en rojo); al caer, quien esté en ese anillo cae al abismo y queda eliminado. Los monstruos que caen desaparecen sin dar puntos.
- **Eliminación:** morir o caer. El eliminado vuelve al pueblo con la vida completa, sin penalidad PvP ni temporizador de reaparición, y conserva sus puntos. Usar el viaje (M) o desconectarse durante la partida también elimina.
- **Fin:** gana el último jugador vivo (los monstruos no cuentan). A los 10 minutos gana el sobreviviente con más puntos; si no queda ninguno, el participante con más puntos. Al terminar, todos los que siguen en la arena vuelven al pueblo.
- **Premios:**
  - Ganador: 2 gemas de mejora al azar + oro (Menor 1.500, Mayor 4.000).
  - 2.º y 3.º por puntos: 1 gema de mejora.
  - Todos los participantes: EXP = puntos × (Menor 120, Mayor 400).
  - Anuncio global con el ganador y el podio; aviso personal con los premios.
- Los Guardias del Caos no sueltan botín ni dan EXP por muerte (la EXP sale de los puntos).

## Sello del Caos

- Ítem nuevo (no hay equivalente en el catálogo): `chaos_seal`, "Sello del Caos", apilable, intercambiable, rareza **Raro**, nivel requerido 10. Sirve para ambos castillos.
- No se vende en tiendas. Cae como tirada extra aparte del botín del catálogo:

| Fuente | Chance |
|---|---|
| Enemigo normal | 0,5 % |
| Élite | 3 % |
| Cofre | 3 % |
| Jefe | 10 % |
| Invasor | 2 sellos garantizados, públicos en el piso |

  No cae dentro del castillo ni de barriles.

## Custodio del Caos

NPC nuevo en la plaza del pueblo. Al hablarle muestra el próximo castillo (tramo y hora) y, con la inscripción abierta y si el jugador está en el tramo, la acción "Inscribirme (entregar Sello del Caos)". Si no tiene sello, fuera de tramo o fuera de horario, solo informa.

## Horario

- Cada 2 horas a la media hora de las horas pares de Argentina (UTC−3): 00:30, 02:30, …, 22:30 = 03:30, 05:30, …, 01:30 UTC.
- Tramo por turno: **Menor** en 00:30, 04:30, 08:30, 12:30, 16:30, 20:30; **Mayor** en 02:30, 06:30, 10:30, 14:30, 18:30, 22:30 (hora Argentina).
- Inscripción: 5 min antes del inicio. Duración máxima: 10 min.
- No choca con la gran invasión (21:00–21:20). Puede coincidir con una invasión chica: ocurren en mapas distintos.
- Programación automática apagada en tests y en el simulador (igual que las invasiones).

## Arena

- Mapa nuevo `castillo`, centro (900, 300), límites 835–965 × 235–365, oculto del mapa de viaje (no se puede viajar ni aparecer ahí fuera del evento).
- Plataforma de piedra flotando sobre un abismo oscuro, con los tres anillos diferenciados, antorchas y estandartes. Al derrumbarse un anillo, sus losas caen y desaparecen.

## Cliente

- **Cartel del castillo** (debajo del de invasiones):
  - inscripción abierta: "Castillo del Caos {Menor|Mayor} · la inscripción cierra en mm:ss · entregá un Sello del Caos al Custodio";
  - en partida (si estás adentro): participantes vivos, tus puntos y tiempo restante;
  - aviso de derrumbe: "¡El borde se derrumba!" / "¡El anillo medio se derrumba!".
- **Diálogo del Custodio** con el próximo castillo y el botón de inscripción.
- **Arena** con anillos que se pintan de rojo durante el aviso y desaparecen al caer.
- Indicador de zona: "⚔ Castillo del Caos".

## Arquitectura

- **`shared/src/chaosCastle.ts`** (puro, testeable con reloj inyectado): constantes (cupo 16, factor PvP 0,5, puntos, tiempos, geometría), `nextCastle(now)` → `{ startsAt, bracket }`, `castleBracket(level)`, `ringAt(x, z)`, `fallsAt(x, z, collapsed)`, premios por tramo, chances del sello por fuente (`CHAOS_SEAL_CHANCE`).
- **Contenido:** zona `castillo` (`hidden: true`), NPC `chaos_keeper`, ítem `chaos_seal`, plantillas `chaos_guard_minor` (15) y `chaos_guard_major` (25) con EXP 0 y sin botín.
- **`server/src/systems/ChaosCastleSystem.ts`:** ciclo programado → inscripción → partida → cierre; inscripción y devolución; teletransporte; relleno; derrumbes; eliminación; puntos; premios. Recibe reloj, azar y operaciones del servidor por una interfaz `CastleHost`.
- **Enganches en `GameRoom`:** tick; `InteractNpc` del Custodio; PvP adentro (todos contra todos, daño ×0,5); muerte adentro (eliminación sin penalidad); viaje y desconexión (eliminación); tirada extra del sello en el botín; 2 sellos por invasor; sin botín ni EXP de los guardias; `WarpTo` rechaza zonas ocultas.
- **Estado sincronizado:** `ChaosCastleState` en `GameState` (`castle`): fase (`''|'registration'|'active'`), tramo, `startsAt`, `endsAt`, `registered`, `alive`, `monsters`, `ring` (anillos caídos), `collapseAt` (epoch del próximo derrumbe o 0), `points` (mapa sessionId → puntos). Cambio de schema: cliente y server se publican juntos.

## Tests

- **Unitarios:** horarios (00:30 Menor = 03:30 UTC; 02:30 Mayor), alternancia, tramos por nivel, anillos y caída, chances del sello.
- **Server con conexiones reales:** inscripción (sello consumido, fuera de tramo o sin sello rechazado); devolución con menos de 2; arranque con relleno hasta 16; PvP al 50 % entre compañeros de gremio; puntos por monstruo y por jugador; derrumbe que elimina al que está en el borde; victoria del último en pie con premios; victoria por puntos al acabarse el tiempo; eliminación sin penalidad y vuelta al pueblo; viaje = eliminación; tirada extra del sello y los 2 sellos del invasor.
- **Cliente:** cartel en sus estados, diálogo del Custodio, arena con anillos.
- **Simulador:** un bot atento del tramo mata a un Guardia del Caos en 6–10 s.
- **Navegador:** server semilla que abre la inscripción al instante.

## Fuera de alcance

- Más eventos (invasión dorada, oleadas, carreras).
- Guardado de partidas entre reinicios del server.
- Cambio de apariencia de los participantes (en MU se ven como guardias).
