# Recuperación de conexión

Cuando una partida conectada deja de recibir datos del servidor, el cliente muestra un diálogo persistente y bloquea los controles del juego. Desde ese momento también rechaza cualquier intento de movimiento, combate, compra, inventario, grupo, guild o viaje antes de enviarlo. Las acciones rechazadas no se guardan en una cola ni se reenvían después.

El botón **Volver al acceso** recarga el cliente y abre el flujo normal en la pestaña **Entrar**. La persona debe escribir de nuevo sus credenciales e iniciar la sesión manualmente. El cliente no conserva la contraseña ni repite una creación o un acceso por su cuenta.

Si el servidor no está disponible durante el acceso inicial, aparece el mismo componente con **Reintentar**. Ese caso no se presenta como la pérdida de una partida ya establecida.

## Límites

- No hay reconexión automática ni reanudación transparente de la escena.
- Un envío aceptado por el transporte solo indica que no arrojó un error local; no confirma que el servidor procesó la acción.
- La última imagen recibida puede seguir visible detrás del diálogo, pero queda inactiva hasta la recarga.
- Volver a entrar recupera únicamente el progreso que el servidor haya persistido. El diálogo no afirma que las acciones inmediatamente anteriores al corte hayan sido guardadas.
- Reiniciar un servidor temporal en memoria no demuestra recuperación de progreso. Esa garantía depende del almacenamiento compartido configurado en el servidor.
