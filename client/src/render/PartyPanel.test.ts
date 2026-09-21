// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { PartyPanel, type PartyPanelData } from './PartyPanel.js';

const empty: PartyPanelData = { selfId: 'a', partyId: '', leaderId: '', members: [], candidates: [{ id: 'b', name: 'Beto', level: 4 }], invitation: null };
const member = (id: string) => ({ id, name: id, level: 4, mapId: 'bosque', hp: 50, maxHp: 100, mp: 10, maxMp: 30, dead: false });
function setup() {
  const handlers = { onInvite: vi.fn(), onRespond: vi.fn(), onLeave: vi.fn(), onKick: vi.fn() };
  return { panel: new PartyPanel(handlers), handlers };
}

describe('PartyPanel', () => {
  it('opens from the visible button and sends the selected candidate ID', () => {
    const { panel, handlers } = setup(); panel.update(empty);
    panel.button.click();
    expect(panel.el.style.display).not.toBe('none');
    panel.el.querySelector<HTMLButtonElement>('[data-party-invite]')!.click();
    expect(handlers.onInvite).toHaveBeenCalledWith('b');
  });

  it('makes incoming invitations visible and sends explicit accept or reject', () => {
    const { panel, handlers } = setup();
    panel.update({ ...empty, invitation: { inviterId: 'b', inviterName: '<img src=x>', expiresAt: Date.now() + 30000 } });
    expect(panel.el.style.display).not.toBe('none');
    expect(panel.el.textContent).toContain('<img src=x>'); expect(panel.el.querySelector('img')).toBeNull();
    panel.el.querySelector<HTMLButtonElement>('[data-party-accept]')!.click();
    expect(handlers.onRespond).toHaveBeenCalledWith('b', true);
    panel.update({ ...empty, invitation: { inviterId: 'c', inviterName: 'Otro', expiresAt: Date.now() + 30000 } });
    panel.el.querySelector<HTMLButtonElement>('[data-party-reject]')!.click();
    expect(handlers.onRespond).toHaveBeenCalledWith('c', false);
    panel.update(empty); expect(panel.el.querySelector('[data-party-accept]')).toBeNull();
  });

  it('shows live resource bars and only gives the leader kick controls', () => {
    const { panel, handlers } = setup();
    const data = { ...empty, partyId: 'p', leaderId: 'a', members: [member('a'), member('b')] };
    panel.update(data);
    expect(panel.roster.textContent).toContain('50/100');
    const kick = panel.el.querySelector<HTMLButtonElement>('[data-party-kick]')!;
    kick.click(); expect(handlers.onKick).toHaveBeenCalledWith('b');
    panel.update({ ...data, selfId: 'b', members: [member('a'), { ...member('b'), hp: 0, dead: true }] });
    expect(panel.roster.textContent).toContain('Muerto');
    expect(panel.el.querySelector('[data-party-kick]')).toBeNull();
    expect(panel.el.querySelector('[data-party-invite]')).toBeNull();
    panel.el.querySelector<HTMLButtonElement>('[data-party-leave]')!.click();
    expect(handlers.onLeave).toHaveBeenCalledOnce();
    panel.update(empty); expect(panel.roster.style.display).toBe('none');
  });

  it('keeps action buttons and keyboard focus stable while resources change', () => {
    const { panel } = setup();
    const data = { ...empty, partyId: 'p', leaderId: 'a', members: [member('a'), member('b')] };
    panel.update(data);
    const button = panel.el.querySelector('[data-party-kick]');
    panel.update({ ...data, members: [member('a'), { ...member('b'), hp: 42 }] });
    expect(panel.el.querySelector('[data-party-kick]')).toBe(button);
    expect(panel.roster.textContent).toContain('42/100');
  });
});
