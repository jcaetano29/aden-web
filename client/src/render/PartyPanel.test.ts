// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { PartyPanel, type PartyPanelData } from './PartyPanel.js';

const empty: PartyPanelData = { selfId: 'a', partyId: '', leaderId: '', members: [], candidates: [{ id: 'b', name: 'Beto', level: 4 }], invitation: null };
const member = (id: string) => ({ id, name: id, level: 4, mapId: 'bosque', hp: 50, maxHp: 100, mp: 10, maxMp: 30, dead: false });
function setup() {
  const handlers = { onInvite: vi.fn(), onRespond: vi.fn(), onLeave: vi.fn(), onKick: vi.fn(), onSelectAlly: vi.fn(), onLootMode: vi.fn() };
  return { panel: new PartyPanel(handlers), handlers };
}
afterEach(() => document.body.replaceChildren());

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

  it('selects companions for support and clears the selection with self support', () => {
    const { panel, handlers } = setup();
    const data: PartyPanelData = { ...empty, partyId: 'p', leaderId: 'a', selectedAllyId: '', members: [member('a'), { ...member('b'), className: 'mage' }] };
    panel.update(data);
    const ally = panel.roster.querySelector<HTMLButtonElement>('[data-party-ally="b"]');
    expect(ally).not.toBeNull();
    ally!.click();
    expect(handlers.onSelectAlly).toHaveBeenCalledWith('b');
    expect(panel.roster.textContent).toContain('Mago');
    panel.update({ ...data, selectedAllyId: 'b' });
    expect(ally!.getAttribute('aria-pressed')).toBe('true');
    panel.roster.querySelector<HTMLButtonElement>('[data-party-self]')!.click();
    expect(handlers.onSelectAlly).toHaveBeenLastCalledWith('');
  });

  it('updates resources and support effects without replacing the focused support control', () => {
    const { panel } = setup(); panel.mount(document.body);
    const data: PartyPanelData = { ...empty, partyId: 'p', leaderId: 'a', members: [member('a'), member('b')] };
    panel.update(data);
    const ally = panel.roster.querySelector<HTMLButtonElement>('[data-party-ally="b"]');
    expect(ally).not.toBeNull();
    ally!.focus();
    panel.update({ ...data, selectedAllyId: 'b', members: [member('a'), { ...member('b'), hp: 42, protectedMs: 4200, rallyMs: 2200 }] });
    expect(panel.roster.querySelector('[data-party-ally="b"]')).toBe(ally);
    expect(document.activeElement).toBe(ally);
    expect(panel.roster.querySelector('[aria-label="Vida de b"]')?.getAttribute('aria-valuenow')).toBe('42');
    expect(panel.roster.textContent).toContain('Protección');
    expect(panel.roster.textContent).toContain('Furia');
    panel.update(data);
    expect(panel.roster.textContent).not.toContain('Protección');
    expect(panel.roster.textContent).not.toContain('Furia');
  });

  it('disables support for dead companions, other maps and the Castle', () => {
    const { panel, handlers } = setup();
    const data: PartyPanelData = { ...empty, partyId: 'p', leaderId: 'a', members: [member('a'), member('b')] };
    for (const members of [
      [member('a'), { ...member('b'), dead: true }],
      [member('a'), { ...member('b'), hp: 0 }],
      [member('a'), { ...member('b'), mapId: 'ruinas' }],
      [{ ...member('a'), dead: true }, member('b')],
      [{ ...member('a'), mapId: 'castillo' }, { ...member('b'), mapId: 'castillo' }],
    ]) {
      panel.update({ ...data, members });
      const ally = panel.roster.querySelector<HTMLButtonElement>('[data-party-ally="b"]');
      expect(ally).not.toBeNull();
      expect(ally!.disabled).toBe(true);
      ally!.click();
    }
    expect(handlers.onSelectAlly).not.toHaveBeenCalled();
    panel.update(data);
    expect(panel.roster.querySelector<HTMLButtonElement>('[data-party-ally="b"]')!.disabled).toBe(false);
  });

  it('lets only the leader change loot policy while everyone can read it', () => {
    const { panel, handlers } = setup();
    const data: PartyPanelData = { ...empty, partyId: 'p', leaderId: 'a', lootMode: 'round_robin', members: [member('a'), member('b')] };
    panel.update(data);
    const select = panel.el.querySelector<HTMLSelectElement>('[data-party-loot-mode]');
    expect(select).not.toBeNull();
    expect(select!.value).toBe('round_robin');
    select!.value = 'free'; select!.dispatchEvent(new Event('change'));
    expect(handlers.onLootMode).toHaveBeenCalledWith('free');
    panel.update({ ...data, selfId: 'b', lootMode: 'free' });
    expect(panel.el.querySelector('[data-party-loot-mode]')).toBeNull();
    expect(panel.el.textContent).toContain('Botín: Libre');
    expect(panel.roster.textContent).toContain('Botín: Libre');
  });
});
