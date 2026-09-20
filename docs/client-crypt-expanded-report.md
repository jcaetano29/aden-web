# Cliente: Cripta ampliada

La presentación usa las constantes compartidas `CRYPT_ROOMS`, `CRYPT_ROUTE`, `CRYPT_SEALS`, `CRYPT_BOSS`, `CRYPT_WAVE_TEMPLATES` y las estructuras de colisión existentes.

- Cuatro salas texturizadas, pasajes con giros y una arena de 18 unidades de radio. Ruta dorada y ramales de color a los sellos.
- Laterales con losas funerarias y runas a ras de suelo. Las paredes y pilares sólidos conservan exactamente las cajas compartidas; no se agregaron obstáculos puramente visuales.
- Minimapa dibuja salas y pasajes para orientarse en el nuevo recorrido.
- El objetivo de combate elige la criatura viva más cercana entre todos los tipos de la ola activa (incluye acechadores y bestias), sin marcar enemigos de una etapa futura.
- Guía actualizada: enemigos muertos no reaparecen, avance compartido, reinicio al quedar vacía la cripta, muerte al pueblo y reingreso al progreso de la expedición activa. Tras completarla se indica que todos deben salir antes de abrir otra.
- Los modelos animados existentes se seleccionan mediante los nuevos datos compartidos; no se presentan como modelos nuevos ni se añaden siluetas falsas.
- Se preservan mejoras de NPC y navegación de HEAD 9a521da. Todos los detalles de suelo quedan bajo y=0.12, altura del círculo peligroso.

Verificación: 105 pruebas cliente / 33 archivos aprobados; TypeScript cliente aprobado; build de producción aprobado. Persiste advertencia previa de bundle >500 kB. Las pruebas nuevas verifican salas/ruta dentro de bounds, geometría sólida idéntica a colisión y separación vertical del peligro; las ampliadas cubren coordenadas de sellos, instrucciones de expedición y selección de diferentes tipos de bestias.

Sin cambios a shared/server, sin commits ni publicación. La comprobación visual final queda a cargo del agente principal.
