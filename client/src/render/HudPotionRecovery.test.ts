// @vitest-environment jsdom
import { it,expect } from 'vitest';
import { Hud } from './Hud.js';
it('shows independent authoritative potion countdowns and returns to ready',()=>{
  const parent=document.createElement('div'),hud=new Hud(parent);
  hud.updatePotionRecovery(6750,0);
  expect(parent.querySelector('[data-potion-recovery]')?.textContent).toBe('Q · Vida: 7 s · Maná: lista');
  hud.updatePotionRecovery(0,1250);
  expect(parent.querySelector('[data-potion-recovery]')?.textContent).toBe('Q · Vida: lista · Maná: 2 s');
  hud.updatePotionRecovery(0,0);
  expect(parent.querySelector('[data-potion-recovery]')?.textContent).toBe('Q · Vida: lista · Maná: lista');
  hud.remove();
});
