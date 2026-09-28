# Jefes e invasiones: exploración ampliada

## Presentación de los jefes

Los ocho jefes usan una presentación propia seleccionada por su plantilla. Los seis humanoides parten del mismo sistema modular de los personajes: armaduras, coronas, capas, máscaras y ornamentos siguen los huesos de sus animaciones. Halden lleva un martillo y el Coloso tiene una silueta más ancha y placas de piedra con vetas encendidas. Vharzul y el Dragón Carmesí usan una criatura original con cuatro patas, cuello y cola largos, alas articuladas y escamas.

La escala de combate y las plantillas de estadísticas se mantienen. El movimiento visual ocurre por debajo del objeto que recibe la posición del servidor.

Para revisar el resultado, iniciar el cliente y abrir `/boss-preview.html`. El bestiario ofrece comparación con la versión anterior, animaciones, cámara de juego e iluminación de varios mapas. El botón «Ver sector exterior» permite inspeccionar uno de los campamentos nuevos; esta galería muestra escenografía y personajes, no ejecuta una partida ni genera mobs del servidor.

## Tamaño y contenido del mundo

Bosque, Ruinas, Yermo, Marismas, Monasterio, Minas y Fragua pasan de 130 × 130 a 256 × 256 unidades: casi cuatro veces su superficie anterior. Cada mapa agrega cuatro sectores de caza con tres enemigos por sector, caminos secundarios, vegetación o rocas y referencias de orientación. Las posiciones de la campaña existente se conservan. Pueblo y las arenas interiores mantienen sus dimensiones.

La referencia de escala es la cuadrícula de 256 × 256 documentada por [OpenMU](https://github.com/MUnique/OpenMU/blob/master/docs/GameMap.md). Es una adaptación a las unidades y al movimiento de este juego, no una reproducción exacta del terreno o de los tiempos de recorrido de MU 99b.

Las columnas y postes de los nuevos sectores comparten sus posiciones entre el renderizado, las colisiones y la navegación. La escenografía de otros mapas se oculta al cambiar de región.

## Invasiones

Cada invasión elige al azar uno de sus mapas permitidos y una posición transitable dentro de él. El punto debe estar conectado al acceso del mapa, alejado del punto de reaparición, de los objetos interactivos y de los obstáculos. Hay un margen para que el área de combate quede dentro del mapa. Si los intentos aleatorios no encuentran un punto válido, una búsqueda determinista recorre las alternativas.

Los anuncios indican el mapa. El minimapa no muestra el punto anunciado ni el jefe invasor cuando está activo; hay que encontrarlo recorriendo la zona. El panel de mapas conserva la indicación del mapa afectado. Los jefes de campaña mantienen su comportamiento habitual en el minimapa.

Este cambio se aplica a las cuatro invasiones que existen en esta rama. No se encontró una implementación separada de «invasiones doradas» en ella. La tabla `INVASION_SPOTS` queda exclusivamente como fixture del simulador de balance; el evento real usa `chooseInvasionSpawn`.

## Comprobaciones

- Navegación y fauna en los siete mapas ampliados.
- Selección de puntos alcanzables y libres de obstáculos, incluida la regresión de una columna del bosque.
- Ciclo de anuncio, aparición, combate y finalización de las invasiones.
- Ausencia de marcas de invasión en el minimapa.
- Animación, geometría y liberación de recursos de los jefes.
- Revisión visual en el bestiario y compilación de cliente y servidor.
