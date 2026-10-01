import type { GameState } from '../state/GameState.js';
import type { DroppedItemState } from '../state/DroppedItemState.js';

/** Call only for a defeated mob's ordinary drops with its EXP-eligible members. */
export function reservePartyLoot(state: GameState, partyId: string, drops: Iterable<DroppedItemState>, eligibleIds: readonly string[]): void {
  const party = state.parties.get(partyId);
  if (!party || party.lootMode !== 'round_robin' || !party.members.length) return;
  const eligible = new Set(eligibleIds);
  for (const drop of drops) {
    if (drop.droppedBy || drop.reservedMs > 0 || drop.reservedGuildId || drop.reservedPlayerId ||
        drop.reservedPartyMembers.size || drop.reservedFor) continue;
    for (let offset = 0; offset < party.members.length; offset++) {
      const index = (party.lootCursor + offset) % party.members.length;
      const id = party.members[index]!;
      const player = state.players.get(id);
      if (!eligible.has(id) || !player?.loaded || player.dead || player.hp <= 0 ||
          player.partyId !== partyId || player.mapId !== drop.mapId) continue;
      drop.reservedPlayerId = id;
      drop.reservedFor = player.name;
      drop.reservedMs = 30_000;
      party.lootCursor = (index + 1) % party.members.length;
      break;
    }
  }
}
