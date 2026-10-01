import { getItem, equipmentBonuses, characterStats,
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
    const { pAtk, pDef, maxHp, maxMp } = characterStats(context.className, context.level, context.attributes, loadout);
    return { pAtk, pDef, maxHp, maxMp };
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
