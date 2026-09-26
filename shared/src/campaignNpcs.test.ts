import { describe, it, expect } from 'vitest';
import { isCampaignNpc, npcFirstAppearance, chapterForComplete, campaignRoleNow } from './campaignNpcs.js';
import { MEMORY_COMPLETE } from './monastery.js';
import { MINES_COMPLETE } from './mines.js';

describe('campaign NPCs', () => {
  it('knows who takes part in the campaign', () => {
    for (const id of ['elder', 'maera', 'iria', 'smith', 'brenna']) expect(isCampaignNpc(id), id).toBe(true);
    for (const id of ['merchant', 'healer', 'captain', 'boren', 'tobias']) expect(isCampaignNpc(id), id).toBe(false);
  });
  it('finds where each NPC first appears', () => {
    expect(npcFirstAppearance('elder')).toBe('q1');
    expect(npcFirstAppearance('maera')).toBe('a2_arrival');
    expect(npcFirstAppearance('smith')).toBe(MEMORY_COMPLETE);
    expect(npcFirstAppearance('brenna')).toBe('f_arrival');
    expect(npcFirstAppearance('merchant')).toBeNull();
  });
  it('maps complete states to their chapter and tells when an NPC has a role now', () => {
    expect(chapterForComplete(MINES_COMPLETE)?.id).toBe('mines');
    expect(chapterForComplete('q1')).toBeNull();
    expect(campaignRoleNow(MEMORY_COMPLETE, 'smith')).toBe(true);
    expect(campaignRoleNow('q3', 'smith')).toBe(false);
    expect(campaignRoleNow('f_diggers', 'brenna')).toBe(true);
    expect(campaignRoleNow('f_diggers', 'smith')).toBe(false);
  });
});
