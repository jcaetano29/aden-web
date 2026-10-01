import { describe, expect, it } from 'vitest';
import { GameState } from '../state/GameState.js';
import { PlayerState } from '../state/PlayerState.js';
import { DroppedItemState } from '../state/DroppedItemState.js';
import { PartySystem } from './PartySystem.js';
import { reservePartyLoot } from './PartyLootSystem.js';
import { tryPickup } from './LootSystem.js';

function setup() {
  const state = new GameState();
  for (const id of ['a', 'b', 'c', 'outside']) {
    const p = new PlayerState();
    Object.assign(p, { name: id, loaded: true, hp: 100, mapId: 'bosque', x: 10, z: 10 });
    state.players.set(id, p);
  }
  const parties = new PartySystem(state, () => {});
  for (const id of ['b', 'c']) { parties.invite('a', id); parties.respond(id, 'a', true); }
  const partyId = state.players.get('a')!.partyId;
  const party = state.parties.get(partyId)!;
  const drop = () => {
    const d = new DroppedItemState();
    Object.assign(d, { itemTemplateId: 'bone', qty: 1, mapId: 'bosque', x: 10, z: 10, despawnMs: 100000 });
    state.droppedItems.set(`drop_${state.droppedItems.size}`, d);
    return d;
  };
  return { state, parties, partyId, party, drop };
}

describe('party loot turns', () => {
  it('rotates over eligible members across kills, reserves for 30 seconds and enforces pickup', () => {
    const { state, partyId, drop } = setup();
    const first = [drop(), drop()];
    reservePartyLoot(state, partyId, first, ['c', 'b', 'a']);
    const second = [drop(), drop()];
    reservePartyLoot(state, partyId, second, ['a', 'b', 'c']);
    expect([...first, ...second].map(d => d.reservedPlayerId)).toEqual(['a', 'b', 'c', 'a']);
    expect(first[0]).toMatchObject({ reservedFor: 'a', reservedMs: 30000 });
    expect(tryPickup(state, 'b', 'drop_0')).toBe(false);
    expect(tryPickup(state, 'a', 'drop_0')).toBe(true);
    second[1].reservedMs = 0;
    expect(tryPickup(state, 'outside', 'drop_3')).toBe(true);
  });

  it('keeps the next member turn when an earlier member leaves and skips ineligible recipients', () => {
    const { state, parties, partyId, drop } = setup();
    reservePartyLoot(state, partyId, [drop()], ['a', 'b', 'c']);
    parties.leave('a');
    const next = drop(); reservePartyLoot(state, partyId, [next], ['b', 'c']);
    expect(next.reservedPlayerId).toBe('b');
    const another = drop(); reservePartyLoot(state, partyId, [another], ['b']);
    expect(another.reservedPlayerId).toBe('b');
  });

  it.each(['dead', 'hp', 'unloaded', 'map', 'departed', 'disconnected'])('never reserves to an ineligible %s member', kind => {
    const { state, partyId, drop } = setup();
    const a = state.players.get('a')!;
    if (kind === 'dead') a.dead = true;
    if (kind === 'hp') a.hp = 0;
    if (kind === 'unloaded') a.loaded = false;
    if (kind === 'map') a.mapId = 'pueblo';
    if (kind === 'departed') a.partyId = '';
    if (kind === 'disconnected') state.players.delete('a');
    const d = drop(); reservePartyLoot(state, partyId, [d], ['a', 'outside']);
    expect(d.reservedMs).toBe(0);
    expect(d.reservedPlayerId).toBe('');
  });

  it('leaves free loot, manual discards and existing invasion reservations untouched without consuming turns', () => {
    const { state, parties, partyId, drop } = setup();
    const free = drop(); parties.setLootMode('a', 'free');
    reservePartyLoot(state, partyId, [free], ['a', 'b', 'c']);
    expect(free.reservedMs).toBe(0);
    parties.setLootMode('a', 'round_robin');
    const manual = drop(); manual.droppedBy = 'a';
    const invasion = drop(); invasion.reservedGuildId = 'guild'; invasion.reservedMs = 60000; invasion.reservedFor = 'Guild';
    const personal = drop(); personal.reservedPlayerId = 'outside'; personal.reservedMs = 60000;
    const captured = drop(); captured.reservedPartyMembers.add('outside'); captured.reservedMs = 60000;
    const ordinary = drop();
    reservePartyLoot(state, partyId, [manual, invasion, personal, captured, ordinary], ['a', 'b', 'c']);
    expect(manual.reservedMs).toBe(0);
    expect(invasion).toMatchObject({ reservedGuildId: 'guild', reservedFor: 'Guild', reservedMs: 60000, reservedPlayerId: '' });
    expect(personal.reservedPlayerId).toBe('outside');
    expect(captured.reservedMs).toBe(60000);
    expect(ordinary.reservedPlayerId).toBe('a');
  });
});
