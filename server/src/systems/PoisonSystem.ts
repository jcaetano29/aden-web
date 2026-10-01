export interface PoisonEffect {
  attackerId: string;
  level: number;
  dps: number;
  remainingMs: number;
  accumulatedMs: number;
}

/** One poison per attacker. Refreshes never erase another player's effect. */
export function addPoison(effects: Map<string, PoisonEffect>, attackerId: string, level: number, dps: number, durationMs: number): void {
  const old = effects.get(attackerId);
  effects.set(attackerId, { attackerId, level, dps, remainingMs: durationMs, accumulatedMs: old?.accumulatedMs ?? 0 });
}

/** A false tick result stops processing (the target died). */
export function tickPoisons(effects: Map<string, PoisonEffect>, dtMs: number, valid: (effect: PoisonEffect) => boolean, tick: (effect: PoisonEffect) => boolean): number {
  for (const [id, effect] of effects) {
    if (!valid(effect)) { effects.delete(id); continue; }
    effect.accumulatedMs += Math.min(dtMs, effect.remainingMs);
    effect.remainingMs = Math.max(0, effect.remainingMs - dtMs);
    while (effect.accumulatedMs >= 500) {
      effect.accumulatedMs -= 500;
      if (!tick(effect)) { effects.clear(); return 0; }
    }
    if (effect.remainingMs <= 0) effects.delete(id);
  }
  return Math.max(0, ...[...effects.values()].map(effect => effect.remainingMs));
}
