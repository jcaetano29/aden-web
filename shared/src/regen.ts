/** Sin recibir ni causar daño durante este tiempo, el personaje sale de combate. */
export const COMBAT_REGEN_DELAY_MS = 5000;
/** Fracción del maná máximo por segundo fuera de combate (recarga completa en ~17 s). */
export const MP_REGEN_OUT_OF_COMBAT_PCT = 0.06;
/** Fracción del maná máximo por segundo en combate. Calibrado con `npm run balance -- --mana`: la rotación completa
 * de un mago de nivel 15 se agota en ~58 s y su skill principal se sostiene (objetivo: 40–70 s). */
export const MP_REGEN_IN_COMBAT_PCT = 0.01;

export function mpRegenPerSecond(maxMp: number, msSinceCombat: number, manaRegenEffect: number): number {
  const base = msSinceCombat < COMBAT_REGEN_DELAY_MS
    ? Math.max(1, maxMp * MP_REGEN_IN_COMBAT_PCT)
    : Math.max(2, maxMp * MP_REGEN_OUT_OF_COMBAT_PCT);
  return base + maxMp * manaRegenEffect;
}
