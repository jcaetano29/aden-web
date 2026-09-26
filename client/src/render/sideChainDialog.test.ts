import { describe, it, expect } from 'vitest';
import { sideChainForNpc } from '@aden/shared';
import { sideChainDialog } from './sideChainDialog.js';

describe('side chain dialog', () => {
  const halden = sideChainForNpc('halden_npc')!, tobias = sideChainForNpc('tobias')!;
  it('offers the first contract of a repeatable chain to someone who never took it', () => {
    const d = sideChainDialog(halden, undefined);
    expect(d).toMatchObject({ actionLabel: 'Aceptar encargo', send: true });
    expect(d.text).toContain(halden.steps[0].intro);
    expect(d.text).toContain('Recompensa: 300 oro.');
  });
  it('asks to keep going while in progress and delivers when the objective is met', () => {
    expect(sideChainDialog(halden, { id: 'h_imps', progress: 3 })).toMatchObject({ actionLabel: 'Seguir buscando', send: false });
    const ready = sideChainDialog(halden, { id: 'h_imps', progress: 8 });
    expect(ready).toMatchObject({ actionLabel: 'Entregar encargo', send: true });
    expect(ready.text).toContain(halden.steps[0].done);
  });
  it('closes a finished sequence with its farewell', () => {
    expect(sideChainDialog(tobias, { id: tobias.completeId!, progress: 0 })).toEqual({ text: tobias.finishedText ?? '', actionLabel: 'Gracias', send: false });
  });
});
