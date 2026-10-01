import { Schema, type, ArraySchema } from '@colyseus/schema';
import type { PartyLootMode } from '@aden/shared';

export class PartyState extends Schema {
  @type('string') leaderId = '';
  @type(['string']) members = new ArraySchema<string>();
  @type('string') lootMode: PartyLootMode = 'round_robin';
  /** Next member index; session-only and adjusted when members leave. */
  lootCursor = 0;
}
