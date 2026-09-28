# Apariencia modular de personajes

Las cinco clases del juego usan héroes GLB con anatomía adulta, rostros y cabello seleccionables. Las clases conservan sus atributos y habilidades. NPC, enemigos y transformaciones mantienen la ruta anterior de `CharacterFactory.create`; los jugadores y el creador usan `createHero`.

## Personalización

El creador permite elegir cuerpo masculino/femenino, cuatro rostros, cinco peinados por cuerpo más calvicie, ocho tonos de piel, ocho colores de cabello y seis de ojos. El cuerpo masculino ofrece barba completa, perilla y bigote, además de sin barba. Ambos cuerpos ofrecen cicatriz, pintura de guerra, pecas y sin marcas. Cambiar de clase conserva la identidad; cambiar de cuerpo ajusta solo las opciones incompatibles.

El preview permite girar, acercar y enfocar el rostro. Aleatorio y Restablecer producen combinaciones válidas. Los controles tienen etiquetas y estados seleccionados además del color; se respeta movimiento reducido. Si falla una carga esencial, se conservan las elecciones y se ofrece Reintentar antes de permitir entrar o crear.

## Vestuario y armas

Los atuendos base son placas para caballero, túnica abierta para mago y cuero con acabados distintos para bárbaro, pícaro y explorador. La armadura equipada selecciona familia de vestuario; pantalones, guantes, botas y casco aplican acabados por ranura. El casco oculta el cabello y al retirarlo lo restaura. Las piezas metálicas de torso, brazales, grebas y casco tienen materiales independientes.

Espada, daga, hacha, maza, lanza, bastón, arco, ballesta y escudo usan un repositorio GLB común para mano y suelo. Los 77 iconos PNG se renderizan desde esas familias con acabados y rarezas del catálogo. Los anclajes siguen el esqueleto; arco y ballesta tienen poses propias. Los accesorios, alas, anillos y mascotas reutilizan sus modelos existentes adaptados a los nuevos anclajes.

El conjunto usa familias visuales; no incorpora una malla exclusiva para cada objeto del inventario. Los tres atuendos de cuero comparten base con colores distintos. Las animaciones de espada, daga y hacha comparten el movimiento de ataque adaptado.

## Guardado y red

`shared/src/appearance.ts` define `CharacterAppearanceV1`, opciones compatibles, validación estricta de creación y migración determinista de saves antiguos. `AppearanceState` agrupa los campos cosméticos en un subestado Colyseus. `gender` se conserva como espejo para compatibilidad.

El servidor valida antes de crear una cuenta, guarda una copia de la apariencia y sincroniza a los observadores. Entrar con una cuenta existente conserva la identidad guardada, aunque el cliente envíe otros cosméticos. Una versión futura desconocida se rechaza sin sobrescribir el save y libera la reserva del nombre.

La transformación conserva la apariencia base para recuperarla al terminar. El reemplazo conserva posición, orientación, selección, equipo, mapa y progreso de muerte; respawn restablece la pose viva.

## Propiedad de recursos

`ModularHeroFactory` posee geometrías, clips y texturas compartidas. Cada personaje posee materiales, esqueleto y mixer. Retirar un personaje o cambiar su equipo libera solo sus recursos propios; no invalida a otros personajes. `WeaponModels` sigue el mismo contrato para armas. El creador reutiliza su renderer al cambiar las opciones.

## Revisión local y reconstrucción

Desde la raíz, ejecutar `node node_modules/vite/bin/vite.js client --host 127.0.0.1 --port 5174`. El juego está en `/` y la galería en `/hero-redesign-preview.html`. El juego requiere el servidor local; la galería funciona sin cuentas. El build incluye ambas páginas. La galería ofrece las cinco clases, opciones cosméticas, familias de armas, comparación con el modelo anterior, animaciones, captura PNG y medición de 1/10/20 héroes a 1080p.

Para reconstruir GLB, descargar los paquetes Standard gratuitos inventariados en `scripts/heroes/source-selection.json` a sus rutas indicadas, instalar Python con Pillow y asignar su ejecutable a `HERO_PYTHON`. Ejecutar `node scripts/heroes/import.mjs`. El importador verifica SHA-256 y licencias, resuelve las referencias erróneas de textura registradas e incrusta recursos deduplicados. La procedencia final está en `client/public/models/heroes/provenance.json` y las licencias en `client/public/models/LICENSES.md`.

`node --test scripts/heroes/gltf.test.mjs scripts/heroes/build.test.mjs scripts/heroes/assets.test.mjs` verifica índices, texturas, pesos, retarget y deformación de los GLB reales. El atlas de materiales reutilizado es arte original existente del proyecto. No se distribuyen recursos extraídos de WoW, Lineage II ni MU.

La evidencia y los límites de las comprobaciones están en [hero-redesign-validation.md](hero-redesign-validation.md).
