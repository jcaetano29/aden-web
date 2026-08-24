# Etapa 13 — Retención (racha + diaria + logros/títulos)

## Objetivo

Tras el gear (E12), la palanca elegida para "vuelvo mañana": razones para volver
cada día + metas de largo plazo con identidad. Tres piezas que comparten un estado
persistente por personaje:
1. **Racha de login + recompensa diaria** por entrar.
2. **Misión diaria rotativa** (determinística por día).
3. **Logros con títulos** que se lucen en el nameplate.

## Diseño

- `shared/src/retention.ts` (nuevo, puro/testeable): `dayKey`/`previousDay` (UTC),
  `streakReward` (20 oro/día, tope 7), `DAILY_QUESTS` + `dailyQuestForDay(day)`
  (hash del día → determinística), `ACHIEVEMENTS` (8: kills/level/boss/pvp/legendary)
  con `title` y `rewardGold`, `isAchievementMet`/`newlyUnlocked`, `isValidTitle`.

- **Estado (PlayerState, sincronizado)**: loginStreak, dailyQuestId, dailyProgress,
  dailyDone, totalKills, title, achievements (ArraySchema). Server-only: lastLoginDay,
  bossKills. **Persistencia**: un solo blob jsonb `progress` (una migración
  `add_progress_column`) con todo el estado de retención.

- **Server (GameRoom)**:
  - `handleDailyRollover(p, client)` en onJoin: si es día nuevo, actualiza la racha
    (consecutiva o reinicio), asigna la diaria del día, otorga la recompensa de racha
    y avisa (`DailyReset`).
  - En `killMob`: totalKills++, bossKills++ (jefe), progreso de la diaria con
    auto-recompensa al completar (`DailyComplete`), y `checkAchievements`.
  - `checkAchievements(p, sessionId)`: desbloquea los recién cumplidos, da oro,
    auto-equipa el título más fuerte si no tiene ninguno, avisa (`Achievement`).
    Se llama también al recoger loot (legendario) y al equipar.
  - `SetTitle`: lucir un título sólo si pertenece a un logro ya desbloqueado.

- **Cliente**:
  - `Nameplates` refactorizado: línea de **título dorada** opcional sobre el nombre
    (se sincroniza vía `PlayerSnapshot.title`, refrescada en EntityViews al cambiar).
  - `ProgressPanel` (tecla **T**): racha, misión diaria + progreso, lista de logros
    (desbloqueados/bloqueados) y selector de título ("Lucir"/"Quitar"). Signature-guard.
  - Toasts al entrar en día nuevo, completar la diaria y desbloquear logros
    (con sonido de fanfarria reutilizado).

## Verificación

260 tests (133 shared + 78 server + 49 client; nuevos: retention.test, ProgressPanel.test,
4 E2E: racha 1 al entrar / matar desbloquea "Primera Sangre" + título / diaria auto-recompensa /
lucir título valida propiedad). tsc estricto limpio 3 workspaces, build prod OK. Migración
`add_progress_column` aplicada. Racha/diaria/logros en vivo = pendiente-usuario (sandbox WS).
