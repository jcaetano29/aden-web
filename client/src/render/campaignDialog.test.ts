import { describe, it, expect } from 'vitest';
import { campaignDialog } from './campaignDialog.js';
import { getQuest, MEMORY_COMPLETE, MINES_COMPLETE, VEIL_COMPLETE } from '@aden/shared';

const at = (questId: string, questProgress = 0, level = 30) => ({ questId, questProgress, level });

describe('campaign dialog', () => {
  it('offers the next chapter only through its starter and checks the level', () => {
    const offer = campaignDialog(at(MEMORY_COMPLETE, 0, 15), 'smith')!;
    expect(offer.text).toContain(getQuest('f_arrival').intro); expect(offer.send).toBe(true); expect(offer.actionLabel).toBe('Iniciar expedición');
    expect(campaignDialog(at(MEMORY_COMPLETE, 0, 14), 'smith')!.send).toBe(false);
    const elsewhere = campaignDialog(at(MEMORY_COMPLETE), 'iria')!;
    expect(elsewhere.text).toContain('Herrero Dorne'); expect(elsewhere.send).toBe(false);
    expect(campaignDialog(at(VEIL_COMPLETE, 0, 12), 'maera')!.send).toBe(true);
  });
  it('delivers only to the receiver and reports progress otherwise', () => {
    expect(campaignDialog(at('f_diggers', 8), 'brenna')).toMatchObject({ actionLabel: 'Recibir recompensa', send: true });
    expect(campaignDialog(at('f_diggers', 3), 'brenna')!.text).toContain('(Progreso: 3/8)');
    expect(campaignDialog(at('f_diggers', 8), 'maera')).toMatchObject({ send: false });
    expect(campaignDialog(at('f_diggers', 8), 'maera')!.text).toContain('Capataz Brenna');
  });
  it('tells future NPCs it is not time yet and stays silent for non-campaign NPCs', () => {
    expect(campaignDialog(at('q3'), 'brenna')!.text).toContain('Todavía no es momento');
    expect(campaignDialog(at('q3'), 'merchant')).toBeNull();
    expect(campaignDialog(at(MINES_COMPLETE), 'brenna')!.text).toContain('Halden cayó');
  });
  it('offers the first quest only through Rowan', () => {
    expect(campaignDialog(at(''), 'elder')).toMatchObject({ actionLabel: 'Aceptar', send: true });
    expect(campaignDialog(at(''), 'maera')!.send).toBe(false);
  });
});
