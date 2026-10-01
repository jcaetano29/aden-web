export type PartyLootMode = 'free' | 'round_robin';

/** Applied once to the shared EXP pool, before splitting between eligible members. */
export function partyExpMultiplier(eligibleCount: number): number {
  return 1 + Math.min(0.3, Math.max(0, eligibleCount - 1) * 0.1);
}
