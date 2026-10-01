import { describe, it, expect } from "vitest";
import { ATTRIBUTES, attributeBonuses, attributeEffects, isValidAttribute, pointsForLevel, POINTS_PER_LEVEL } from "./stats.js";
import { ITEM_TEMPLATES } from './items.js';

describe("stats", () => {
  it('explica el incremento entero del próximo punto, incluido el redondeo sin aumento visible', () => {
    const zero = { str: 0, agi: 0, vit: 0, ene: 0 };
    expect(attributeEffects(zero, 'mage').str).toContain('+1 ataque mágico');
    expect(attributeEffects({ ...zero, str: 1 }, 'mage').str).toContain('sin aumento visible');
    expect(attributeEffects(zero, 'rogue').agi).toContain('+2 ataque');
    expect(attributeEffects({ ...zero, agi: 1 }, 'rogue').agi).toContain('+1 ataque');
  });

  it('incluye los porcentajes del equipo al explicar el siguiente punto de vida', () => {
    ITEM_TEMPLATES.attribute_test_armor = { id: 'attribute_test_armor', name: 'Armadura', type: 'equipment',
      stackable: false, slot: 'armor', category: 'armadura', options: { quality: 'excellent', level: 0, additional: 0, luck: false, skill: false, excellent: [0] } };
    try {
      // Caballero: round(140 * 1.04)=146; round((140+18) * 1.04)=164.
      // Con 1 punto: round((140+36) * 1.04)=183; el siguiente da 19, no 18.
      expect(attributeEffects({ str: 0, agi: 0, vit: 1, ene: 0 }, 'knight', {
        level: 1, equipment: { armor: 'attribute_test_armor' },
      }).vit).toContain('+19 vida');
    } finally { delete ITEM_TEMPLATES.attribute_test_armor; }
  });
  it("attributeBonuses mapea cada atributo a su stat derivado", () => {
    expect(attributeBonuses({ str: 3, agi: 0, vit: 0, ene: 0 }, 'knight').pAtk).toBe(9);
    expect(attributeBonuses({ str: 0, agi: 4, vit: 0, ene: 0 }).pDef).toBe(8);
    expect(attributeBonuses({ str: 0, agi: 0, vit: 2, ene: 0 }, 'knight').maxHp).toBe(36);
    expect(attributeBonuses({ str: 0, agi: 0, vit: 0, ene: 5 }).maxMp).toBe(30);
  });

  it("attributeBonuses suma independiente por stat", () => {
    const b = attributeBonuses({ str: 1, agi: 1, vit: 1, ene: 1 });
    expect(b).toMatchObject({ pAtk: 3, pDef: 2, maxHp: 18, maxMp: 6 });
  });

  it.each([
    ['knight', 'str', 30], ['barbarian', 'str', 30],
    ['mage', 'ene', 20], ['rogue', 'agi', 15], ['ranger', 'agi', 15],
  ] as const)('%s obtiene daño de su atributo principal %s', (className, attr, attack) => {
    const points = { str: 0, agi: 0, vit: 0, ene: 0, [attr]: 10 };
    expect(attributeBonuses(points, className).pAtk).toBe(attack);
    expect(attributeBonuses({ str: 0, agi: 0, vit: 0, ene: 0 }, className).pAtk).toBe(0);
  });

  it('agilidad acelera también al mago, con límites para velocidad y movimiento', () => {
    const ten = attributeBonuses({ str: 0, agi: 10, vit: 0, ene: 0 }, 'mage');
    expect(ten).toMatchObject({ attackSpeed: 0.1, moveSpeed: 0.02 });
    const many = attributeBonuses({ str: 0, agi: 1000, vit: 0, ene: 0 }, 'mage');
    expect(many).toMatchObject({ attackSpeed: 0.5, moveSpeed: 0.15 });
  });

  it('energía mejora más el maná del mago y vitalidad la salud del caballero', () => {
    const points = { str: 0, agi: 0, vit: 10, ene: 10 };
    const mage = attributeBonuses(points, 'mage');
    const knight = attributeBonuses(points, 'knight');
    expect(mage.maxMp).toBe(100);
    expect(knight.maxMp).toBe(60);
    expect(mage.maxHp).toBe(120);
    expect(knight.maxHp).toBe(180);
  });

  it("isValidAttribute acepta los 4 y rechaza otros", () => {
    for (const a of ATTRIBUTES) expect(isValidAttribute(a)).toBe(true);
    expect(isValidAttribute("luck")).toBe(false);
    expect(isValidAttribute("")).toBe(false);
  });

  it("pointsForLevel crece POINTS_PER_LEVEL por nivel desde el 1", () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(POINTS_PER_LEVEL);
    expect(pointsForLevel(5)).toBe(4 * POINTS_PER_LEVEL);
  });
});
