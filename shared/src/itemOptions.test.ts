import { describe, it, expect } from "vitest";
import { createItemInstance, resolveItemInstance, upgradeItem, optionEffects, rollItemOptions } from "./itemOptions.js";
import type { ItemTemplate } from "./items.js";

const blade: ItemTemplate = { id: 'test_blade', name: 'Filo del Umbral', type: 'equipment', stackable: false, slot: 'weapon', category: 'arma', allowedQualities: ['normal','magic','excellent'], bonuses: { pAtk: 10 } };
describe('ejemplares de equipo', () => {
  it('el botín de jefe puede generar seis opciones distintas y el común hasta dos',()=>{
    expect(rollItemOptions(blade,()=>0,6).excellent).toEqual([0,1,2,3,4,5]);
    expect(rollItemOptions(blade,()=>0).excellent).toHaveLength(2);
  });
  it('conserva opciones al serializar sin modificar la plantilla', () => {
    const id = createItemInstance(blade, { quality: 'excellent', level: 3, luck: true, additional: 8, excellent: [0,2] }, 'a1');
    const restored = resolveItemInstance(JSON.parse(JSON.stringify(id)), { test_blade: blade });
    expect(restored.options?.excellent).toEqual([0,2]);
    expect(restored.bonuses?.pAtk).toBe(24);
    expect(blade.bonuses?.pAtk).toBe(10);
  });
  it('normal permite mejora pero rechaza opciones; excelente requiere 1–6 opciones únicas', () => {
    expect(() => createItemInstance(blade, { level: 9 }, 'a')).not.toThrow();
    expect(() => createItemInstance(blade, { luck: true }, 'a')).toThrow();
    expect(() => createItemInstance(blade, { quality:'excellent' }, 'a')).toThrow();
    expect(() => createItemInstance(blade, { quality:'excellent', excellent:[0,0] }, 'a')).toThrow();
    expect(() => createItemInstance(blade, { quality:'excellent', excellent:[0,1,2,3,4,5] }, 'a')).not.toThrow();
    expect(() => createItemInstance(blade, { quality:'magic', additional:3 }, 'a')).toThrow();
  });
  it('respeta rarezas posibles y campos por categoría', () => {
    expect(() => createItemInstance({...blade,allowedQualities:['normal']}, {quality:'excellent',excellent:[0]}, 'a')).toThrow();
    expect(() => createItemInstance({...blade,category:'mascota',slot:'pet'}, {level:1}, 'a')).toThrow();
    expect(() => createItemInstance({...blade,category:'armadura',slot:'armor'}, {quality:'magic',skill:true}, 'a')).toThrow();
  });
  it('mejora segura hasta seis y suerte aumenta éxito de mejora riesgosa', () => {
    const six = resolveItemInstance(createItemInstance(blade,{level:6},'a'), {test_blade:blade});
    expect(upgradeItem(six,'upgrade_safe',()=>0)).toBeNull();
    const lucky = resolveItemInstance(createItemInstance(blade,{quality:'magic',level:6,luck:true},'a'), {test_blade:blade});
    expect(upgradeItem(lucky,'upgrade_risky',()=>0.7)?.level).toBe(7);
    expect(upgradeItem(six,'upgrade_risky',()=>0.7)?.level).toBe(5);
  });
  it('calcula efectos ofensivos y defensivos sin confundir sus índices', () => {
    const weapon = resolveItemInstance(createItemInstance(blade,{quality:'excellent',excellent:[0,4]},'a'), {test_blade:blade});
    expect(optionEffects(weapon).excellentChance).toBe(0.1);
    expect(optionEffects(weapon).hpOnKill).toBe(0.125);
    const armor = {...weapon, category:'armadura',slot:'armor' as const};
    expect(optionEffects(armor).hpPct).toBe(0.04);
    expect(optionEffects(armor).reflect).toBe(0.05);
  });
});
