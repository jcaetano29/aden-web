import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { boot,type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType,getNpc,getWorldObject } from '@aden/shared';
import { toCharacterSave } from '../persistence/CharacterSave.js';
import { SideChainState } from '../state/SideChainState.js';
import type { PlayerState } from '../state/PlayerState.js';
const chainOf = (p: PlayerState, id: string) => p.sideChains.get(id);
const setChain = (p: PlayerState, id: string, stepId: string, progress = 0) => {
  const e = new SideChainState(); e.id = stepId; e.progress = progress; p.sideChains.set(id, e);
};

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
    p.level=15;p.questId='a2_archive';p.questProgress=0;setChain(p,'varek','b_forest',3);
    const talk=async()=>{
      const npc=getNpc('boren'),before=(chainOf(p,'boren')?.id ?? '');p.mapId=npc.mapId!;p.x=npc.x;p.z=npc.z;
      client.send(MessageType.InteractNpc,{npcId:'boren'});
      await vi.waitFor(()=>expect((chainOf(p,'boren')?.id ?? '')).not.toBe(before));
    };
    const interact=async(id:string)=>{
      const object=getWorldObject(id);p.mapId=object.mapId;p.x=object.x;p.z=object.z;
      client.send(MessageType.InteractObject,{objectId:id});await room.waitForNextPatch();
    };
    await talk();expect((chainOf(p,'boren')?.id ?? '')).toBe('b_veil_supplies');
    await interact('boren_identity');expect((chainOf(p,'boren')?.progress ?? 0)).toBe(0);
    await interact('boren_supplies');expect((chainOf(p,'boren')?.progress ?? 0)).toBe(1);
    expect(toCharacterSave(p).progress.veilContractProgress).toBe(1);
    await client.leave();await vi.waitFor(()=>expect(room.state.players.has(client.sessionId)).toBe(false));
    client=await server.connectTo(room,{name:'BorenTraveler'});p=room.state.players.get(client.sessionId)!;
    expect((chainOf(p,'boren')?.id ?? '')).toBe('b_veil_supplies');expect((chainOf(p,'boren')?.progress ?? 0)).toBe(1);
    const gold=p.gold,exp=p.exp;
    await talk();expect(p.inventory.get('greater_potion')?.qty).toBe(3);
    expect((chainOf(p,'boren')?.id ?? '')).toBe('b_veil_identity');
    await interact('boren_supplies');expect((chainOf(p,'boren')?.progress ?? 0)).toBe(0);
    await interact('boren_identity');await talk();expect((chainOf(p,'boren')?.id ?? '')).toBe('b_veil_tool');
    await interact('boren_tool');await talk();expect((chainOf(p,'boren')?.id ?? '')).toBe('veil_contracts_complete');
    expect(p.inventory.get('veil_charm')?.qty).toBe(1);expect(p.gold).toBe(gold+750);expect(p.exp).toBe(exp);
    expect(p.questId).toBe('a2_archive');expect(p.questProgress).toBe(0);
    expect((chainOf(p,'varek')?.id ?? '')).toBe('b_forest');expect((chainOf(p,'varek')?.progress ?? 0)).toBe(3);
    const finalGold=p.gold;client.send(MessageType.InteractNpc,{npcId:'boren'});await room.waitForNextPatch();expect(p.gold).toBe(finalGold);
  });
  it('rejects remote contract pickup',async()=>{
    const room=await server.createRoom('game',{}) as GameRoom;
    const client=await server.connectTo(room,{name:'RemoteBoren'});
    room.setSimulationInterval(()=>{},50);const p=room.state.players.get(client.sessionId)!;p.level=15;
    const replies:any[]=[];client.onMessage(MessageType.ItemResult,m=>replies.push(m));
    client.send(MessageType.InteractNpc,{npcId:'boren'});
    await vi.waitFor(()=>expect(replies).toHaveLength(1));expect(replies[0].success).toBe(false);expect((chainOf(p,'boren')?.id ?? '')).toBe('');
  });
});
