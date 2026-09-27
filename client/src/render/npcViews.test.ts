import { it, expect } from 'vitest';
import { NPCS } from '@aden/shared';
import { npcsWithGenericView } from './npcViews.js';

it('draws every NPC once: the classic town services keep their own view, the rest use the generic one', () => {
  const ids = npcsWithGenericView(NPCS).map(n => n.id);
  for (const classic of ['elder', 'merchant', 'healer', 'smith', 'captain']) expect(ids).not.toContain(classic);
  expect(ids).toContain('chaos_keeper');
  expect(ids).toContain('brenna');
  expect(ids).toHaveLength(NPCS.length - 5);
});
