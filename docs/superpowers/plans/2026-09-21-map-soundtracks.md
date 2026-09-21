# Map soundtracks implementation plan

**Goal:** Musicalizar los seis mapas con fantasía medieval propia y una mezcla controlable.

**Architecture:** Score puro → voces Web Audio → escenas con música/ambiente → AudioEngine existente. Un solo contexto y preferencias locales. UI pequeña junto al minimapa.

**Tech Stack:** TypeScript, Web Audio, Vite, Vitest/jsdom.

**Spec:** `docs/superpowers/specs/2026-09-21-map-soundtracks-design.md`

## Restricciones

- Sin assets remotos ni nuevas dependencias de producción.
- Preservar SFX y tecla N; mapas obtenidos del estado autoritativo.
- Gesto inicial, suspensión en segundo plano y limpieza explícita.
- Instrumental medieval con identidad distinta por mapa.

## Tareas

- [x] Composición: `client/src/audio/score.ts` y pruebas de cobertura de ZONES, estructura de 32 compases, registro, duración, variedad y determinismo.
- [x] Sonido: `instruments.ts`, `Soundscape.ts`, `settings.ts` y ampliación de `AudioEngine.ts`. Tests primero para transición, no reiniciar el mismo mapa, preferencias, mute y lifecycle. Instrumentos con envolventes suaves, reverberación y ambiente propio.
- [x] Integración: `AudioPanel.ts`, CSS y conexión en `main.ts`. Test de controles, estado de mute, título por mapa, restauración y ausencia de interferencia con gameplay. Ensayo local `soundtrack-preview.html`.
- [x] Verificación: tests de cliente, TypeScript, build, render de las seis partituras en navegador y revisión de controles. Documentar controles, composición, limitaciones y evidencia en `docs/map-soundtracks.md`.
