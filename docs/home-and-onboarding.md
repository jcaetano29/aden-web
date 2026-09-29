# Portada y primeros pasos en Aden

La portada presenta el mundo, la creación de personajes y el acceso a personajes existentes. Conserva la personalización y las cinco clases. Los controles completos se consultan en un desplegable, tanto desde la portada como desde la creación.

## Inicio de la aventura

- El prólogo aparece únicamente después de crear un personaje con éxito. Un ingreso con un personaje existente entra directamente al mundo.
- Los personajes nuevos comienzan sin misión. El marcador del minimapa y los primeros consejos conducen al Anciano Rowan. Su diálogo permite aceptar `q1`.
- Los personajes guardados conservan su misión y su progreso. Los guardados antiguos sin `questId` mantienen el comportamiento de compatibilidad anterior.
- La guía usa el estado de la campaña, la salud, los puntos de atributo y el nivel que envía el servidor. No completa misiones ni inventa acciones realizadas.
- Hasta nivel 10, introduce NPC, viajes, combate, recompensas, inventario, objetos, santuarios, pociones, atributos, habilidades, jefes, servicios, grupos, criptas y progreso. Al terminar el primer acto o en capítulos posteriores deja de mostrar consejos automáticos.
- H o el botón «Guía de juego» abre un manual con todos los temas. «Entendido» descarta un consejo; «Ocultar consejos» oculta la ayuda automática. Se puede reactivar desde el manual sin reiniciar la campaña.
- Las preferencias de ayuda se guardan por nombre exacto de personaje **en este navegador**. Cambiar de navegador puede volver a mostrar consejos pertinentes al progreso actual. Las misiones siguen guardándose en el servidor.

## Verificación

`npm test`: 946 pruebas aprobadas (276 shared, 323 server, 347 client). Tras el último ajuste a los atajos numéricos se repitieron las 16 pruebas de guía, chat y teclado. Se verificaron también los tipos de TypeScript del cliente y las compilaciones de cliente y servidor.

`scripts/verify-onboarding.cjs` recorre la portada en 1440 y 390 px, abre controles, crea un personaje, muestra el prólogo, abre el manual con H/Enter/Espacio, camina a Rowan, acepta la misión, oculta la ayuda, recarga, ingresa con la cuenta existente, reactiva consejos y viaja al bosque. No se detectaron errores de ejecución en el navegador. Capturas y reporte en `artifacts/onboarding/`.

La prueba usa un servidor local descartable. Mantiene un observador conectado porque la persistencia de desarrollo en memoria pertenece a la sala y desaparece al cerrarse. No modifica la configuración de persistencia de producción.

## Ilustración de portada

Archivo final: `client/public/images/aden-home.webp` (1536 × 1024, aproximadamente 261 kB). Generada con la herramienta integrada de imágenes y convertida a WebP para la web. Es una ilustración conceptual, no una captura de juego.

Prompt utilizado:

> Use case: stylized-concept. Asset type: wide landscape background illustration for ADEN, a browser dark fantasy RPG landing page. Create a richly painted cinematic fantasy landscape, wide 3:2 composition. A small fortified medieval village with warm amber window lights at the edge of an ancient deep green forest, an old stone path leading out toward a distant ruined crown-like castle on a misty mountain. The atmosphere should be mysterious but inviting, twilight petrol blue sky, deep forest greens, weathered stone and restrained warm gold illumination. Stylized painterly concept art with deliberate visible brush texture, evoking a handcrafted low-poly adventure world, not a photoreal blockbuster. Strongest detail and softly illuminated village in the center-right. Left third is dark quiet trees and mist with negative space for a large title, right edge slightly darker for login form overlay. No people close up, no interface, no borders, no lettering, no text, no logos, no watermark.
