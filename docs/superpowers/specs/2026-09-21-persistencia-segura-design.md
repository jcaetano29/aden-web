# Persistencia segura de Aden

Fecha: 21/09/2026. Parte de la consolidación 1–10 autorizada por el usuario.

## Problema y comportamiento esperado

Cuando Supabase devuelve error al leer characters o accounts, la implementación actual devuelve null; GameRoom puede tratarlo como un personaje nuevo. Los métodos de escritura también registran un error sin rechazar la promesa. La primera entrega distingue ausencia de datos de indisponibilidad y hace que el acceso falle antes de crear estado jugable o escribir datos iniciales.

## Diseño

Mantener PersistenceService y el esquema actual. Una lectura de registro inexistente devuelve null únicamente si la consulta tuvo éxito. Un fallo de consulta o transporte rechaza la promesa con un error de persistencia. Los errores dirigidos al cliente deben estar en español y no incluir SQL, claves ni detalles internos de Supabase. Los errores de escritura se propagan a los puntos de control existentes. Los consumidores de guilds y leaderboard deben manejar explícitamente un fallo sin promesas rechazadas sin gestionar ni convertir el fallo en una eliminación de datos.

No cambiar las fórmulas, recompensas, apariencia, nombres, permisos de cuenta ni datos guardados. No agregar dependencias ni migraciones. Esta entrega no promete resolver escrituras concurrentes ni reconexión: son entregas siguientes.

## Verificación

Probar los resultados reales del adaptador con una frontera Supabase controlada: registro ausente, error HTTP/consulta, rechazo de transporte y escritura fallida. En sala real de prueba, precargar progreso, hacer fallar la carga durante el acceso y confirmar rechazo del acceso sin jugador nuevo ni escritura de valores iniciales. Una recuperación posterior debe cargar exactamente ese progreso. Verificar también rechazo de carga de cuenta y de creación de cuenta, y consumidores de errores de guild/leaderboard que se modifiquen. Sin Supabase real.

## Restricciones globales

- Mantener IDs, esquema de guardados y reglas de juego existentes.
- No agregar dependencias ni migraciones.
- No usar datos o credenciales de producción en pruebas.
- Los mensajes de indisponibilidad al cliente deben estar en español y no revelar detalles internos.
- Toda corrección de comportamiento necesita una regresión que falle antes de implementarla.
