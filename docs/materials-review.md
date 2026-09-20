# Revisión visual de materiales

Con Vite iniciado en el cliente, abrir `/material-preview.html`. Esta página usa
el Renderer, Environment y CharacterFactory reales del juego y permite recorrer
las cinco zonas y observar las cuatro clases y los dos enemigos sin crear cuentas
ni modificar partidas. Es una herramienta local; no es una entrada del build.

La revisión automática requiere Playwright y Chrome instalados:

```powershell
node scripts/verify-materials.cjs <ruta-al-modulo-playwright> http://127.0.0.1:5174
```

Las capturas y el informe se guardan en `artifacts/materials/`. Se comprueban la
pantalla de entrada, renderizado WebGL, animaciones idle y errores de consola en
las cinco zonas y los seis modelos. Esto no sustituye una prueba multijugador de
combate ni una medición de FPS en el equipo final del jugador.

Validación realizada: TypeScript sin errores, 68 pruebas del cliente aprobadas,
build de producción correcto y seis vistas verificadas en Chrome/WebGL2 a
1440 × 960 sin errores de shaders ni JavaScript. Las fuentes externas de Google
estaban bloqueadas por el entorno de prueba; se usó la tipografía de respaldo.
El favicon existente devolvió 404. Ambos avisos quedan separados en el informe.

El atlas añade aproximadamente 4,2 MB de descarga inicial y hasta unos 64 MiB
de imágenes de textura con mipmaps antes de posibles copias del controlador.
Los materiales reutilizan las fuentes del atlas; la repetición es por material.

Los personajes mantienen su geometría low-poly. Este cambio renueva superficies,
relieve, telas, metales, terrenos e iluminación; no reemplaza modelos ni rigging.

## Mapas y respawn

`MapDressing` añade grupos de árboles con copas, sotobosque, rocas, columnas,
refugios y capillas laterales. Los grupos repetidos se dibujan mediante
InstancedMesh por zona. El trazado reserva espacio para el eje principal, la
llegada, el centro de combate y los objetos interactivos. La población anterior
también respeta los nuevos caminos. El pueblo incorpora viviendas y jardines en
el sector sur; el piso central del templo queda a nivel del terreno caminable.

El botón **Probar muerte y respawn** ejecuta una secuencia sobre el esqueleto real:
camina, muere, su cuerpo se retira bajo el suelo y reaparece dos metros más allá.
La verificación automática comprueba la posición exacta `[7.75, 0, 8]` y que sólo
quede activa la animación `Idle`. Las pruebas de regresión cubren la interrupción
de la muerte por cambios de movimiento, eventos duplicados/tardíos y el reinicio
de pose sin interpolación desde el cadáver. No se cambiaron tiempos de respawn,
estadísticas, cantidad de enemigos ni reglas del servidor.
