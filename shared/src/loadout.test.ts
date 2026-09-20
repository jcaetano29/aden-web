import { it, expect } from 'vitest';
import { ITEM_TEMPLATES } from './items.js';
import { canEquipItem, loadoutEffects, setBonuses } from './loadout.js';
import { createItemInstance } from './itemOptions.js';

it('valida clase, nivel y manos en ambos sentidos', () => {
  ITEM_TEMPLATES.test_two = {id:'test_two',name:'Test',type:'equipment',stackable:false,slot:'weapon',hands:'2H',classes:['barbarian'],requiredLevel:3};
  ITEM_TEMPLATES.test_shield = {id:'test_shield',name:'Test',type:'equipment',stackable:false,slot:'shield'};
  expect(canEquipItem('test_two','mage',5,{})).toBe(false);
  expect(canEquipItem('test_two','barbarian',2,{})).toBe(false);
  expect(canEquipItem('test_two','barbarian',5,{shield:'test_shield'})).toBe(false);
  expect(canEquipItem('test_shield','knight',5,{weapon:'test_two'})).toBe(false);
  expect(canEquipItem('test_two','barbarian',5,{})).toBe(true);
  delete ITEM_TEMPLATES.test_two; delete ITEM_TEMPLATES.test_shield;
});
it('conjuntos cuentan piezas distintas en sus slots y aumentan a 2/3/5', () => {
  const slots = ['helmet','armor','gloves','pants','boots'] as const;
  const eq: Record<string,string> = {};
  slots.forEach((slot,i) => { const id=`test_set_${i}`; ITEM_TEMPLATES[id]={id,name:id,type:'equipment',stackable:false,slot,setId:'test',category:'armadura'}; eq[slot]=id; });
  expect(setBonuses({helmet:eq.helmet}).pDef).toBe(0);
  expect(setBonuses({helmet:eq.helmet,armor:eq.armor}).pDef).toBe(2);
  expect(setBonuses({helmet:eq.helmet,armor:eq.armor,gloves:eq.gloves}).pDef).toBe(4);
  expect(setBonuses(eq).pDef).toBe(8);
  expect(setBonuses({helmet:eq.helmet,armor:eq.helmet}).pDef).toBe(0);
  Object.values(eq).forEach(id=>delete ITEM_TEMPLATES[id]);
});
it('limita acumulaciones defensivas para evitar invulnerabilidad', () => {
  const base = {id:'test_options',name:'Test',type:'equipment' as const,stackable:false,slot:'armor' as const,category:'armadura',allowedQualities:['excellent' as const]};
  ITEM_TEMPLATES[base.id]=base;
  const id=createItemInstance(base,{quality:'excellent',excellent:[2,3,4]},'a');
  expect(loadoutEffects({armor:id,helmet:id}).dodge).toBe(.1);
  delete ITEM_TEMPLATES[base.id];
});
