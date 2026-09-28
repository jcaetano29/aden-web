# Validación de la muestra modular de héroes

Fecha: 2026-09-28. Rama: `codex/modular-heroes`. Estado: hito A implementado; aceptación estética del usuario pendiente.

## Alcance visible

La galería `/hero-redesign-preview.html` presenta caballero y mago en ambos cuerpos, dos rostros por cuerpo, dos peinados por cuerpo más calvicie, ocho tonos de piel, ocho colores de cabello y seis de ojos. Incluye placas, túnica, casco de prueba, espada, escudo y bastón. La comparación utiliza la misma cámara e iluminación para el modelo antiguo y el nuevo.

Se comprobaron reposo, caminar, ataque, impacto y caída; frente, perfil, espalda y tres cuartos; acercamiento al rostro y cámara del juego. La cámara del juego usa FOV 60 y posición (0, 30, 30), con distancias de niebla compatibles. El escenario de la galería es un estudio, no el mundo completo.

Las correcciones surgidas de esta revisión incluyen anclaje de hombreras, corte interpolado del cuello, ocultación de ropa bajo las placas, piernas completas bajo una túnica abierta con pesos de muslo/pantorrilla, y bastón en la mano derecha para liberar la mano de lanzamiento del hechizo.

## Evidencia visual

Capturas PNG exportadas desde el renderizador de la galería:

- [Caballero masculino](../artifacts/hero-redesign/knight-male-body.png), [rostro](../artifacts/hero-redesign/knight-male-face.png) y [cámara del juego](../artifacts/hero-redesign/knight-male-game.png).
- [Caballero femenino](../artifacts/hero-redesign/knight-female-body.png) y [rostro de perfil](../artifacts/hero-redesign/knight-female-face.png).
- [Maga](../artifacts/hero-redesign/mage-female-body.png) y [rostro](../artifacts/hero-redesign/mage-female-face.png).

En navegador se verificaron cambios de clase/cuerpo/rostro/cabello/colores/equipo, comparación, giro, zoom, pausa y exportación PNG. La consola del build no mostró errores ni advertencias. A 390 × 844 no apareció desbordamiento horizontal; el panel pasa debajo del escenario.

## Presupuesto de recursos

Los cinco GLB suman 13.292.336 bytes (12,68 MiB), dentro del máximo de 15 MiB. Los originales Standard y sus licencias están inventariados en `scripts/heroes/source-selection.json`; la procedencia y los hashes exportados están en `client/public/models/heroes/provenance.json`.

Conteo de mallas visibles, con rostro seleccionado, atuendo de clase y armas iniciales. Los rostros, peinados y atuendos alternativos ocultos no se suman al personaje renderizado.

| Cuerpo | Clase | Sin cabello | Peinado 1 | Peinado 2 |
| --- | --- | ---: | ---: | ---: |
| Masculino | Caballero | 19.221 | 20.522 | 20.051 |
| Masculino | Mago | 16.278 | 17.579 | 17.108 |
| Femenino | Caballero | 20.355 | 23.261 | 23.639 |
| Femenino | Mago | 19.328 | 22.234 | 22.612 |

Todos están por debajo de 35.000 triángulos. Cada personaje requiere 11 llamadas de malla sin cabello o 12 con cabello, antes de pasadas de sombras, suelo y efectos. El renderer registró 26/242/482 llamadas con 1/10/20 héroes, incluyendo sombras y escenario.

## Rendimiento reproducible

Equipo informado por WebGL: NVIDIA GeForce RTX 4060 Ti, ANGLE Direct3D11. Navegador integrado Chrome 153 sobre Windows 10. Build de Vite servido localmente, lienzo de 1920 × 1080, comparación desactivada, caballero masculino con cabello, animación de reposo, cinco segundos de calentamiento y diez segundos de muestreo por ejecución.

| Héroes | FPS promedio | Tiempo de cuadro p95 |
| ---: | ---: | ---: |
| 1 | 360,0 | 2,9 ms |
| 10 | 357,4 | 2,9 ms |
| 20 | 256,5 | 5,6 ms |

Estas mediciones superan el objetivo de 60 FPS en este equipo y esta escena. No estiman el rendimiento del mundo completo ni de otros equipos. El botón «Medir a 1080p» permite repetirlas y muestra GPU y navegador junto al resultado.

## Verificación automatizada

- `npm test`: shared 265 y servidor 314 aprobadas; cliente 299 aprobadas en la primera ejecución completa.
- Tras añadir el caso de agarre del bastón: `npm test -w @aden/client`, 300 aprobadas en 71 archivos. Total actual: 879 pruebas del proyecto aprobadas.
- `node --test scripts/heroes/gltf.test.mjs scripts/heroes/build.test.mjs scripts/heroes/assets.test.mjs`: 9 aprobadas sobre lector, geometría, interpolación de pesos, retarget y deformaciones de los GLB definitivos.
- TypeScript del cliente con `--noEmit`: aprobado.
- `npm run build -w @aden/client`: aprobado; genera tanto el juego como la galería. Permanece el aviso de Vite sobre un chunk mayor a 500 kB.
- Revisión independiente: se corrigieron liberación de esqueletos de la comparación antigua, niebla en la cámara del juego e inclusión de la galería en el build. Los dos defectos de comportamiento tienen pruebas de regresión.

Durante la suite se corrigió el aislamiento de `InvasionEvent.test.ts`: una posición aleatoria del segundo drop podía activar la recogida automática antes de comprobar su reserva. Los jugadores se alejan mientras avanza ese temporizador; la lógica del servidor no cambia. La prueba aislada pasó sus tres casos y la suite del servidor pasó sus 314 casos.

## Siguiente hito

Esta entrega es la muestra de calidad acordada. Todavía faltan la aceptación estética, las tres clases restantes, el catálogo ampliado de rostros/cabello/barbas/marcas, el creador inicial, el guardado y la sincronización de apariencia y la integración de los héroes en el mundo. No se ha desplegado ni fusionado esta rama con la principal.
