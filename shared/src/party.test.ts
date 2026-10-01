import { describe, expect, it } from 'vitest';
import { partyExpMultiplier } from './index.js';

describe('party experience bonus', () => {
  it.each([[0, 1], [1, 1], [2, 1.1], [3, 1.2], [4, 1.3], [10, 1.3]])(
    'gives %i eligible members a multiplier of %s', (count, expected) => {
      expect(partyExpMultiplier(count)).toBe(expected);
    },
  );
});
