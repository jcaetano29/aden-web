import { describe, expect, it, vi } from 'vitest';
import { MessageType } from '@aden/shared';
import { NetworkClient } from './NetworkClient.js';

const player = (name: string) => ({ name, level: 8, className: 'mage', mapId: 'bosque', partyId: 'party', hp: 50, maxHp: 100, mp: 40, maxMp: 80, dead: false, targetId: 'enemy', cooperation: { protectedMs: 0, protectedBy: '', rallyMs: 0 } });
function setup() {
  const net = new NetworkClient();
  const players = new Map([['self', player('Yo')], ['ally', player('Compañero')], ['stranger', { ...player('Otro'), partyId: '' }]]);
  const parties = new Map([['party', { leaderId: 'self', members: ['self', 'ally'], lootMode: 'round_robin' }]]);
  const send = vi.fn();
  (net as any).room = { sessionId: 'self', state: { players, parties }, send };
  return { net, players, parties, send };
}

describe('party cooperation networking', () => {
  it('keeps support separate from the enemy target and only sends allyId for support skills', () => {
    const { net, players, send } = setup();
    net.setSupportTarget('ally');
    expect(net.getSupportTarget()).toBe('ally');
    expect(send).not.toHaveBeenCalled();
    net.sendSetTarget('another-enemy');
    net.sendUseSkill('arcane_mend');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'arcane_mend', allyId: 'ally' });
    net.sendUseSkill('guard');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'guard', allyId: 'ally' });
    net.sendUseSkill('fireball');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'fireball' });
    expect(net.getSupportTarget()).toBe('ally');
    expect(players.get('self')!.targetId).toBe('enemy');
    net.setSupportTarget('self');
    net.sendUseSkill('arcane_mend');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'arcane_mend' });
    net.setSupportTarget('ally'); net.setSupportTarget('');
    expect(net.getSupportTarget()).toBe('');
  });

  it.each(['stranger', 'missing'])('rejects an invalid selected ally %s', id => {
    const { net, send } = setup();
    net.setSupportTarget(id);
    expect(net.getSupportTarget()).toBe('');
    net.sendUseSkill('arcane_mend');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'arcane_mend' });
  });

  it.each(['death', 'zero hp', 'map', 'leave', 'removed member', 'missing party', 'disconnect', 'self death', 'self zero hp', 'self leave', 'castle'])('clears stale support on %s before another cast', reason => {
    const { net, players, parties, send } = setup();
    net.setSupportTarget('ally');
    const ally = players.get('ally')!, self = players.get('self')!;
    if (reason === 'death') ally.dead = true;
    if (reason === 'zero hp') ally.hp = 0;
    if (reason === 'map') ally.mapId = 'ruinas';
    if (reason === 'leave') ally.partyId = '';
    if (reason === 'removed member') parties.get('party')!.members = ['self'];
    if (reason === 'missing party') parties.clear();
    if (reason === 'disconnect') players.delete('ally');
    if (reason === 'self death') self.dead = true;
    if (reason === 'self zero hp') self.hp = 0;
    if (reason === 'self leave') self.partyId = '';
    if (reason === 'castle') self.mapId = ally.mapId = 'castillo';
    net.sendUseSkill('arcane_mend');
    expect(send).toHaveBeenLastCalledWith(MessageType.UseSkill, { skillId: 'arcane_mend' });
    expect(net.getSupportTarget()).toBe('');
    Object.assign(ally, player('Compañero')); Object.assign(self, player('Yo'));
    expect(net.getSupportTarget()).toBe('');
  });

  it('exposes authoritative class, effects and loot mode with the current support selection', () => {
    const { net, players } = setup();
    Object.assign(players.get('ally')!.cooperation, { protectedMs: 4200, protectedBy: 'self', rallyMs: 2100 });
    net.setSupportTarget('ally');
    const data = net.getPartyPanelData();
    expect(data.selectedAllyId).toBe('ally');
    expect(data.lootMode).toBe('round_robin');
    expect(data.members.find(member => member.id === 'ally')).toMatchObject({ className: 'mage', protectedMs: 4200, rallyMs: 2100 });
    players.get('ally')!.dead = true;
    expect(net.getPartyPanelData().selectedAllyId).toBe('');
  });

  it('sends a loot mode change without locally modifying authoritative state', () => {
    const { net, parties, send } = setup();
    net.sendPartyLootMode('free');
    expect(send).toHaveBeenCalledWith('partyLootMode', { mode: 'free' });
    expect(parties.get('party')!.lootMode).toBe('round_robin');
  });
});
