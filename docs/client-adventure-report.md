# Cliente: campaña inicial y Cripta de las Dos Llamas

Implementado sobre el cliente existente, sin dependencias adicionales ni cambios a servidor/shared.

- Guía persistente de campaña con destino, requisitos de viaje (M), pistas y entrega al Anciano. Reconoce `campaign_complete` en HUD y diálogo sin intentar reclamar más premios.
- Progreso de expedición sincronizado: acólitos, primera llama, guardias, segunda llama, custodio y final. Explica reinicio al salir/morir y esquiva del círculo rojo.
- Minimapa con marcador dorado: enemigo vivo más cercano de la misión/etapa, objeto de misión, sellos o Anciano según el objetivo actual.
- Cripta con tres salas abiertas, columnas, recorrido dorado, ramales a sellos y arena del custodio; evita decoración aleatoria sobre la ruta. La geometría es visual: no agrega paredes de colisión falsas ni puertas cerradas.
- Ajuste tras revisión visual del agente principal: suelo exterior de piedra (sin fallback de césped), salas de piedra agrietada texturizada, camino adoquinado y luz de relleno más intensa. La superficie más alta de suelo queda a y=0.10; el aviso rojo a y=0.12, por encima.
- Sellos reconocibles por nombre flotante, número y color propio (azul/dorado). La aceptación se muestra mediante progreso de servidor, sin aviso optimista de éxito.
- Área peligrosa a coordenadas y radio autoritativos, independiente de la posición del jefe. Desaparece cuando el servidor cancela/resuelve el ataque, el jefe muere o el jugador cambia de mapa. Materiales y geometrías se liberan al eliminar el enemigo.
- Snapshot incluye `dungeonStage`, `dungeonKills`, `hazardMs`, `hazardX`, `hazardZ`, `hazardRadius`, con valores opcionales compatibles con fixtures antiguos.

## Archivos

Nuevos: `AdventureTracker.ts`, `HazardViews.ts`, `CryptEnvironment.ts` y sus pruebas. Integración en `main.ts`, `NetworkClient.ts`, `Hud.ts`, `Minimap.ts`, `WorldObjectViews.ts`, `Environment.ts`, `MapDressing.ts`. Pruebas existentes adaptadas a stock de iniciación y mapa de geometría propia.

## Verificación

- `npm test --workspace @aden/client`: 93 pruebas, 29 archivos, todos aprobados.
- `npx tsc --noEmit -p client/tsconfig.json`: aprobado.
- `npm run build --workspace @aden/client`: aprobado (155 módulos). Persiste el aviso existente de bundle superior a 500 kB.
- Pruebas cubren círculo fijo/radio/cancelación/muerte/mapa/limpieza; guía y cierre de campaña; marcadores de sellos; elección de enemigo vivo del mapa correcto; salas dentro de bounds.
- Verificación visual del recorrido completo pendiente del agente principal; no se afirma aquí haberla realizado.

Nota: un primer intento coincidió con una escritura incompleta de `shared/world.ts`; tras restauración, la ejecución completa anterior pasó. Esbuild necesita ejecutar fuera del sandbox de lectura del directorio padre en esta máquina.
