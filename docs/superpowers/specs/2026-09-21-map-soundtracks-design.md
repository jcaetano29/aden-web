# Música e identidad sonora de los mapas

El usuario pide centrarse en musicalizar los mapas y confirma fantasía medieval instrumental con carácter diferente según el lugar.

## Dirección

Seis composiciones originales, sin descargas ni dependencias de servicios externos. Aden: arpa/laúd y cuerdas cálidas en compás ternario. Umbra: flauta, arpegios y hojas. Nihil: campanas y cuerdas suspendidas. Yermo: bordón, viento y tambores. Cripta: resonancias, gotas y coro sintético. Trono: marcha lenta, metales suaves y percusión grave. Cada pieza tiene 32 compases con exposición, variación, respiración y regreso; no es un tono repetido.

## Integración

Ampliar el AudioEngine existente con un director musical y buses independientes de música, ambiente y efectos. Web Audio mantiene un solo contexto, inicia con gesto, programa por reloj de audio y funde mapas durante cuatro segundos. Los cambios rápidos de mapa deben retirar las escenas antiguas sin acumular nodos. Suspender en segundo plano y liberar al salir; conservar preferencias locales, tolerando storage bloqueado o corrupto. La tecla N silencia todo.

Un control compacto bajo el minimapa abre los tres volúmenes y muestra la pieza actual. Su interacción no mueve al personaje. Un ensayo local permite recorrer las seis piezas sin servidor ni requisitos de nivel y exportar muestras para verificar señal, duración y clipping.

La mejora de mapas en esta entrega es auditiva; no se necesitan cambios en colisiones, progresión, servidor ni geografía.

## Verificación

Tests de cobertura musical de todos los mapas; composición determinista y límites de notas; arranque, cambio de mapa, mute, mezcla, suspensión, reintento y limpieza. Render real con OfflineAudioContext para detectar silencio, valores inválidos o saturación. Comprobar controles y transición en navegador, ejecutar suite del cliente, TypeScript y build.
