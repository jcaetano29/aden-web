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

Validación realizada: TypeScript sin errores, 59 pruebas del cliente aprobadas,
build de producción correcto y seis vistas verificadas en Chrome/WebGL2 a
1440 × 960 sin errores de shaders ni JavaScript. Las fuentes externas de Google
estaban bloqueadas por el entorno de prueba; se usó la tipografía de respaldo.
El favicon existente devolvió 404. Ambos avisos quedan separados en el informe.

El atlas añade aproximadamente 4,2 MB de descarga inicial y hasta unos 64 MiB
de imágenes de textura con mipmaps antes de posibles copias del controlador.
Los materiales reutilizan las fuentes del atlas; la repetición es por material.

Los personajes mantienen su geometría low-poly. Este cambio renueva superficies,
relieve, telas, metales, terrenos e iluminación; no reemplaza modelos ni rigging.
