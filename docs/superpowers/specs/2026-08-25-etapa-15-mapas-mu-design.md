# Etapa 15 — Mundo de mapas (estilo Mu Online)

## Problema

Feedback del usuario: el mundo (E11) era un único plano con zonas contiguas y chicas,
recorrido en línea recta. Se sentía pobre y lineal. Pedido: **mapas discretos y grandes**
a los que se **viaja con un menú (tecla M)**, estilo Mu Online.

## Diseño

- **Mapas discretos**: `shared/world.ts` — cada `Zone` es ahora un MAPA con `bounds`
  (región propia ~130×130, ~8× el área anterior), `spawn` (punto de llegada), `levelReq`
  (gate de viaje) y `safe`. Los mapas ocupan regiones muy espaciadas del plano global
  (pueblo 0,0 · bosque 300,0 · ruinas 0,300 · yermo 300,300 · trono 600,150), sin
  solaparse; la niebla oculta las vecinas → nunca se ve más de un mapa. `zoneAt` pasa a
  ser por-bounds; `canEnterZone(zone, level)` es el gate.
- **Viaje (tecla M)**: `MapPanel` lista los mapas con nivel requerido y estado
  (actual / disponible / 🔒 bloqueado). Mensaje `WarpTo{mapId}` → el server valida el gate
  por nivel y teletransporta al `spawn`. **No lineal**: desde cualquier mapa se viaja a
  cualquiera habilitado. (Mute se movió de M a **N**.)
- **Aislamiento por mapa** (server): `PlayerState.mapId` / `MobState.mapId` /
  `DroppedItemState.mapId`. El movimiento se clampea a los bounds del mapa actual (no se
  camina afuera). Combate/aggro/pickup/PvP sólo entre entidades del MISMO mapa
  (`resolveTarget(id, mapId)`, aggro agrupado por mapa, pickup y ataque de mobs con guarda
  de mapa). Pueblo = mapa `safe` entero (sin combate/PvP; sin mobs). Respawn al spawn del
  mapa actual. Persistencia: columna `"mapId"` (migración `add_mapid_column`); al cargar se
  aterriza en el spawn del mapa guardado.
- **Cliente**: `EntityViews.setCurrentMap` muestra sólo las entidades del mapa actual
  (y filtra el raycast de targeting); al warpear, `CharacterView` y la cámara **snapean**
  (no deslizan por el vacío). `Environment` pinta cada mapa como una región grande
  (placas de bioma + props por bounds, sin caminos). `Minimap` es un radar del mapa actual.
  `NetworkClient` filtra minimapa/boss-bar por el mapa del jugador.

## Verificación

271 tests (135 shared + 82 server + 54 client; nuevos: world.test reescrito, MapPanel.test,
3 E2E de viaje —arranca en pueblo/mobs con mapId, warp habilitado mueve+setea mapId, warp
bloqueado por nivel rechazado— y ajustes de todos los E2E de combate/PvP/boss/retención para
setear mapId). tsc estricto limpio 3 workspaces, build prod OK. En vivo (viajar, ver sólo tu
mapa) = pendiente-usuario. Requiere redeploy (client + server).

## Controles nuevos
- **M**: menú de mapas (viajar). **N**: silenciar sonido (antes M).
