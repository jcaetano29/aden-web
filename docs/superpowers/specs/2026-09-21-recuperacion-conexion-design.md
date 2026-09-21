# Recuperación visible de conexión — diseño

Entrega 3 de la consolidación autorizada; ejecutar después de aprobar guardados/sesiones. Alcance: una salida segura y visible de una sesión interrumpida, seguida de acceso manual existente.

## Hallazgo
NetworkClient solo bloquea el chat al perder conexión; movimiento, compras, habilidades, equipo y grupos siguen llamando room.send. main actualiza chat/burbujas pero deja la escena y controles aparentando estar conectados. ClassSelect comienza en login; reconstruir toda la escena sin recargar requeriría limpiar entidades, callbacks, UI, animaciones y selección de clase.

## Decisión
Mostrar un diálogo modal persistente cuando se interrumpe una conexión establecida, bloquear todas las intenciones de red y ofrecer Volver al acceso mediante recarga completa de la página. El usuario entra de nuevo en la pestaña Entrar, nunca repetir automáticamente una petición create. La recarga limpia la escena y las suscripciones. Reconexión automática transparente se pospone; no prometer reanudación instantánea ni guardado confirmado.

## Comportamiento y límites
- Estado explícito connected en NetworkClient; antes de conectar, después de leave y tras error de envío, todos los métodos send* retornan false sin llamar al transporte ni arrojar. En conectado retornan true solo si el transporte aceptó el envío sin excepción; no significa confirmación del servidor. Sin colas de comandos antiguos.
- Capturar la sala local en connect y comprobar identidad/generación para que callbacks de una sala antigua no marquen una nueva conexión como caída. Limpiar invitación de grupo al perder conexión. Las pruebas deben ejercer connect mediante fake de transporte que permita emitir leave, no ajustar solo campos privados.
- Callback de conexión coherente e idempotente. Un fallo inicial de join no muestra diálogo de sesión perdida; sigue el flujo de acceso/error existente. No leer room.sessionId si todavía no existe sala.
- Diálogo: título Se perdió la conexión; explicación La partida dejó de recibir datos del servidor. Volvé a entrar para continuar con el progreso disponible.; botón Volver al acceso. No asegurar guardado completo ni exponer endpoints técnicos. El flujo de servidor no disponible puede reutilizar el componente con texto específico y Reintentar.
- Accesibilidad: role=dialog, aria-modal, título asociado, foco al botón, bloqueo de interacción del juego detrás, Tab contenido y Escape no cierra el estado de desconexión. El botón responde a teclado y una sola activación. Modal encima de StoryCard y cualquier panel, incluso corte durante pantalla inicial posterior al login. Viewports 1280x720, 390x844 y altura reducida; sin desbordamiento horizontal.
- Bloquear tanto teclado como puntero antes de callbacks locales de selección/NPC; el bloqueo global de send es segunda garantía para botones existentes. Mantener lectores de último snapshot si el render los requiere; no borrar room precipitadamente y provocar excepciones por frame.
- No guardar contraseñas en localStorage, sessionStorage, URL o logs. No modificar cuentas/personajes. No añadir dependencia ni sistema de reintentos infinitos. Mantener estilo existente.

## Prueba de aceptación
Tests de conectividad: cada familia de comando no se transmite al inicio/leave/error y mantiene payload al conectar; no reenvío posterior; callbacks antiguos ignorados; fallo de connect reintentable. DOM: mensaje visible, foco/Tab/teclado, evento del botón único y juego bloqueado. Navegador con servidor temporal en memoria: crear personaje temporal, entrar, forzar cierre del servidor de prueba, verificar modal y ausencia de acciones detrás, volver al formulario Entrar. Un servidor en memoria nuevo no acredita recuperación de datos; eso lo cubren pruebas servidor con backend compartido. No afirmar Supabase en producción.
