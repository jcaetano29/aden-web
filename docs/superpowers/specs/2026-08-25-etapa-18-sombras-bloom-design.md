# Etapa 18 — Iluminación y post-proceso: sombras + bloom + tone mapping

## Objetivo

Siguiente salto de polish visual (pedido del usuario). Dos upgrades de render de alto
impacto, self-contained en el cliente:
1. **Sombras** — para que personajes, estructuras y objetos se sientan APOYADOS en el
   piso, no flotando.
2. **Bloom + tone mapping (ACES)** — para que todo lo emissivo (fuego, santuarios,
   brasas, VFX de skills, cofres) RESPLANDEZCA, dando "juice" cinematográfico.

## Diseño

- **`Renderer`**: `shadowMap.enabled` + `PCFSoftShadowMap`; `toneMapping = ACESFilmic`
  (exposure 1.15); `setPixelRatio(min(dpr,2))`. Suelo `receiveShadow`. Post-proceso con
  `EffectComposer`: `RenderPass` (HDR lineal) → `UnrealBloomPass` (strength 0.6, radius 0.5,
  threshold 0.82 — sólo lo muy brillante florece) → `OutputPass` (tone map + sRGB).
  `render()` usa el composer; `onResize` actualiza composer.
- **`Environment`**: el sol (`DirectionalLight`) proyecta sombras — cámara de sombra
  ortográfica ±55, `mapSize 2048`, bias; **sigue al jugador** (en `updateMood` se mueve
  el sol + su target alrededor del self para acotar el frustum). `enableShadows()` recorre
  las mallas del mundo y activa cast/receive (menos el domo de cielo).
- **`CharacterFactory`**: los personajes proyectan sombra (traverse castShadow en `create`).
- **`WorldObjectViews`**: cofres/barriles/santuarios proyectan sombra.

## Verificación

278 tests (sin tests nuevos: es render puro), tsc estricto limpio 3 workspaces, build prod OK.
Sin cambios de server ni de schema → sale con sólo redeployar el CLIENTE. Visual en vivo =
pendiente-usuario. Perf: shadow map 2048 + bloom con pixelRatio topado a 2 (ok en GPUs modernas).
