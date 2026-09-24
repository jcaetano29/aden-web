import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { boot,type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType,getNpc,getWorldObject } from '@aden/shared';
import { toCharacterSave } from '../persistence/CharacterSave.js';

describe('Boren optional contracts',()=>{
  let server:ColyseusTestServer;
  beforeAll(async()=>{server=await boot(config,2593);});
  afterAll(async()=>{await server.shutdown();});
  beforeEach(async()=>{await server.cleanup();});
  it('keeps errands independent, persists a completed objective and rewards each only once',async()=>{
    const room=await server.createRoom('game',{}) as GameRoom;
    await server.connectTo(room,{name:'BorenKeeper'});
    let client=await server.connectTo(room,{name:'BorenTraveler'});
    room.setSimulationInterval(()=>{},50);room.state.mobs.clear();
    let p=room.state.players.get(client.sessionId)!;
    p.level=15;p.questId='a2_archive';p.questProgress=0;p.bountyId='b_forest';p.bountyProgress=3;
    const talk=async()=>{
      const npc=getNpc('boren'),before=p.veilContractId;p.mapId=npc.mapId!;p.x=npc.x;p.z=npc.z;
      client.send(MessageType.InteractNpc,{npcId:'boren'});
      await vi.waitFor(()=>expect(p.veilContractId).not.toBe(before));
    };
    const interact=async(id:string)=>{
      const object=getWorldObject(id);p.mapId=object.mapId;p.x=object.x;p.z=object.z;
      client.send(MessageType.InteractObject,{objectId:id});await room.waitForNextPatch();
    };
    await talk();expect(p.veilContractId).toBe('b_veil_supplies');
    await interact('boren_identity');expect(p.veilContractProgress).toBe(0);
    await interact('boren_supplies');expect(p.veilContractProgress).toBe(1);
    expect(toCharacterSave(p).progress.veilContractProgress).toBe(1);
    await client.leave();await vi.waitFor(()=>expect(room.state.players.has(client.sessionId)).toBe(false));
    client=await server.connectTo(room,{name:'BorenTraveler'});p=room.state.players.get(client.sessionId)!;
    expect(p.veilContractId).toBe('b_veil_supplies');expect(p.veilContractProgress).toBe(1);
    const gold=p.gold,exp=p.exp;
    await talk();expect(p.inventory.get('greater_potion')?.qty).toBe(3);
    expect(p.veilContractId).toBe('b_veil_identity');
    await interact('boren_supplies');expect(p.veilContractProgress).toBe(0);
    await interact('boren_identity');await talk();expect(p.veilContractId).toBe('b_veil_tool');
    await interact('boren_tool');await talk();expect(p.veilContractId).toBe('veil_contracts_complete');
    expect(p.inventory.get('veil_charm')?.qty).toBe(1);expect(p.gold).toBe(gold+750);expect(p.exp).toBe(exp);
    expect(p.questId).toBe('a2_archive');expect(p.questProgress).toBe(0);
    expect(p.bountyId).toBe('b_forest');expect(p.bountyProgress).toBe(3);
    const finalGold=p.gold;client.send(MessageType.InteractNpc,{npcId:'boren'});await room.waitForNextPatch();expect(p.gold).toBe(finalGold);
  });
  it('rejects remote contract pickup',async()=>{
    const room=await server.createRoom('game',{}) as GameRoom;
    const client=await server.connectTo(room,{name:'RemoteBoren'});
    room.setSimulationInterval(()=>{},50);const p=room.state.players.get(client.sessionId)!;p.level=15;
    const replies:any[]=[];client.onMessage(MessageType.ItemResult,m=>replies.push(m));
    client.send(MessageType.InteractNpc,{npcId:'boren'});
    await vi.waitFor(()=>expect(replies).toHaveLength(1));expect(replies[0].success).toBe(false);expect(p.veilContractId).toBe('');
  });
});
