import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { boot,type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, CATALOG_ITEMS } from '@aden/shared';
import { grantItem } from '../systems/ItemSystem.js';

describe('authoritative potion recovery',()=>{
  let server:ColyseusTestServer;
  beforeAll(async()=>{server=await boot(config,2592);});
  afterAll(async()=>{await server.shutdown();});
  beforeEach(async()=>{await server.cleanup();});
  it('rejects alternate sizes without consumption and restores the timer after reconnect',async()=>{
    const room=await server.createRoom('game',{}) as GameRoom;
    const keeper=await server.connectTo(room,{name:'PotionKeeper'});
    const client=await server.connectTo(room,{name:'PotionTraveler'});
    room.setSimulationInterval(()=>{},50);
    const p=room.state.players.get(client.sessionId)!; p.hp=1;
    grantItem(p,'health_potion',2);grantItem(p,'greater_potion',2);
    const results:any[]=[];client.onMessage(MessageType.ItemResult,m=>results.push(m));
    client.send(MessageType.UseItem,{itemTemplateId:'health_potion'});
    await vi.waitFor(()=>expect(results).toHaveLength(1)); expect(results[0].success).toBe(true);
    const hp=p.hp;
    client.send(MessageType.UseItem,{itemTemplateId:'greater_potion'});
    await vi.waitFor(()=>expect(results).toHaveLength(2)); expect(results[1].success).toBe(false);
    expect(p.hp).toBe(hp);expect(p.inventory.get('greater_potion')?.qty).toBe(2);
    expect(p.hpPotionCooldownMs).toBeGreaterThan(0);
    const mana=Object.values(CATALOG_ITEMS).find(i=>i.mana && (!i.classes || i.classes.includes(p.className)) && (i.requiredLevel??1)<=p.level)!;
    expect(mana).toBeDefined();p.mp=0;grantItem(p,mana.id,1);
    client.send(MessageType.UseItem,{itemTemplateId:mana.id});
    await vi.waitFor(()=>expect(results).toHaveLength(3));expect(results[2].success).toBe(true);
    await client.leave(); await vi.waitFor(()=>expect(room.state.players.has(client.sessionId)).toBe(false));
    const rejoined=await server.connectTo(room,{name:'PotionTraveler'});
    const restored=room.state.players.get(rejoined.sessionId)!;
    expect(restored.hpPotionCooldownMs).toBeGreaterThan(0);expect(restored.mpPotionCooldownMs).toBeGreaterThan(0);
    await keeper.leave();
  });
  it('does not start recovery or consume a potion at full health',async()=>{
    const room=await server.createRoom('game',{}) as GameRoom;
    const client=await server.connectTo(room,{name:'PotionFull'});
    room.setSimulationInterval(()=>{},50);const p=room.state.players.get(client.sessionId)!;
    grantItem(p,'health_potion',1);const quantity=p.inventory.get('health_potion')!.qty;
    const results:any[]=[];client.onMessage(MessageType.ItemResult,m=>results.push(m));
    client.send(MessageType.UseItem,{itemTemplateId:'health_potion'});
    await vi.waitFor(()=>expect(results).toHaveLength(1));expect(results[0].success).toBe(false);
    expect(p.inventory.get('health_potion')!.qty).toBe(quantity);expect(p.hpPotionCooldownMs).toBe(0);
  });
});
