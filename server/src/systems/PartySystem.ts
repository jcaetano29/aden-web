import { randomUUID } from 'node:crypto';
import { PARTY_INVITE_MS, PARTY_MAX_MEMBERS, type PartyInvitation } from '@aden/shared';
import type { GameState } from '../state/GameState.js';
import { PartyState } from '../state/PartyState.js';

const result = (success: boolean, text: string) => ({ success, text });

/** Session-only groups. All transitions run synchronously on the room server. */
export class PartySystem {
  private readonly invitations = new Map<string, PartyInvitation>();

  constructor(
    private readonly state: GameState,
    private readonly notify: (id: string, invite: PartyInvitation | null) => void,
    private readonly now: () => number = Date.now,
  ) {}

  expire(): void {
    for (const [id, invite] of this.invitations) {
      if (invite.expiresAt <= this.now()) this.clearInvitation(id);
    }
  }

  private clearInvitation(id: string): void {
    if (this.invitations.delete(id)) this.notify(id, null);
  }

  private cancelIssuedBy(id: string): void {
    for (const [target, invite] of this.invitations) {
      if (invite.inviterId === id) this.clearInvitation(target);
    }
  }

  invite(senderId: string, targetId: string) {
    this.expire();
    const sender = this.state.players.get(senderId), target = this.state.players.get(targetId);
    if (!sender?.loaded || !target?.loaded || senderId === targetId) return result(false, 'Jugador no disponible.');
    if (target.partyId) return result(false, 'Ese jugador ya tiene party.');
    if (sender.mapId !== target.mapId) return result(false, 'El jugador debe estar en tu mapa para invitarlo.');
    const party = this.state.parties.get(sender.partyId);
    if (party && party.leaderId !== senderId) return result(false, 'Solo el líder puede invitar.');
    if (party && party.members.length >= PARTY_MAX_MEMBERS) return result(false, 'La party está llena.');
    if (this.invitations.has(targetId)) return result(false, 'Ese jugador tiene una invitación pendiente.');
    const invitation = { inviterId: senderId, inviterName: sender.name, expiresAt: this.now() + PARTY_INVITE_MS };
    this.invitations.set(targetId, invitation);
    this.notify(targetId, invitation);
    return result(true, `Invitación enviada a ${target.name}.`);
  }

  respond(targetId: string, inviterId: string, accept: boolean) {
    this.expire();
    const invite = this.invitations.get(targetId);
    if (!invite || invite.inviterId !== inviterId) return result(false, 'La invitación ya no está disponible.');
    this.clearInvitation(targetId);
    if (!accept) return result(true, 'Invitación rechazada.');
    const sender = this.state.players.get(inviterId), target = this.state.players.get(targetId);
    if (!sender?.loaded || !target?.loaded || target.partyId) return result(false, 'No se pudo unir a la party.');
    let party = this.state.parties.get(sender.partyId);
    if (party && (party.leaderId !== inviterId || party.members.length >= PARTY_MAX_MEMBERS)) {
      return result(false, 'La party cambió o está llena.');
    }
    if (!party) {
      party = new PartyState(); party.leaderId = inviterId; party.members.push(inviterId);
      sender.partyId = randomUUID(); this.state.parties.set(sender.partyId, party);
      this.clearInvitation(inviterId);
    }
    this.cancelIssuedBy(targetId);
    target.partyId = sender.partyId;
    party.members.push(targetId);
    return result(true, 'Te uniste a la party.');
  }

  leave(id: string) {
    this.clearInvitation(id);
    this.cancelIssuedBy(id);
    const player = this.state.players.get(id);
    const partyId = player?.partyId ?? '';
    const party = this.state.parties.get(partyId);
    if (player) player.partyId = '';
    if (!party) return result(false, 'No estás en una party.');
    const index = party.members.indexOf(id);
    if (index >= 0) party.members.splice(index, 1);
    if (party.members.length < 2) {
      for (const memberId of party.members) {
        const member = this.state.players.get(memberId);
        if (member) member.partyId = '';
        this.cancelIssuedBy(memberId);
      }
      this.state.parties.delete(partyId);
    } else if (party.leaderId === id) {
      party.leaderId = party.members[0]!;
    }
    return result(true, 'Saliste de la party.');
  }

  kick(leaderId: string, targetId: string) {
    const leader = this.state.players.get(leaderId), target = this.state.players.get(targetId);
    const party = this.state.parties.get(leader?.partyId ?? '');
    if (!party || party.leaderId !== leaderId || leaderId === targetId || target?.partyId !== leader?.partyId) {
      return result(false, 'Solo el líder puede expulsar a un compañero.');
    }
    this.leave(targetId);
    return result(true, 'Jugador expulsado de la party.');
  }
}
