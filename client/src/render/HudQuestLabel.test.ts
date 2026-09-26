// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { MEMORY_COMPLETE, MINES_COMPLETE, FORGE_COMPLETE } from '@aden/shared';
import { Hud } from './Hud.js';

it('names every closed chapter instead of reporting an unknown quest', () => {
  const parent = document.createElement('div'), hud = new Hud(parent);
  const label = (questId: string) => { hud.update(100, 100, 50, 50, false, 0, 20, 0, questId); return parent.textContent ?? ''; };
  expect(label(MINES_COMPLETE)).toContain('✦ Las Minas de Hierro Negro · completadas');
  expect(label(FORGE_COMPLETE)).toContain('✦ La Fragua Antigua · completada');
  expect(label(MEMORY_COMPLETE)).toContain('✦ La Memoria del Velo completada');
  expect(label(FORGE_COMPLETE)).not.toContain('Misión desconocida');
  hud.remove();
});
