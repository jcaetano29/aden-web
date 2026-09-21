import { Schema, type, ArraySchema } from '@colyseus/schema';

export class PartyState extends Schema {
  @type('string') leaderId = '';
  @type(['string']) members = new ArraySchema<string>();
}
