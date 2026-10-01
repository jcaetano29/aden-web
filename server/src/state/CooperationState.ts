import { Schema, type } from '@colyseus/schema';

/** Temporary combat state; not included in character saves. */
export class CooperationState extends Schema {
  @type('number') protectedMs = 0;
  @type('string') protectedBy = '';
  @type('number') rallyMs = 0;
  rallyBy = '';
}
