# Validación de héroes modulares

Fecha: 2026-09-28. Rama: `codex/modular-heroes`. El usuario aceptó la muestra y autorizó la integración. Creador, cinco clases, armaduras, armas, guardado, red y renderizado del mundo implementados. La rama permanece aislada; no se publicó ni desplegó.

## Resultado visible

El juego `/` usa los héroes nuevos. La galería `/hero-redesign-preview.html` permite comparar con los antiguos y revisar cinco clases en ambos cuerpos, cuatro rostros, seis opciones de cabello por cuerpo, barbas, marcas y paletas. Incluye selector de ocho familias de arma y escudo, vestuario, casco, cámara, animaciones y exportación PNG.

Se inspeccionaron combinaciones representativas de cuerpos, clases, piel clara/oscura, cabello, barba, marcas y equipo. Se observaron arco y ballesta en reposo/ataque, daga de pícaro, hacha, bastón y espada/escudo. Las pruebas de GLB comprueban que cada rostro, peinado y barba anunciado tiene geometría y que todas las combinaciones de cuerpo/clase/rostro/cabello/barba con equipo inicial están debajo de 35.000 triángulos. Esto no sustituye una inspección artística exhaustiva de cada cruce cosmético/equipo.

Capturas exportadas del renderizador:

- [Caballero final](../artifacts/hero-redesign/knight-male-final.png).
- [Explorador final](../artifacts/hero-redesign/ranger-male-final.png).
- [Pícara final](../artifacts/hero-redesign/rogue-female-final.png).
- [Rostro personalizado](../artifacts/hero-redesign/custom-face-final.png).
- [Maga de la muestra aprobada](../artifacts/hero-redesign/mage-female-body.png), [caballera](../artifacts/hero-redesign/knight-female-body.png).

## Flujo y recuperación

Dos clientes locales crearon HeroAuditA (maga, rostro alargado, cola alta, piel ébano, cabello plata, pintura de guerra) y HeroAuditB (caballero, piel marfil y barba completa). Ambos se visualizaron juntos en el pueblo; A caminó hasta el césped. Al recargar A, B continuó visible y texturado. A pudo volver a entrar y recuperó clase, posición e identidad guardada.

Las pruebas con clientes Colyseus verifican todos los campos de apariencia en observador y reconexión, login que intenta cambiar la identidad y rechazo de versión futura sin sobrescribir guardados. Transformación/reversión, muerte, selección, orientación y respawn se verificaron con pruebas de integración/render, incluyendo un cadáver ya hundido al expirar la transformación. No se recorrió manualmente una partida completa hasta conseguir transformación y morir.

Se simuló un GLB esencial ausente moviendo temporalmente solo el archivo del build. El creador mantuvo opciones, bloqueó crear/entrar y ofreció Reintentar. Tras restaurarlo, mostró Personajes listos conservando cuerpo, clase y peinado. El mensaje final de fallo usa texto español de recuperación.

A 390 × 844 el documento mide 390 px y el formulario 380 px: no hay desbordamiento horizontal. Teclado cambia opciones con flechas y avanza el foco a Peinado con Tab. El estado elegido tiene marca además del color. El test de movimiento reducido comprueba que el mixer no avanza; no se cambió la preferencia del sistema operativo.

## Recursos y rendimiento

Once GLB suman **15.563.504  bytes (14,84 MiB)**. Las fuentes gratuitas y hashes están en `scripts/heroes/source-selection.json` y `client/public/models/heroes/provenance.json`. Los 77 iconos PNG suman 354.260bytes; GLB+iconos suman 15.917.764 bytes (15,18MiB). El catálogo integrado supera en 0,18MiB la referencia de 15 MiB usada para la muestra. No se incluyen los recursos antiguos del mundo en ese total.

El caballero masculino con peinado inicial registra 20.522 triángulos y 17 dibujos de malla. La separación por ranuras aumenta los dibujos frente a la muestra inicial de 12; permite teñir casco, torso, guantes y botas sin modificar otra pieza. El explorador masculino inicial registra 25.583 triángulos y 11 dibujos.

Build Vite, navegador integrado Chrome 153/Windows, GPU NVIDIA GeForce RTX 4060 Ti vía ANGLE/D3D11, comparación desactivada, lienzo 1920×1080, reposo, 5 segundos de calentamiento y 10 de medición:

| Héroes | FPS promedio | Cuadro p95 | Llamadas con sombras y escenario |
| ---: | ---: | ---: | ---: |
| 1 | 360,0 | 2,9 ms | 36 |
| 10 | 359,0 | 2,9 ms | 342 |
| 20 | 200,7 | 5,7 ms | 682 |

Son mediciones del estudio en este equipo; no representan el mundo completo ni garantizan rendimiento en otras máquinas.

Después de calentar, 50 recreaciones alternando clases mantuvieron 64 geometrías/50 texturas antes y después. Tras calentar ambos cuerpos y vestuarios, 20 ciclos de equipar/quitar mantuvieron 77 geometrías/71 texturas. Los contadores incluyen recursos compartidos cacheados y texturas de huesos de las instancias; no son una medición de bytes de heap. No crecieron progresivamente en los ciclos observados.

## Verificaciones ejecutadas

- `npm test`: **904 aprobadas**, shared 267/44 archivos, servidor 319/40 archivos, cliente 318/77 archivos.
- `node --test scripts/heroes/gltf.test.mjs scripts/heroes/build.test.mjs scripts/heroes/assets.test.mjs`: **13 aprobadas**, incluidos GLB reales y presupuesto de todas las opciones.
- `npx tsc -p client/tsconfig.json --noEmit`: aprobado.
- Builds de cliente y servidor: aprobados. Vite conserva el aviso de chunk compartido mayor a 500 kB.
- Tras pulir el texto de recuperación y verificar movimiento reducido: 2 pruebas focalizadas y toda la suite del cliente (318) aprobadas; build del cliente aprobado.
- Revisión independiente de toda la rama: sin hallazgos críticos; la observación de repetición de muerte quedó corregida con prueba RED→GREEN y suite completa.

## Límites y cierre inesperado

Los atuendos de cuero de bárbaro/pícaro/explorador comparten base con acabados diferentes; no hay una malla por ítem. Se reutilizan los accesorios existentes y algunas animaciones de ataque. La inspección artística final fue por muestreo; no certifica ausencia de clipping en cada combinación posible.

Durante la verificación el usuario informó un cierre inesperado. Los procesos locales y sus puertos ya no estaban activos. Se recuperaron servidor y preview como procesos ocultos en segundo plano; los cambios en Git estaban intactos. No se pudo establecer la causa del cierre de la aplicación. Las cuentas de estas pruebas usan memoria local y desaparecen al reiniciar ese servidor; no se tocó una base externa.

Las decisiones de implementación, sus costos y las sustituciones de auditoría están registradas en [hero-redesign-decisions.md](hero-redesign-decisions.md).
