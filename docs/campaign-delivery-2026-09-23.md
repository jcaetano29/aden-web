# Campaña y dificultad — entrega del 23 de septiembre

## Cómo probar

Iniciar el juego normalmente. Con Nihil derrotado, su misión entregada y nivel 10, hablar con Rowan y elegir **Iniciar expedición**. Abrir **M → Marismas del Velo**, acercarse a Maera y seguir el marcador. Boren vende provisiones en el mismo puesto. Tras recuperar el paso, hablar otra vez con Maera (nivel 12) para viajar al **Monasterio de la Vigilia** y encontrar a Iria. Seguir los registros, liberar las celdas, derrotar al carcelero, investigar los anclajes y enfrentar al Prior de nivel 15.

Q elige una poción de vida utilizable según la salud que falta, incluyendo las mayores. El HUD muestra los tiempos de recuperación de vida y maná.

## Implementado

- Enemigos con nivel fijo, categoría, nombre y advertencia de amenaza. El nivel del enemigo no se adapta al jugador.
- Con diferencia de +3/+4/+5 niveles se inflige 70%/40%/15% del daño nominal; desde +6 no se puede infligir daño ni control. Veneno y reflejo respetan la misma regla. El daño recibido aumenta desde +3.
- Bestia del Bosque nivel 7 en una zona lateral. Centinela, Custodio, Draco y Nihil reforzados. Nihil anuncia áreas evitables y acelera su cadencia por debajo de media vida.
- Los enemigos se recuperan al abandonar una persecución. Recibir ataques a distancia provoca persecución, incluso fuera del radio de detección pasiva.
- Marismas del Velo, nivel 10–12: puesto, pasarela, agua bloqueada por navegación, caravana, torre, ambientación y música propia.
- Maera y Boren, con presentación y diálogo propios. Cinco misiones: llegada, dos pistas independientes, cuatro saqueadores y guardián nivel 12 con área anunciada.
- Monasterio de la Vigilia, nivel 12–15: Iria, archivo oriental, celdas occidentales, patio y campanario. Geometría compartida entre render y navegación, ambientación y música propias.
- Diez pasos persistidos en el Monasterio. Los registros, celdas y anclajes intermedios avanzan automáticamente para evitar entregas repetitivas. La ruta obligatoria individual alcanza nivel 15 antes del Prior sin encargos opcionales.
- Guardia nivel 13, Carcelero élite nivel 14 y Prior nivel 15. El Prior espera a que termines los preparativos; alterna áreas breves con una canalización grande de seis segundos bajo media vida. Activar un anclaje la interrumpe y lo aturde tres segundos; también se puede escapar caminando. La diferencia de nivel impide interrumpirlo desde un nivel demasiado bajo.
- Epílogo y Relicario de los Nombres, entregado una sola vez. El capítulo tiene quince pasos en total y tres NPC nuevos, con modelos existentes y presentaciones diferenciadas.
- Entregas regionales validadas por NPC, mapa y distancia; tienda de Boren validada por proximidad. Las pistas reutilizables permiten investigar a varios jugadores sin consumirse globalmente.
- La cadena original conserva sus doce misiones y recompensas. Los guardados con `campaign_complete` pueden iniciar el prólogo mediante Rowan. El progreso nuevo usa los campos persistidos existentes; no requiere migración.
- Pociones: ocho segundos compartidos entre tamaños de HP y otros ocho para MP, independientes entre sí. El servidor conserva las expiraciones por cuenta durante reconexiones y cambios de sala del mismo proceso. Rechazar un uso no consume objetos ni inicia recuperación; otros consumibles no heredan esos tiempos. Q admite también pociones mayores y variantes del catálogo.
- Tres encargos opcionales de Boren: recuperar provisiones, identificar a un viajero y traer la herramienta del archivo. Cadena independiente de campaña y contratos de Varek, guardada en el JSON de progreso existente. Otorga 750 oro, pociones de vida/maná y Amuleto del Regreso (+50 HP, +4 defensa, nivel 12); sin EXP ni recompensas repetibles. La tienda sigue disponible mediante una segunda acción del diálogo.

## Evidencia

- Suite completa tras los encargos de Boren: **699 tests** (196 shared, 261 servidor, 242 cliente), registrados en `artifacts/campaign-balance/boren-full-tests.log`.
- TypeScript sin errores en los tres paquetes; build de producción correcto. Persiste el aviso previo de tamaño del bundle (~1,14 MB sin comprimir).
- Conexiones reales de prueba: bloqueo por nivel, ataques/control/veneno/reflejo, recuperación al retirarse, persecución inmediata a distancia, áreas, avance por bajas, acceso al Monasterio, pistas/celdas/anclajes en orden, interrupción del Prior, compras remotas rechazadas y ausencia de premios duplicados. Pruebas de pociones entre tamaños, HP/MP independientes, recurso lleno y reconexión; reloj controlado para vencimiento exacto.
- Navegador integrado contra servidor aislado sin persistencia externa: Marismas y Monasterio visibles, diálogos de Maera e Iria, recompensas recibidas y objetivos actualizados a la caravana y al archivo. Sin errores de consola en ambos recorridos. Son comprobaciones de presentación y entregas, no partidas completas contra los jefes.
- Revisión independiente acotada de dificultad, campaña y pociones. Se corrigieron persecución a distancia, colisión del arco, colisiones sin render en el Monasterio y renovación del camino al cambiar de deambular a perseguir. Ningún hallazgo importante pendiente en esas revisiones.
- Pociones verificadas también desde el navegador: Q usó una poción mayor (304 → 454 HP), mostró el contador y rechazó otra Q durante la espera. Sin errores de consola.
- Encargos comprobados por conexiones reales: los tres objetivos avanzan en orden, se conserva un objetivo completado al reconectar, las recompensas no se repiten y la campaña/contratos del capitán mantienen su progreso. Revisión independiente sin hallazgos importantes.
- Navegador: diálogo de Boren con acciones separadas para encargo y provisiones, aceptación del primero y aparición en el rastreador manteniendo la misión principal. Consola sin errores. La independencia de la acción de tienda se verifica además con una prueba del diálogo.
- Cálculo nominal `artifacts/campaign-balance/after.json`: con el caballero de nivel 9 de referencia, un golpe normal de Nihil pasa de 21 a 47 y hacen falta 56 ataques básicos para vencerlo, frente a 19 antes. No es una simulación de partida.

## Pendiente

Quedan las sesiones completas de balance con las cinco clases y grupos. Los tiempos objetivo de combate, economía y consumo de pociones requieren esos recorridos: los tests y cálculos nominales no los sustituyen. Tampoco se implementaron todas las reglas adicionales de retirada/viaje/regeneración de la propuesta. El tercer encargo entrega un accesorio fijo para todas las clases; la elección entre varias recompensas de la propuesta no se implementó.

Los cooldowns breves de pociones sobreviven reconexiones dentro del mismo proceso; un reinicio del servidor los borra. Una futura instalación con varios procesos necesitará compartir esas expiraciones. Se mantiene el aviso previo de bundle grande (~1,15 MB sin comprimir).

Por pedido explícito del usuario, la entrega se integra en `master` junto con todos los cambios pendientes de apariencia, inventario y comercio, incluyendo sus pruebas y artefactos. La publicación remota queda fuera de este commit local.
