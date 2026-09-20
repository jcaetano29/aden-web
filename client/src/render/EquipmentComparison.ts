import { getItem, equipmentBonuses, loadoutEffects, statsForClass, attributeBonuses,
  type Attributes, type EquipSlot, type StatTotals } from '@aden/shared';

export interface ComparisonContext {
  className: string;
  level: number;
  attributes: Attributes;
}

export function compareEquipment(id: string, equipment: Partial<Record<EquipSlot, string>>, context?: ComparisonContext) {
  let item;
  try { item = getItem(id); } catch { return null; }
  if (item.type !== 'equipment' || !item.slot) return null;
  if (item.hands === '2H' && equipment.shield) return null;
  if (item.slot === 'shield' && equipment.weapon) {
    try { if (getItem(equipment.weapon).hands === '2H') return null; } catch { /* invalid saved entry */ }
  }
  const totals = (loadout: Partial<Record<EquipSlot, string>>): StatTotals => {
    const bonus = equipmentBonuses(loadout);
    // Old callers without character context can still compare flat equipment bonuses.
    if (!context) return bonus;
    const base = statsForClass(context.className, context.level);
    const attr = attributeBonuses(context.attributes);
    const effects = loadoutEffects(loadout);
    // Same rounding and order as GameRoom.recomputeStats.
    return {
      pAtk: Math.round((base.pAtk + bonus.pAtk + attr.pAtk + context.level * effects.levelAttack) * (1 + effects.attackPct)),
      pDef: base.pDef + bonus.pDef + attr.pDef,
      maxHp: Math.round((base.maxHp + bonus.maxHp + attr.maxHp) * (1 + effects.hpPct)),
      maxMp: Math.round((base.maxMp + bonus.maxMp + attr.maxMp) * (1 + effects.mpPct)),
    };
  };
  const before = totals(equipment);
  const after = totals({ ...equipment, [item.slot]: id });
  const delta: StatTotals = { pAtk: after.pAtk - before.pAtk, pDef: after.pDef - before.pDef,
    maxHp: after.maxHp - before.maxHp, maxMp: after.maxMp - before.maxMp };
  const gains = Object.values(delta).some(n => n > 0), losses = Object.values(delta).some(n => n < 0);
  const verdict: 'mixed' | 'better' | 'worse' | 'equal' = gains && losses ? 'mixed' : gains ? 'better' : losses ? 'worse' : 'equal';
  let current;
  try { current = getItem(equipment[item.slot] ?? ''); } catch { /* empty or invalid slot */ }
  return { before, after, delta, verdict, current, fullStats: !!context };
}
