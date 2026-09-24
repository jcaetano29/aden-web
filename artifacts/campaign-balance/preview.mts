// Isolated local visual fixture. Never writes to the configured persistence service.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;
const { boot } = await import('@colyseus/testing');
const { default: config } = await import('../../server/src/testServer.ts');
const { GameRoom } = await import('../../server/src/rooms/GameRoom.ts');
const { grantItem } = await import('../../server/src/systems/ItemSystem.ts');
const join = GameRoom.prototype.onJoin;
GameRoom.prototype.onJoin = async function (...args) {
  await join.apply(this, args);
  const p = this.state.players.get(args[0].sessionId)!;
  p.level = 12; p.questId = 'a2_caravan'; p.questProgress = 0;
  p.mapId = 'marismas'; p.x = p.targetX = 1203; p.z = p.targetZ = 198;
  p.gold = 1000; this['recomputeStats'](p); p.hp = p.maxHp - 200; p.mp = p.maxMp;
  p.msSinceCombat = -300000; if(p.inventory.has('health_potion'))p.inventory.delete('health_potion'); grantItem(p,'greater_potion',2);
};
await boot(config, 2590);
console.log('Isolated campaign visual fixture ready on 2590');
