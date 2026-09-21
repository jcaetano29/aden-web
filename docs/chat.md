# Chat del servidor

El panel aparece al entrar al mundo, sobre las barras del personaje.

- **Cerca:** los jugadores del mismo mapa a hasta 25 unidades reciben el mensaje, incluido quien lo envía. Aparece también una burbuja sobre el personaje durante 5 segundos, con desvanecido al final. Otro mensaje reemplaza la burbuja anterior.
- **Global:** llega a todos los jugadores conectados, incluso en otros mapas o salas del servidor.
- **Enter:** enfocar la escritura y enviar. **Escape:** abandonar la escritura conservando el borrador.
- El selector define el canal de envío. `/g mensaje` o `/global mensaje` envían a Global; `/s mensaje`, `/local mensaje` o `/cerca mensaje` envían a Cerca.
- Los filtros **Todos / Cerca / Global** eligen qué mensajes leer. El botón **−** minimiza el panel y muestra un contador cuando llegan mensajes nuevos.

Cada sesión mantiene los últimos 100 mensajes recibidos. La lectura no salta al final si el jugador está consultando mensajes anteriores. El servidor confirma cada envío; los rechazos o la desconexión conservan el borrador. Los mensajes son texto literal y no ejecutan HTML. Escribir o hacer clic en el panel no activa los controles del juego.

## Reglas del servidor

Máximo 240 unidades UTF-16 por mensaje, antes y después de normalizar Unicode y espacios. Se permite un mensaje por segundo; Global requiere 3 segundos entre mensajes globales. Identidad, mapa y posiciones provienen del estado del servidor. Solo personajes cargados participan.

Global usa el tema `aden:chat:global` de Colyseus Presence; cada sala registra y libera su suscripción. Con la configuración actual, todas las salas del proceso comparten Global. Para ejecutar varios procesos deben compartir Presence, como requiere Colyseus. Las conversaciones no se guardan en Supabase ni se entregan retroactivamente a nuevos jugadores.

Las burbujas usan el mismo anclaje CSS2D que los nombres. Siguen el movimiento del personaje y se limpian por vencimiento, cambio de mapa, desaparición o desconexión. Los mensajes globales permanecen en el panel.

## Verificación

- Pruebas con conexiones reales: alcance circular inclusive, separación por mapas, identidad autoritativa, entrega global entre salas, entradas inválidas y límites de envío.
- Pruebas del panel: teclado y composición, borradores, filtros, texto seguro, historial acotado, lectura y desconexión.
- Pruebas de burbujas: anclaje al personaje, reemplazo, desvanecido y eliminación.
- Revisión en navegador: envío y confirmación global, burbuja local visible y desaparición manteniendo el historial; separación del HUD y sin errores de consola.

Verificación final: 187 pruebas de shared, 187 del servidor y 221 del cliente (595 en total). Compilación de producción y TypeScript de los tres workspaces correctos.

Comandos: `npm test`, `npm run build --workspace @aden/client` y `tsc --noEmit -p <workspace>/tsconfig.json` para shared, server y client.
