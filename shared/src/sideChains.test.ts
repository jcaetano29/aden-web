import { describe, it, expect } from 'vitest';
import { SIDE_CHAINS, getSideChain, sideChainForNpc, sideChainStep, nextSideChainStep } from './sideChains.js';
import { BOUNTIES, BOUNTY_ORDER } from './bounties.js';
import { VEIL_CONTRACTS, VEIL_CONTRACTS_COMPLETE } from './veilContracts.js';
import { getNpc } from './npcs.js';

describe('side chains', () => {
  it('mirrors Varek bounties as a repeatable kill chain', () => {
    const varek = getSideChain('varek')!;
    expect(varek).toMatchObject({ npcId: 'captain', kind: 'repeatable', minLevel: 0, announce: false });
    expect(varek.steps.map(s => s.id)).toEqual(BOUNTY_ORDER);
    expect(sideChainStep(varek, 'b_hunt')).toMatchObject({ objective: 'kill', targetId: '', amount: BOUNTIES.b_hunt.amount, rewardExp: BOUNTIES.b_hunt.rewardExp });
    expect(nextSideChainStep(varek, BOUNTY_ORDER[BOUNTY_ORDER.length - 1])).toBe(BOUNTY_ORDER[0]);
  });
  it('mirrors Boren errands as a one-time interact sequence', () => {
    const boren = sideChainForNpc('boren')!;
    expect(boren).toMatchObject({ id: 'boren', kind: 'sequence', minLevel: 10, announce: true, completeId: VEIL_CONTRACTS_COMPLETE });
    expect(boren.steps.map(s => [s.id, s.targetId, s.mapId])).toEqual(VEIL_CONTRACTS.map(c => [c.id, c.objectId, c.mapId]));
    expect(nextSideChainStep(boren, VEIL_CONTRACTS[0].id)).toBe(VEIL_CONTRACTS[1].id);
    expect(nextSideChainStep(boren, VEIL_CONTRACTS[2].id)).toBe(VEIL_CONTRACTS_COMPLETE);
    expect(nextSideChainStep(boren, VEIL_CONTRACTS_COMPLETE)).toBe(VEIL_CONTRACTS_COMPLETE);
  });
  it('binds every chain to a real NPC', () => {
    for (const chain of SIDE_CHAINS) expect(getNpc(chain.npcId).id).toBe(chain.npcId);
    expect(sideChainForNpc('healer')).toBeUndefined();
  });
});
