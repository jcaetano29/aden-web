# Etapa 16 — Vida y objetos en los mapas

## Problema

Feedback del usuario: el viaje entre mapas (E15) funciona, pero los mapas se sienten
vacíos, sin interacciones ni cosas para hacer.

## Diseño

Objetos de mundo interactivos (data-driven), que llenan los mapas y dan actividad +
recompensa por explorar. Tres tipos, todos se clickean estando cerca (rango 3.5):

- **Cofre** 🎁 (`chest`): se abre una vez → botín acorde al mapa (chance de gear por rareza);
  reaparece a los 60s.
- **Barril/urna rompible** 🛢️ (`breakable`): se rompe → loot menor (oro/materiales);
  reaparece a los 20s (piñatas de loot que densifican el mapa).
- **Santuario** ⛩️ (`shrine`): otorga una bendición temporal (+40% ataque o defensa, 30s;
  reusa el sistema de buffs); cooldown 60s.

- `shared/worldobjects.ts`: `WORLD_OBJECTS` (spawns por mapa con posición/kind/lootId/buff),
  rangos/timers, `getWorldObject`. Tablas de loot de objetos en `items.ts`
  (`breakable`, `chest_pueblo/bosque/ruinas/yermo/trono`).
- **Server**: `WorldObjectState` (id/kind/mapId/x/z/active sincronizado; respawnMs server-only),
  `GameState.worldObjects`; instanciado en onCreate; handler `InteractObject` (gate de cercanía +
  mismo mapa + activo → loot vía `dropLoot` reutilizado de killMob, o buff para santuario;
  desactiva + arma respawn); tick reactiva los usados. Sin persistencia (estado efímero).
- **Cliente**: `WorldObjectViews` (meshes por tipo — cofre con tapa, barril, santuario con orbe
  que pulsa; filtra por mapa actual como los mobs; refleja estado abierto/roto/cooldown; expone
  raycast sólo de objetos ACTIVOS del mapa). `InputController` clickea objetos antes que el suelo.
  `main` cablea interacción (gate de cercanía + toast) y feedback. Densifiqué también los spawns
  de enemigos por mapa (E15) para llenar el espacio.

## Verificación

275 tests (135 shared + 85 server + 55 client; nuevos: 3 E2E de objetos —cofre suelta loot y se
desactiva, santuario da buff, no interactúa desde otro mapa— y WorldObjectViews.test de raycast).
tsc estricto limpio 3 workspaces, build prod OK. **OJO redeploy:** cambió el schema de Colyseus
(worldObjects) → el server (Railway) debe redeployarse con este commit para sincronizar. En vivo
= pendiente-usuario.
