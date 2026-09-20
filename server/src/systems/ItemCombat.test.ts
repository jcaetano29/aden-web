import { expect,it } from 'vitest';
import { emptyEffects } from '@aden/shared';
import { resolveAttack } from './CombatSystem.js';

it('aplica crítico, reducción, reflejo y esquive con RNG controlable',()=>{
  const attacker={x:0,z:0,hp:100,pAtk:100,pDef:0,attackCooldownMs:0,itemEffects:{...emptyEffects(),critChance:1}};
  const target={hp:500,pDef:0,itemEffects:{...emptyEffects(),reduction:.2,reflect:.1}};
  expect(resolveAttack(attacker,target,1,1,1000,()=>0.5)).toBe(120);
  expect(target.hp).toBe(380);expect(attacker.hp).toBe(88);
  target.itemEffects.dodge=1;
  expect(resolveAttack(attacker,target,1,1,1000,()=>0.5)).toBe(0);
  expect(target.hp).toBe(380);
});
