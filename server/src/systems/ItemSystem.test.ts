import { it, expect } from 'vitest';
import { PlayerState } from '../state/PlayerState.js';
import { ITEM_TEMPLATES, getItem, CATALOG_ITEMS,createItemInstance } from '@aden/shared';
import { grantItem, equipItem, useInventoryItem, consumeAmmo } from './ItemSystem.js';

it('crea ejemplares distintos, mueve equipo y rechaza clases ajenas',()=>{
  ITEM_TEMPLATES.test_weapon={id:'test_weapon',name:'Test',type:'equipment',stackable:false,slot:'weapon',category:'arma',allowedQualities:['normal','magic','excellent'],classes:['knight']};
  const p=new PlayerState(); grantItem(p,'test_weapon',2);
  const ids=[...p.inventory.keys()]; expect(ids).toHaveLength(2);
  p.className='mage'; expect(equipItem(p,ids[0])).toBe(false);
  p.className='knight'; expect(equipItem(p,ids[0])).toBe(true);
  expect(p.equipment.get('weapon')).toBe(ids[0]); expect(p.inventory.has(ids[0])).toBe(false);
  expect(equipItem(p,ids[1])).toBe(true); expect(p.inventory.has(ids[0])).toBe(true);
  delete ITEM_TEMPLATES.test_weapon;
});
it('no consume maná a máximo ni permite usar objetos que no posee',()=>{
  ITEM_TEMPLATES.test_mana={id:'test_mana',name:'Test',type:'consumable',stackable:true,mana:30,useEffect:'mana'};
  const p=new PlayerState();p.maxMp=60;p.mp=60;grantItem(p,'test_mana',2);
  expect(useInventoryItem(p,'test_mana')).toBe(false);expect(p.inventory.get('test_mana')?.qty).toBe(2);
  p.mp=5;expect(useInventoryItem(p,'test_mana')).toBe(true);expect(p.mp).toBe(35);
  delete ITEM_TEMPLATES.test_mana;
});
it('mejora sólo un objeto propio y conserva el resto del inventario',()=>{
  ITEM_TEMPLATES.test_weapon={id:'test_weapon',name:'Test',type:'equipment',stackable:false,slot:'weapon',category:'arma',allowedQualities:['normal','magic','excellent']};
  ITEM_TEMPLATES.test_jewel={id:'test_jewel',name:'Test',type:'consumable',stackable:true,useEffect:'upgrade_safe'};
  const p=new PlayerState();grantItem(p,'test_weapon',1);grantItem(p,'test_jewel',2);
  const id=[...p.inventory.keys()][0];
  expect(useInventoryItem(p,'test_jewel','test_weapon~fake')).toBe(false);
  expect(useInventoryItem(p,'test_jewel',id)).toBe(true);
  expect(p.inventory.has(id)).toBe(false);
  const improved=[...p.inventory.keys()].find(k=>k!=='test_jewel')!;
  expect(getItem(improved).options?.level).toBe(1);expect(p.inventory.get('test_jewel')?.qty).toBe(1);
  delete ITEM_TEMPLATES.test_weapon;delete ITEM_TEMPLATES.test_jewel;
});
it('requiere munición compatible y consume una unidad por disparo',()=>{
  ITEM_TEMPLATES.test_bow={id:'test_bow',name:'Test',type:'equipment',stackable:false,slot:'weapon',ammo:'arrow'};
  ITEM_TEMPLATES.test_arrow={id:'test_arrow',name:'Test',type:'material',stackable:true,category:'municion',ammo:'arrow'};
  const p=new PlayerState();p.equipment.set('weapon','test_bow');
  expect(consumeAmmo(p)).toBe(false);grantItem(p,'test_arrow',1);
  expect(consumeAmmo(p)).toBe(true);expect(consumeAmmo(p)).toBe(false);
  delete ITEM_TEMPLATES.test_bow;delete ITEM_TEMPLATES.test_arrow;
});
it('un Explorador puede usar armas cuerpo a cuerpo permitidas sin munición',()=>{
  const p=new PlayerState();p.className='ranger';p.equipment.set('weapon','worn_sword');
  expect(consumeAmmo(p)).toBe(true);
});

it('forja armas rituales y alas consumiendo ingrediente y oro, sin perder opciones de otros objetos',()=>{
  const byRef=(ref:string)=>Object.values(CATALOG_ITEMS).find(i=>i.ref_origen===ref)!;
  const p=new PlayerState();p.className='ranger';p.level=40;p.gold=1000;
  const jewel=byRef('jewel_of_chaos');const bow=byRef('elven_bow');
  const id=createItemInstance(bow,{level:6},'craft');grantItem(p,id,1);grantItem(p,jewel.id,2);
  expect(useInventoryItem(p,jewel.id,id)).toBe(true);
  const crafted=[...p.inventory.keys()].find(k=>getItem(k).ref_origen==='chaos_nature_bow');
  expect(crafted).toBeDefined();expect(p.gold).toBe(500);expect(p.inventory.has(id)).toBe(false);
  const upgraded=createItemInstance(byRef('chaos_nature_bow'),{level:9},'wings');grantItem(p,upgraded,1);
  expect(useInventoryItem(p,jewel.id,upgraded)).toBe(true);
  expect([...p.inventory.keys()].some(k=>getItem(k).ref_origen==='wings_of_elf')).toBe(true);
  expect(p.gold).toBe(0);
});
