import { describe, it, expect } from 'vitest';
import { GameState } from '../state/GameState.js';
import { PlayerState } from '../state/PlayerState.js';
import { PartySystem } from './PartySystem.js';

function setup() {
  const state = new GameState();
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) {
    const p = new PlayerState(); p.name = id; p.loaded = true; state.players.set(id, p);
  }
  let now = 1000;
  const notices: { id: string; invite: unknown }[] = [];
  const system = new PartySystem(state, (id, invite) => notices.push({ id, invite }), () => now);
  return { state, system, notices, advance: () => { now += 30001; } };
}

describe('PartySystem', () => {
  it('requires a live invitation and consent before grouping players', () => {
    const { state, system } = setup();
    expect(system.respond('b', 'a', true).success).toBe(false);
    expect(system.invite('a', 'a').success).toBe(false);
    expect(system.invite('a', 'b').success).toBe(true);
    expect(state.players.get('a')!.partyId).toBe('');
    expect(system.respond('b', 'c', true).success).toBe(false);
    expect(system.respond('b', 'a', true).success).toBe(true);
    const partyId = state.players.get('a')!.partyId;
    expect(partyId).not.toBe('');
    expect(state.players.get('b')!.partyId).toBe(partyId);
    expect(state.parties.get(partyId)!.leaderId).toBe('a');
    expect(system.respond('b', 'a', true).success).toBe(false);
  });

  it('only the leader can invite or kick and capacity is checked on acceptance', () => {
    const { state, system } = setup();
    system.invite('a', 'b'); system.respond('b', 'a', true);
    expect(system.invite('b', 'c').success).toBe(false);
    expect(system.kick('b', 'a').success).toBe(false);
    expect(system.kick('a', 'a').success).toBe(false);
    for (const id of ['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']) expect(system.invite('a', id).success).toBe(true);
    for (const id of ['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) expect(system.respond(id, 'a', true).success).toBe(true);
    expect(system.respond('k', 'a', true).success).toBe(false);
    expect(state.players.get('k')!.partyId).toBe('');
    expect(system.kick('a', 'c').success).toBe(true);
    expect(state.players.get('c')!.partyId).toBe('');
  });

  it('rejects expired invitations and clears private notifications on expiry and rejection', () => {
    const { system, notices, advance } = setup();
    system.invite('a', 'b');
    expect(system.invite('c', 'b').success).toBe(false);
    advance(); system.expire();
    expect(notices.at(-1)).toEqual({ id: 'b', invite: null });
    expect(system.respond('b', 'a', true).success).toBe(false);
    system.invite('a', 'b');
    expect(system.respond('b', 'a', false).success).toBe(true);
    expect(system.respond('b', 'a', true).success).toBe(false);
  });

  it('transfers leadership in join order and dissolves a group of one', () => {
    const { state, system } = setup();
    system.invite('a', 'c'); system.respond('c', 'a', true);
    system.invite('a', 'b'); system.respond('b', 'a', true);
    system.invite('a', 'd');
    const partyId = state.players.get('a')!.partyId;
    system.leave('a');
    expect(state.parties.get(partyId)!.leaderId).toBe('c');
    expect(system.respond('d', 'a', true).success).toBe(false);
    system.leave('c');
    expect(state.parties.size).toBe(0);
    expect(state.players.get('b')!.partyId).toBe('');
  });

  it('invalidates invitations issued by someone who joins another group', () => {
    const { system } = setup();
    system.invite('a', 'b'); system.invite('c', 'a'); system.respond('a', 'c', true);
    expect(system.respond('b', 'a', true).success).toBe(false);
  });
});
