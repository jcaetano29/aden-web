import { it,expect } from 'vitest';
import { chooseHealthPotion,potionResource } from './potions.js';
it('Q chooses a useful size, uses greater potions alone and ignores empty stacks',()=>{
  const inventory=[{itemTemplateId:'health_potion',qty:1},{itemTemplateId:'greater_potion',qty:2}];
  expect(chooseHealthPotion(inventory,30,15,'knight')).toBe('health_potion');
  expect(chooseHealthPotion(inventory,120,15,'knight')).toBe('greater_potion');
  expect(chooseHealthPotion(inventory,500,15,'knight')).toBe('greater_potion');
  inventory[0].qty=0;expect(chooseHealthPotion(inventory,20,15,'knight')).toBe('greater_potion');
  expect(chooseHealthPotion(inventory,0,15,'knight')).toBeUndefined();
  expect(potionResource('health_potion')).toBe('hp'); expect(potionResource('greater_potion')).toBe('hp');
  expect(potionResource('unknown')).toBeUndefined();
});
