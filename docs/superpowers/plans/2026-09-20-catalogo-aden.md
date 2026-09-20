# Catálogo de Aden: plan de implementación

**Objetivo:** integrar los 208 objetos de referencia con nombres originales, equipo por ejemplar, rarezas funcionales y compatibilidad de guardados.

**Diseño aprobado:** extender el sistema actual de plantillas compartidas y servidor autoritativo. Agregar Explorador para el rol arquero sin alterar el Pícaro. No agregar evoluciones sin una mecánica que las justifique. Preservar los IDs y estadísticas del equipo anterior.

**Tecnología:** TypeScript, Colyseus, Three.js, Vitest; sin dependencias nuevas.

## Contratos

Catálogo exporta `CATALOG_ITEMS` como registro de plantillas. Cada plantilla tiene `id`, `name`, `type`, `stackable`, `ref_origen`, `category`, `subcategory`, `classes`, `hands`, `tier`, `description`, `allowedQualities`; equipo agrega `slot`, `bonuses`, `setId` si corresponde y `requiredLevel`. Calidad nueva: `normal | magic | excellent`. Sin calidad para joyas, consumibles y munición.

Los IDs de ejemplares codifican versión y modificadores validados y un identificador único; `getItem` los resuelve de manera determinista en servidor/cliente. Así se conservan los mapas de inventario/equipo y el guardado JSON existentes sin columnas nuevas. Nunca confiar en un ID enviado por cliente sin verificar propiedad.

## Trabajo

- [x] Catálogo: 208 nombres, clases, manos, familias, tier, rarezas permitidas; tabla completa original/nuevo/clases; prueba de cobertura y nombres únicos.
- [x] Equipo: ranuras, ejemplares y modificadores, bonos de conjunto, restricciones; probar combinaciones inválidas, 1–6 opciones Excellent y guardados de IDs.
- [x] Jugabilidad: Explorador, skills de objetos/pergaminos, consumo, mejoras, munición, mascota y montura; pruebas de efectos y validación autoritativa.
- [x] Integración: botín/tiendas, combate PvE/PvP, persistencia, inventario y barra de habilidades; verificar selección y uso reales.
- [x] Revisión: suites completas, TypeScript, build y documentación de decisiones y límites.

## Decisiones de balance

Nivel de mejora 0–9; mejoras seguras hasta +6, probabilísticas hasta +9. Opción adicional 0–28 en pasos de 4. Luck: 5 puntos porcentuales de crítico y 25 puntos de éxito de mejora. Excelente: opciones sin duplicar del grupo correspondiente. Conjuntos: 2/3/5 piezas, nunca rareza individual. Escudos incompatibles con armas de dos manos.

## Registro

2026-09-20: usuario aprobó la ampliación y autorizó evaluar clases nuevas. Se eligió Explorador para preservar identidad del Pícaro. Rama `codex/catalogo-aden`; trabajo en el workspace compartido con archivos separados entre tareas. Catálogo independiente del motor de modificadores; integración consume ambos.

2026-09-20: catálogo, motor, servidor y cliente completos. Revisión independiente corrigió muertes por reflejo, armas cuerpo a cuerpo del Explorador y propagación de clics de UI. Verificación: 381 pruebas (171 shared, 125 server, 85 client), tres tsc sin errores y build Vite correcto; advertencia de bundle mayor a 500 kB. Navegador: crear Explorador, equipar/desequipar, buscar/comprar munición y consola sin errores.
