# Tirar objetos e intercambiar

## Inventario

Abrí **I**, seleccioná un objeto de la mochila, elegí la cantidad y pulsá **Tirar al suelo**. La confirmación muestra qué objeto y cuántas unidades vas a tirar. Para tirar equipo puesto, primero quitátelo.

El objeto queda como botín público, conserva sus mejoras y opciones y desaparece a los 60 segundos. Cualquier jugador vivo en alcance puede recogerlo después de la demora de aparición de 1,5 segundos. El dueño no lo recoge automáticamente: puede recuperarlo con un clic. El inventario sigue teniendo casillas ilimitadas; descartar elimina entradas o reduce sus cantidades.

## Trade

Abrí **Trade** con el botón junto a Party o con **R**. Invitá a un jugador vivo a un máximo de 5 unidades en el mismo mapa. La invitación dura 30 segundos; cada jugador puede participar en un único intercambio pendiente.

Tras aceptar, elegí las cantidades de tus objetos y el oro que querés entregar, y pulsá **Guardar oferta**. La otra columna muestra lo que recibirás. **Ver atributos** permite revisar suerte, habilidad, adicional, opciones excelentes y estadísticas del equipo. Se admiten regalos, oro por objetos, objetos por objetos o una combinación de ambos. Hasta 20 entradas de objetos y 10.000 unidades por entrada.

Ambos deben pulsar **Confirmar intercambio**. Editar cualquier oferta invalida las confirmaciones previas. Los cambios sin guardar impiden confirmar; los recursos se transfieren únicamente al completar las dos confirmaciones sobre la misma oferta.

Cancelar, desconectarse, morir, alejarse o dejar de cumplir los recursos ofrecidos cancela el intercambio sin transferir bienes. La sesión vence a los 2 minutos. Cerrar la ventana solo la oculta: podés reabrirla con **R**; usá **Cancelar intercambio** para terminar la sesión.

## Integridad y guardado

El servidor valida cantidades enteras, pertenencia, recursos, mapa, distancia e identidad/revisión de la sesión. El intercambio aplica ambos balances en una operación síncrona. Se conserva el identificador completo del equipo.

Los personajes se guardan en lotes atómicos y ordenados. Si falla un lote, sus filas permanecen pendientes y acompañan al siguiente guardado, incluso si este corresponde a un único jugador que sale. El descarte también solicita un guardado. Las cuentas no permiten sesiones simultáneas entre salas del mismo proceso, y no se desbloquean al salir hasta completar su guardado. Si sale el último jugador durante una falla temporal, la sala conserva su temporizador de reintento.

Los intercambios abiertos y el botín del suelo son temporales. Sin Supabase se usa la persistencia en memoria existente. La cola de reintentos tampoco sobrevive a una terminación forzada del proceso; el bloqueo de cuentas corresponde al proceso actual, no a varios servidores independientes. No se agregó una transacción distribuida ni un diario durable.

## Verificación

Pruebas de cantidades inválidas, ítems ajenos/equipados, identidad de instancias, recogida concurrente, revisiones antiguas, cambios de recursos, cancelación, expiración, desconexión, saldo máximo, guardados fuera de orden y fallos temporales. Pruebas Colyseus con dos clientes y rechazo de cuentas duplicadas entre salas. Pruebas DOM de edición/confirmación y de conservar borradores frente a actualizaciones del servidor.

`scripts/verify-trade.cjs` recorre el juego con dos navegadores contra un servidor aislado en 2584 y Vite en 5174. Verifica un intercambio de munición por oro, descarte, ausencia de errores de JavaScript y ajuste del panel a 390 píxeles. Capturas y reporte en `artifacts/trade/`.
