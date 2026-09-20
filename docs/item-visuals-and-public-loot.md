# Representación de ítems y botín público

Las 228 bases del catálogo y los objetos heredados tienen representación mediante 28 familias. Las variantes conservan familia y acabado; el color del halo y la emisión provienen de la rareza resuelta por `getItem`. No se modifica el sistema existente que resuelve calidad, mejoras, opciones excelentes o rareza. Un +9 normal no recibe el brillo de un legendario por su nivel de mejora.

## Recursos

- Nuevos: geometrías procedurales de armas, piezas de armadura, accesorios, alas, compañeros, consumibles, munición, monedas y materiales. Se combinan las partes por material y se comparten entre objetos e instancias compatibles.
- Nuevos: iconos SVG proyectados desde esas mismas geometrías, generados bajo demanda y cacheados por apariencia, no por identificador único.
- Reutilizados: `aden-material-atlas.png`, sus mapas de metal, madera, cuero, tela y hueso y los modelos y esqueletos de personajes ya existentes. No se añadieron nuevas texturas ni modelos externos descargados. Los recursos reutilizados conservan su procedencia original.
- El equipo utiliza las mismas geometrías sobre huesos animados. Guantes, botas y grebas se separan por lado; las armas originales se ocultan al equipar y se restauran al quitar la pieza. Los modelos de transformación conservan su identidad.

## Regla de recogida

El botín es público desde que termina la demora existente de aparición (1,5 segundos), igual para todos. Se conserva la recogida automática al acercarse y se agrega clic para identificar, acercarse e intentar recoger. El primer intento válido que procesa el servidor recibe el objeto. No hay reserva por autor de la muerte.

La entrega y la eliminación ocurren sin operaciones asíncronas intermedias. El servidor comprueba existencia, personaje vivo y con HP, mapa, distancia de 2,5 unidades, demora, expiración, cantidad e identidad válidas y capacidad numérica de entrega. El inventario actual no limita casillas. Un rechazo conserva el objeto en el suelo. El identificador completo contiene las propiedades de la instancia y no se vuelve a sortear al recoger.

Los drops se separan en suelo transitable, considerando los cercanos de otras muertes. El cliente filtra mapa, muestra la aparición, el halo y el nombre con cantidad al señalar o seleccionar. La eliminación se sincroniza a todos por recogida, vencimiento a los 60 segundos o reinicio de cripta. No se alteran inventarios ajenos, premios directos ni el progreso compartido y reinicio de la mazmorra.

## Verificación

- Cobertura automática de todas las bases y calidades permitidas; construcción de todos los modelos e iconos y compartición de geometrías.
- Dos conexiones Colyseus reales: muerte de bestia y recogida por el otro cliente, intentos concurrentes sobre una única instancia, rechazo desde lejos, muerto, otro mapa y durante aparición, expiración y limpieza de cripta observadas por ambos clientes.
- Pruebas de entrega inválida, HP cero, identidad completa y separación transitable de muertes repetidas.
- Revisión en navegador de las 28 familias, las siete rarezas existentes, equipo en cuatro clases, compra e inventario reales. Galería local de 300 drops: 60 geometrías compartidas, sin luces por objeto. Al quitar los drops se retiran sus objetos de escena; las geometrías cacheadas se liberan al cerrar la sesión.
- Suites de shared, servidor y cliente, TypeScript en los tres paquetes y compilación de producción de Vite.
- Resultado final: 181 pruebas de shared, 158 de servidor y 110 de cliente (449 aprobadas). La revisión agregó regresiones para equipar durante animaciones y para ocultar/restaurar el arco decorativo del explorador.

## Herramienta de revisión y límites

Con Vite activo, abrir `/item-preview.html`. Es una entrada de desarrollo separada; no forma parte de la entrada de producción. Permite revisar familias, rarezas, equipo y 300 drops.

Las familias y variantes comparten recursos: no hay 228 modelos artesanales exclusivos. El equipo son piezas rígidas ajustadas a los esqueletos existentes; no son nuevos modelos de vestimenta con deformación de tela, ni nuevas animaciones de monta. La búsqueda de separación tiene un límite de 48 candidatos; en suelo completamente saturado usa el candidato con mayor espacio disponible. La prueba de rendimiento es una escena local aislada, no una garantía para móviles o batallas completas. Vite conserva la advertencia de bundle mayor a 500 kB.

Commit y push autorizados por el usuario después de la verificación.
