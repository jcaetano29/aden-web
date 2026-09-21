# Hallazgos para las siguientes entregas

21/09/2026. Investigación del código de la base bd2e056; no sustituye una reproducción ni una partida completa. Consultar avance-nocturno.md y los commits posteriores antes de actuar.

## Guardados y sesiones (entrega siguiente)

- GameRoom.saveAll inicia this.persistence.save por jugador cada 15 segundos sin esperar a la anterior; onLeave hace otra escritura. Una petición antigua puede terminar después de la final y reemplazarla. La regresión debe controlar cuándo resuelve cada escritura y comprobar el contenido final, no solo llamadas.
- onAuth normaliza name con trim; onJoin usa options.name crudo. La identidad persistida debe provenir del nombre autenticado. Conservar las cuentas existentes y no renombrar masivamente datos.
- No se observa restricción de dos sesiones de la misma cuenta. Probar concurrentemente dos accesos al mismo personaje, incluidos dos GameRoom del mismo proceso. Resolver con una política explícita de sesión única, sin expulsar ni pisar a la sesión legítima.
- Para reingresar, no basta con sacar al jugador del mapa: la última escritura debe terminar antes de cargar el personaje otra vez. Una escritura fallida necesita retención/reintento explícitos y no debe darse por guardada.
- createPersistence genera un servicio por sala. En producción las salas escriben las mismas tablas de Supabase; una cola por sala no coordina registros compartidos. El alcance de coordinación debe quedar documentado; varios procesos requerirían coordinación duradera/distribuida.
- InMemoryPersistence.cloneCharacterSave clona achievements pero no learnedTomes: revisar copia de arrays opcionales para que los snapshots no se modifiquen por aliasing.

El ciclo Colyseus instalado fue inspeccionado en node_modules/@colyseus/core/build/Room.js: onAuth corre durante _onJoin con el socket abierto; auth fallida elimina la reserva antes de insertar client en this.clients. Un cierre durante auth puede ocurrir antes de onJoin. No asumir que onLeave siempre se ejecuta para una reserva fallida: _onLeave retorna si client no está en this.clients. Cualquier registro de sesión necesita limpieza explícita de ese camino, además de onLeave y onDispose.

## Conexión y recuperación

- NetworkClient.connect registra onLeave, pero solo actualiza chatConnected y el callback. main.onConnectionChange actualiza chat y burbujas. No hay recuperación de la partida integrada.
- Todos los comandos salvo sendChat llaman room.send directamente. Centralizar la guarda conectada para impedir movimientos, compras, equipo y acciones durante un corte; no encolar acciones antiguas para enviarlas luego.
- Primera entrega de UX de conexión viable: mostrar un diálogo de desconexión con explicación honesta y botón de volver a entrar; bloquear controles detrás del diálogo y cubrir rechazo de envío. No almacenar contraseñas ni afirmar guardado que el servidor no confirmó.
- Si se implementa reconexión automática real, debe respetar sesión, orden de guardado y limpieza de entidades/callbacks; no volver a usar modo create ni duplicar escuchas. Diseñarla después de la protección de sesiones.
- isAuthError clasifica códigos 4xxx; errores de disponibilidad sanitizados del servidor deben mostrarse como reintentables, no como contraseña incorrecta.

## Experiencia inicial

Observación de navegador previa: 1280×720, personaje Caballero nuevo, entrada al pueblo y viaje al bosque, sin partida completa.

- Chat abierto, aviso diario largo, minimapa y rastreador compiten por espacio. El aviso diario puede cruzar el minimapa. Revisar altura/anchura y ubicación de mensajes con textos largos, no solo ocultarlos.
- Chat mide hasta 390 px y usa bottom fijo 202 px. HUD usa ancho derivado de etiquetas; validar 1280×720 y 390×844, y alturas pequeñas. El carácter jugable y la barra de habilidades deben permanecer utilizables.
- Bosque muestra Zona PvP desde nivel 1. Revisar protección inicial con regla simétrica: un protegido tampoco debe poder atacar. Requiere cubrir daño directo, área/selección y veneno, y comunicar el estado.
- Personaje Caballero comienza con inventario/equipo vacío; Explorador recibe arco y flechas. Esto puede ser una decisión de balance, no cambiarla sin medir. Revisar cómo se enseña la primera compra/recompensa.
- Se observó autocompletado visual de acceso con botón aún deshabilitado. Verificar si los eventos del navegador actualizan la validez; no leer ni registrar contraseñas guardadas. Posible solución accesible: validación al enviar y eventos input/change/pageshow, evitando polling permanente.

## Rendimiento y verificación

- Build base: JavaScript principal 1109,34 kB minificado, 297,71 kB gzip. Es una medida de build, no de latencia ni FPS.
- main espera atlas y todos los modelos antes de completar la pantalla inicial. Medir carga visible y separar recursos necesarios por fase si existe mejora real.
- Registrar pruebas de varios clientes, botín/grupo y latencia aparte de tests unitarios. No llamar prueba de carga a dos clientes ni afirmar capacidad máxima sin medir.
- Mantener los tests de lógica; agregar scripts reproducibles de typecheck/build/validación y CI sin desplegar por sorpresa ni poner secretos en el repositorio.

Mediciones adicionales del árbol de archivos: los GLB suman 24.236.476 bytes, pero Skeleton_Minion y Skeleton_Warrior (unos 9,45 MB juntos) no están en el manifiesto de enemigos actual; no atribuir todo ese peso a la carga inicial. CharacterFactory.preload recibe 18 variantes/nombres, varias resuelven a los mismos GLB. Revisar deduplicación de parseo, no asumir solicitudes de red duplicadas sin medir. EntityViews.update actualiza todos los CharacterView y mixers de todos los mapas aunque sus objetos estén ocultos; medir el coste y asegurar posiciones/animaciones correctas al volver a un mapa antes de omitir trabajo. InventoryPanel ya evita reconstrucción con una firma; no presentar como nueva una optimización que existe.
