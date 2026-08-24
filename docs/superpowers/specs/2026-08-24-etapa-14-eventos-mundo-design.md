# Etapa 14 — Eventos de mundo (barra del jefe + anuncios)

## Objetivo

Convertir al Rey Nihil de "un enemigo grande" en un EVENTO con público y urgencia,
para que la comunidad se organice alrededor de él (encaja con el boss contestado 9c).

## Diseño

- **Barra de vida del jefe en pantalla** (`client/src/render/BossBar.ts`, arriba-centro):
  aparece cuando el jefe está SIENDO PELEADO (HP < máx) → todos, desde cualquier zona,
  ven la pelea en vivo. Oculta si está intacto (idle). Cuando cae, muestra un **contador
  de reaparición** (client-side, desde el `respawnForTemplate("skeleton_king")` compartido,
  arrancado al ver morir al jefe). `NetworkClient.getBossState()` escanea los mobs por
  `isBoss` y devuelve {name, hp, maxHp, dead}.
- **Anuncios server-wide** (`WorldAnnounceEvent`): el server broadcastea cuando el jefe
  **cae** ("💀 ¡El Rey Nihil ha caído!", en killMob, cualquiera lo mate) y cuando
  **despierta** ("⚔ ¡El Rey Nihil ha despertado en su Trono!", en el respawn del tick —
  la carrera al Trono). El cliente los muestra en un banner prominente (`Hud.announce`,
  distinto del toast) + sonido de jefe + un pequeño screen-shake.
- Se mantiene `BossKilled` (crédito de guild 9c) intacto: convive con el anuncio genérico.

## Verificación

264 tests (133 shared + 79 server + 52 client; nuevos: 1 E2E servidor —abatir al jefe emite
WorldAnnounce— y 3 de BossBar —oculta idle, muestra al pelear, contador al morir—). tsc
estricto limpio 3 workspaces, build prod OK. Barra/anuncios en vivo = pendiente-usuario (WS).
