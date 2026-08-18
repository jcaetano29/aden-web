import { expToNextLevel } from "./progression.js";

/** % del oro que pierde la víctima al morir en PvP. */
export const PVP_GOLD_LOSS_PCT = 0.10;
/** % de la exp del nivel actual que pierde la víctima al morir en PvP. */
export const PVP_EXP_LOSS_PCT = 0.05;

/**
 * Penalidad de muerte PvP. `exp` es el progreso dentro del nivel actual
 * (se resetea al subir de nivel, ver progression.gainExp), así que restar un
 * % de expToNextLevel(level) con piso en 0 nunca produce delevel.
 */
export function applyPvpDeathPenalty(
  gold: number,
  exp: number,
  level: number,
): { gold: number; exp: number } {
  const newGold = Math.floor(gold * (1 - PVP_GOLD_LOSS_PCT));
  const loss = Math.floor(expToNextLevel(level) * PVP_EXP_LOSS_PCT);
  const newExp = Math.max(0, exp - loss);
  return { gold: newGold, exp: newExp };
}
