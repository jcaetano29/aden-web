import { afterEach, describe, expect, it } from 'vitest';
import { ITEM_TEMPLATES, type ItemTemplate } from '@aden/shared';
import { compareEquipment } from './EquipmentComparison.js';

const ids: string[] = [];
function item(id: string, values: Partial<ItemTemplate>) {
  ids.push(id);
  ITEM_TEMPLATES[id] = { id, name: id, type: 'equipment', stackable: false, slot: 'weapon', ...values };
  return id;
}
afterEach(() => ids.splice(0).forEach(id => delete ITEM_TEMPLATES[id]));

describe('comparación de equipo', () => {
  it('distingue mejora, pérdida, igualdad y ventajas mixtas sin sumar stats incompatibles', () => {
    const old = item('compare_old', { bonuses: { pAtk: 10, maxHp: 20 } });
    const better = item('compare_better', { bonuses: { pAtk: 15, maxHp: 20 } });
    const mixed = item('compare_mixed', { bonuses: { pAtk: 20, maxHp: 10 } });
    expect(compareEquipment(better, { weapon: old })?.verdict).toBe('better');
    expect(compareEquipment(old, { weapon: better })?.verdict).toBe('worse');
    expect(compareEquipment(old, { weapon: old })?.verdict).toBe('equal');
    expect(compareEquipment(mixed, { weapon: old })?.verdict).toBe('mixed');
    expect(compareEquipment(mixed, { weapon: old })?.delta).toEqual({ pAtk: 10, pDef: 0, maxHp: -10, maxMp: 0 });
  });

  it('incluye la pérdida de bonificación al romper un conjunto', () => {
    const helmet = item('compare_helmet', { slot: 'helmet', category: 'armadura', setId: 'compare_set' });
    const armor = item('compare_armor', { slot: 'armor', category: 'armadura', setId: 'compare_set', bonuses: { pDef: 5 } });
    const replacement = item('compare_replacement', { slot: 'armor', bonuses: { pDef: 6 } });
    const result = compareEquipment(replacement, { helmet, armor });
    expect(result?.delta.pDef).toBe(-1);
    expect(result?.verdict).toBe('worse');
  });

  it('aplica los porcentajes sobre la base del personaje y sus atributos', () => {
    const plain = item('compare_plain', { slot: 'armor', bonuses: { maxHp: 10 } });
    const enhanced = item('compare_enhanced', { slot: 'armor', bonuses: { maxHp: 10 }, options: { quality: 'excellent', level: 0, luck: false, skill: false, additional: 0, excellent: [0] } });
    const result = compareEquipment(enhanced, { armor: plain }, { className: 'knight', level: 20, attributes: { str: 3, agi: 2, vit: 10, ene: 4 } });
    expect(result?.after.maxHp).toBe(Math.round(result!.before.maxHp * 1.04));
    expect(result?.delta.maxHp).toBeGreaterThan(0);
  });

  it('compara ranuras vacías e ignora ids inválidos sin mutar el equipo', () => {
    const equipment = { weapon: 'invalid' };
    expect(compareEquipment('iron_sword', equipment)?.delta.pAtk).toBe(9);
    expect(equipment).toEqual({ weapon: 'invalid' });
    expect(compareEquipment('health_potion', {})).toBeNull();
    expect(compareEquipment('invalid', {})).toBeNull();
  });

  it('no simula una combinación ilegal de arma a dos manos y escudo', () => {
    const weapon = item('compare_two', { hands: '2H' });
    const shield = item('compare_shield', { slot: 'shield' });
    expect(compareEquipment(weapon, { shield })).toBeNull();
    expect(compareEquipment(shield, { weapon })).toBeNull();
  });
});
