/** Tiempo sin combate que exige viajar con M o con el Sello de Retorno. */
export const TRAVEL_COMBAT_LOCK_MS = 5000;

export function travelLockRemainingMs(msSinceCombat: number): number {
  return Math.max(0, TRAVEL_COMBAT_LOCK_MS - msSinceCombat);
}

export function travelLockText(remainingMs: number): string {
  return `Estás en combate: podés viajar en ${Math.ceil(remainingMs / 1000)} s.`;
}
