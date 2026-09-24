import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { boot,type ColyseusTestServer } from '@colyseus/testing';
import { MessageType,type TradeSnapshot } from '@aden/shared';
import appConfig from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { grantItem } from '../systems/ItemSystem.js';

describe('drop and trade over real connections',()=>{
  let server:ColyseusTestServer;
  beforeAll(async()=>{server=await boot(appConfig,2581);});
  afterAll(async()=>{await server.shutdown();});
  beforeEach(async()=>{await server.cleanup();});

  async function setup(){
    const room=await server.createRoom('game',{}) as GameRoom;room.setSimulationInterval(()=>{},50);
    const a=await server.connectTo(room,{name:'TradeA'}),b=await server.connectTo(room,{name:'TradeB'});
    const snapshots=new Map<string,TradeSnapshot|null>();
    for(const c of [a,b]){c.onMessage(MessageType.ItemResult,()=>{});c.onMessage(MessageType.TradeState,s=>snapshots.set(c.sessionId,s));}
    await room.waitForNextPatch();const pa=room.state.players.get(a.sessionId)!,pb=room.state.players.get(b.sessionId)!;
    pa.x=pb.x=pa.z=pb.z=0;pa.gold=pb.gold=100;
    return {room,a,b,pa,pb,snapshots};
  }
  it('drops a stack, leaves it on ground near its owner and gives it to another player once',async()=>{
    const {room,a,b,pa,pb}=await setup();grantItem(pa,'bone',7);pb.x=20;
    a.send(MessageType.DropItem,{itemTemplateId:'bone',qty:3});await room.waitForNextPatch();
    expect(pa.inventory.get('bone')?.qty).toBe(4);expect(room.state.droppedItems.size).toBe(1);
    const [id,drop]=[...room.state.droppedItems][0];pa.x=drop.x;pa.z=drop.z;
    room.tick(2);expect(room.state.droppedItems.has(id)).toBe(true);
    pb.x=drop.x;pb.z=drop.z;b.send(MessageType.PickupItem,{dropId:id});await room.waitForNextPatch();
    expect(pb.inventory.get('bone')?.qty).toBe(3);expect((b.state as any).droppedItems.has(id)).toBe(false);
  });
  it('rejects a second connection to the same account, including a different room',async()=>{
    const {room}=await setup();
    await expect(server.connectTo(room,{name:'TradeA'})).rejects.toThrow();
    const other=await server.createRoom('game',{}) as GameRoom;
    await expect(server.connectTo(other,{name:' TradeA '})).rejects.toThrow();
  });
  it('retains the last departing account through a temporary save failure and unlocks after retry',async()=>{
    const {room,a,b}=await setup();await b.leave();await room.waitForNextPatch();
    const persistence=(room as any).persistence,original=persistence.saveMany.bind(persistence);
    const spy=vi.spyOn(persistence,'saveMany').mockRejectedValue(Error('temporary outage'));
    try {
      await a.leave();await new Promise(resolve=>setTimeout(resolve,100));
      expect(room.autoDispose).toBe(false);
      spy.mockImplementation(original);
      await (room as any).saveAll();expect(room.autoDispose).toBe(true);
      const returning=await server.connectTo(room,{name:'TradeA'});await room.waitForNextPatch();
      expect(room.state.players.has(returning.sessionId)).toBe(true);
    } finally {spy.mockRestore();await (room as any).saveAll();}
  });
  it('exchanges assets on both clients, persists on leave, and cancels a new session on disconnect',async()=>{
    const {room,a,b,pa,pb,snapshots}=await setup();grantItem(pa,'iron_sword',1);
    const current=()=>snapshots.get(a.sessionId)!;
    a.send(MessageType.TradeInvite,{targetId:b.sessionId});await room.waitForNextPatch();
    expect(current()?.phase).toBe('invited');
    b.send(MessageType.TradeRespond,{tradeId:current().id,accept:true});await room.waitForNextPatch();
    a.send(MessageType.TradeOffer,{tradeId:current().id,revision:current().revision,offer:{gold:0,items:[{itemTemplateId:'iron_sword',qty:1}]}});await room.waitForNextPatch();
    b.send(MessageType.TradeOffer,{tradeId:current().id,revision:current().revision,offer:{gold:35,items:[]}});await room.waitForNextPatch();
    const msg={tradeId:current().id,revision:current().revision};a.send(MessageType.TradeConfirm,msg);b.send(MessageType.TradeConfirm,msg);await room.waitForNextPatch();
    expect([pa.gold,pb.gold]).toEqual([135,65]);expect(pb.inventory.get('iron_sword')?.qty).toBe(1);
    expect((a.state as any).players.get(b.sessionId).inventory.get('iron_sword').qty).toBe(1);expect(current()).toBeNull();
    a.send(MessageType.TradeInvite,{targetId:b.sessionId});await room.waitForNextPatch();
    await b.leave();await room.waitForNextPatch();expect(current()).toBeNull();
    const saved=await (room as any).persistence.load('TradeB');expect(saved.gold).toBe(65);expect(saved.inventory.iron_sword).toBe(1);
  });
});
