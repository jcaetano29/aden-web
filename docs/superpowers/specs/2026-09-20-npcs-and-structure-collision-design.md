# NPCs y estructuras sólidas

Estado: aprobado por el usuario.

## Problemas comprobados

- `Npc`, `Merchant` y `ServiceNpc` construyen personajes principalmente con cilindros, conos y esferas. Sus animaciones se concentran en los indicadores flotantes.
- `MovementSystem.advanceMovable` avanza en línea recta hacia el destino sin consultar obstáculos. El mensaje de movimiento sólo limita el destino a los bordes del mapa.
- Las estructuras se crean en el cliente, por lo que el servidor no dispone de sus volúmenes sólidos.

## Enfoque recomendado

Separar la entrega en dos bloques verificables: personajes y navegación. Mantener el estilo medieval oscuro y los servicios existentes.

### Personajes

Reutilizar los modelos articulados y animaciones disponibles como base, con apariencia propia por NPC: capitán con armadura y capa, herrero con delantal y martillo, mercader con bolsos y prendas de viaje, sanadora con vestimenta ceremonial y anciano con barba y bastón. Evitar cinco copias del mismo héroe diferenciadas sólo por color.

Crear una capa común de apariencia y animación sin cambiar los identificadores, misiones o transacciones de los NPC. Mantener nombres e indicadores legibles y separados de la cabeza. Añadir reposo y gestos apropiados al rol. Revisar también aldeanos y guardias ambientales para mantener coherencia visual.

Validar en una vista de comparación y desde la cámara del juego. Aprovechar recursos existentes para no introducir descargas ni licencias nuevas.

### Estructuras y movimiento

Definir en `shared` las posiciones, dimensiones y orientaciones de las estructuras sólidas. El cliente construye el escenario a partir de esas definiciones y el servidor las usa para navegación y colisiones. No mantener una segunda lista de obstáculos ajustada a mano que pueda desalinearse del escenario.

Cubrir casas, murallas, torres, cercas, puestos, fuente, columnas y muros de ruinas y cripta. Mantener transitables caminos, portones, pasillos y huecos reales. Las casas sin interiores jugables se tratan como volúmenes cerrados. Hierba, efectos y pequeños adornos no bloquean.

Usar obstáculos simples en el plano X/Z, con margen para el cuerpo del personaje. Calcular rutas alrededor de obstáculos para movimiento por clic; rechazar o acercar a un punto transitable los destinos dentro de estructuras. Validar cada tramo recorrido para impedir atravesar paredes con velocidades altas o ticks largos.

Aplicar la misma geometría a jugadores, enemigos y caminantes ambientales. El servidor es la autoridad para entidades de juego. Revisar cargas, desplazamientos de habilidades, apariciones, reapariciones y cambios de mapa para evitar entradas en sólidos. En esta entrega las habilidades de desplazamiento tampoco cruzan paredes.

## Alternativas

- Mejorar sólo la geometría procedural y detener el personaje al chocar: menor cambio inicial, pero conserva limitaciones visuales y obliga a rodear obstáculos con muchos clics.
- Modelos externos nuevos y un motor físico completo: mayor coste de integración y recursos; innecesario para movimiento sobre un plano.
- Recomendado: modelos articulados existentes personalizados y navegación 2D compartida, suficiente para la cámara y el movimiento actuales.

## Verificación

- Pruebas de rutas alrededor de casas, portones transitables, destinos encerrados, esquinas y desplazamientos largos.
- Pruebas de integración del servidor para movimiento y habilidades contra paredes; verificar enemigos, spawn y respawn.
- Comprobar que las estructuras dibujadas coincidan con sus obstáculos, incluyendo rotaciones.
- Recorrer visualmente pueblo y cripta, interactuar con los cinco servicios y comprobar que sus accesos sigan disponibles.
- Comparar NPCs desde la cámara normal y en primer plano; verificar animaciones, accesorios, sombras y etiquetas.
- Ejecutar pruebas relevantes y compilación antes de dar por terminada cada entrega.

## Límites

No incluye interiores nuevos, puertas interactivas, destrucción de edificios ni física vertical. La colisión entre personajes no forma parte de esta corrección de estructuras.
