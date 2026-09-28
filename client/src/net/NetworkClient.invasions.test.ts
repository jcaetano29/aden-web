import { expect, it } from 'vitest';
import { NetworkClient } from './NetworkClient.js';

it.each(['announced', 'active'])('does not reveal an invader on the radar during %s', phase => {
  const net = new NetworkClient();
  (net as any).room = { sessionId: 'self', state: {
    players: new Map([['self', { mapId: 'bosque', x: 300, z: 50 }]]),
    mobs: new Map([
      ['invader', { templateId: 'waste_herald', mapId: 'bosque', x: 250, z: -25 }],
      ['regular', { templateId: 'skeleton_minion', mapId: 'bosque', x: 310, z: 20 }],
    ]),
    worldEvent: { phase, mapId: 'bosque', x: 250, z: -25 },
  } };
  expect(net.getMinimapEntities()).toEqual([
    { kind: 'self', x: 300, z: 50 }, { kind: 'mob', x: 310, z: 20 },
  ]);
});
