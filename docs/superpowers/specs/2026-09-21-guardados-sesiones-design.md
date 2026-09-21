# Guardados ordenados y sesión única — diseño

## Objetivo y autorización
Entrega 2 de la consolidación nocturna autorizada: impedir que un guardado antiguo sustituya progreso reciente, que dos clientes escriban el mismo personaje y que un reingreso cargue datos anteriores a una salida pendiente. Decisiones reversibles aprobadas por la autorización general; sin cambio de datos de producción.

## Evidencia
GameRoom.saveAll y onLeave llaman PersistenceService.save independientemente. onAuth normaliza name pero onJoin usa options.name. Cada sala tiene su servicio, aunque Supabase comparte las tablas. El cierre del socket durante onAuth puede no invocar onLeave. cloneCharacterSave no copia learnedTomes.

## Alternativas y decisión
Una cola dentro de cada sala no cubre salas distintas. Versionado/CAS y leases en la base serían apropiados para múltiples procesos, pero necesitan migración y un contrato distribuido no verificado. Elegimos un coordinador de personajes compartido por las GameRoom del mismo proceso, con propiedad de sesión y una cola por nombre. La coordinación debe separarse de la lógica enorme de GameRoom y ser comprobable con un backend controlado.

## Contrato
- Identidad: nombre autenticado con trim, sensible a mayúsculas como hoy; no renombrar cuentas ni guardados. onJoin y todos los guardados usan auth.name.
- Exclusión: reservar el nombre de forma síncrona antes de la primera operación asíncrona de autenticación. Rechazar un segundo acceso con mensaje claro, sin expulsar al primero. También dos solicitudes de creación y dos salas del mismo proceso. Una reserva fallida se libera cuando ya no puede escribir; un socket cerrado durante auth no puede instalar un jugador ni dejar una reserva permanente.
- Guardado: como máximo una escritura de personaje en vuelo por nombre. Los snapshots son copias independientes; inventario, equipo, achievements y learnedTomes no comparten arrays/objetos mutables con la fuente. Es válido coalescer estados pendientes al más reciente. Un fallo conserva el último snapshot pendiente y permite reintentar sin veneno permanente en la cola. No crear ciclos infinitos de reintento ni timers globales que impidan cerrar las pruebas.
- Salida: retirar al jugador de combate/grupos/chat inmediatamente, tomar el snapshot final y ordenar su escritura después de cualquier escritura iniciada. El reingreso solo puede cargar cuando el estado final pendiente se haya confirmado; si falla, conserva el snapshot en el proceso y el siguiente intento de acceso debe reintentar antes de cargar. El error se presenta como disponibilidad y nunca como guardado exitoso.
- Reservas y cierre: liberar ownership correcto en auth fallida, socket abortado, onLeave y onDispose; operaciones aún en vuelo no pueden ser adelantadas por un nuevo propietario. Un callback antiguo no libera una sesión nueva. Mantener snapshots fallidos a través de la eliminación de una sala.
- No ampliar esta entrega a reconexión de cliente, cambios de balance, escrituras de clanes, nuevas dependencias ni esquema SQL. La fábrica createPersistence conserva su contrato; se admite mantener el almacenamiento in-memory aislado por sala actual y documentar que no es un sustituto de Supabase ni garantiza reingreso en otra sala. El test de coordinación entre salas debe usar explícitamente un backend compartido.
- Alcance garantizado: un proceso de servidor. Un reinicio puede perder pendientes en memoria; múltiples procesos requieren coordinación duradera. No prometer atomicidad distribuida ni durabilidad durante caídas del proceso.

## Validación
Pruebas deterministas con promesas controladas: orden real del contenido guardado, progreso final, errores y recuperación, snapshots independientes, reserva concurrente, aislamiento entre personajes, identidad canónica y cierre durante auth. Integración Colyseus real con datos temporales para la sesión única en una/dos salas y salida/reingreso. Suite servidor y TypeScript, revisión independiente de concurrencia. La regresión de Party debe seguir retirando el jugador inmediatamente antes de esperar la escritura.
