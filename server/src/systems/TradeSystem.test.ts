import { describe, it, expect } from 'vitest';
import { createItemInstance, getItem, type TradeSnapshot } from '@aden/shared';
import { GameState } from '../state/GameState.js';
import { PlayerState } from '../state/PlayerState.js';
import { grantItem } from './ItemSystem.js';
import { TradeSystem } from './TradeSystem.js';

function setup() {
  const state=new GameState(); let now=1000;
  const updates=new Map<string,TradeSnapshot|null>();
  const system=new TradeSystem(state,(id,snapshot)=>updates.set(id,snapshot),()=>now);
  for(const id of ['a','b','c']) {
    const p=new PlayerState();Object.assign(p,{name:id,loaded:true,hp:100,gold:100});state.players.set(id,p);
  }
  const a=state.players.get('a')!,b=state.players.get('b')!;
  const snapshot=()=>updates.get('a')!;
  const begin=()=>{expect(system.invite('a','b').success).toBe(true);expect(system.respond('b',snapshot()!.id,true).success).toBe(true);};
  const offer=(id:string,gold=0,items:{itemTemplateId:string;qty:number}[]=[])=>system.offer(id,snapshot()!.id,snapshot()!.revision,{gold,items});
  const confirm=(id:string)=>system.confirm(id,snapshot()!.id,snapshot()!.revision);
  return {state,system,a,b,updates,snapshot,begin,offer,confirm,advance:()=>{now+=130000;system.sweep();}};
}

describe('player trade',()=>{
  it('transfers gold and exact item instances only after both confirm, exactly once',()=>{
    const f=setup();const id=createItemInstance(getItem('aden_punal_del_umbral'),{level:9,quality:'magic',luck:true},'trade-one');
    grantItem(f.a,id,1);grantItem(f.b,'bone',7);f.begin();
    f.offer('a',30,[{itemTemplateId:id,qty:1}]);f.offer('b',5,[{itemTemplateId:'bone',qty:3}]);
    const old=f.snapshot()!;
    expect(f.confirm('a').success).toBe(true);expect(f.a.gold).toBe(100);expect(f.b.inventory.has(id)).toBe(false);
    expect(f.confirm('b').success).toBe(true);
    expect([f.a.gold,f.b.gold]).toEqual([75,125]);expect(f.a.inventory.has(id)).toBe(false);
    expect(f.b.inventory.get(id)?.qty).toBe(1);expect(f.a.inventory.get('bone')?.qty).toBe(3);expect(f.b.inventory.get('bone')?.qty).toBe(4);
    expect(f.updates.get('a')).toBeNull();expect(f.updates.get('b')).toBeNull();
    expect(f.system.confirm('b',old.id,old.revision).success).toBe(false);expect(f.b.gold).toBe(125);
  });
  it('invalidates confirmations on edit and rejects an old revision',()=>{
    const f=setup();f.begin();f.offer('a',20);f.confirm('a');const old=f.snapshot()!;
    f.offer('b',10);
    expect(f.snapshot()!.participants.every(p=>!p.confirmed)).toBe(true);
    expect(f.system.confirm('b',old.id,old.revision).success).toBe(false);
    f.confirm('b');expect(f.a.gold).toBe(100);f.confirm('a');expect(f.a.gold).toBe(90);
  });
  it.each(['spend','consume','equip','drop'])('revalidates resources after %s, with no partial transfer',kind=>{
    const f=setup();grantItem(f.a,'iron_sword',1);f.begin();f.offer('a',50,[{itemTemplateId:'iron_sword',qty:1}]);f.offer('b',10);f.confirm('b');
    if(kind==='spend')f.a.gold=0;else f.a.inventory.delete('iron_sword');
    expect(f.confirm('a').success).toBe(false);expect(f.b.gold).toBe(100);expect(f.b.inventory.size).toBe(0);expect(f.updates.get('a')).toBeNull();
  });
  it.each([-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'20',null])('rejects invalid gold %s',gold=>{
    const f=setup();f.begin();expect(f.system.offer('a',f.snapshot()!.id,0,{gold,items:[]}).success).toBe(false);expect(f.a.gold).toBe(100);
  });
  it.each([null,{},[{itemTemplateId:'bone',qty:0}],[{itemTemplateId:'bone',qty:1.1}],[{itemTemplateId:'bone',qty:8}],[{itemTemplateId:'invalid',qty:1}],[{itemTemplateId:'bone',qty:1},{itemTemplateId:'bone',qty:1}],Array(21).fill({itemTemplateId:'bone',qty:1})])('rejects malformed or unowned items %#',items=>{
    const f=setup();grantItem(f.a,'bone',7);f.begin();expect(f.system.offer('a',f.snapshot()!.id,0,{gold:0,items}).success).toBe(false);expect(f.a.inventory.get('bone')?.qty).toBe(7);
  });
  it.each(['far','map','dead','unloaded','self','busy'])('rejects unavailable partner: %s',kind=>{
    const f=setup();if(kind==='far')f.b.x=6;if(kind==='map')f.b.mapId='bosque';if(kind==='dead')f.b.dead=true;if(kind==='unloaded')f.b.loaded=false;
    if(kind==='busy')f.system.invite('c','b');expect(f.system.invite('a',kind==='self'?'a':'b').success).toBe(false);
  });
  it.each(['timeout','distance','map','death','disconnect','cancel'])('cancels on %s without moving assets',kind=>{
    const f=setup();f.begin();f.offer('a',50);f.confirm('a');
    if(kind==='timeout')f.advance();if(kind==='distance')f.b.x=6;if(kind==='map')f.b.mapId='bosque';if(kind==='death')f.b.dead=true;
    if(kind==='disconnect')f.system.remove('b');if(kind==='cancel')f.system.cancel('a',f.snapshot()!.id);
    f.system.sweep();expect(f.updates.get('a')).toBeNull();expect(f.updates.get('b')).toBeNull();expect([f.a.gold,f.b.gold]).toEqual([100,100]);
  });
  it('only the invitee can accept and neither outsider nor old session can operate',()=>{
    const f=setup();f.system.invite('a','b');const id=f.snapshot()!.id;
    expect(f.system.respond('a',id,true).success).toBe(false);expect(f.system.respond('c',id,true).success).toBe(false);
    expect(f.system.offer('a',id,0,{gold:5,items:[]}).success).toBe(false);
    f.system.respond('b',id,false);expect(f.updates.get('a')).toBeNull();f.begin();
    expect(f.system.cancel('a',id).success).toBe(false);expect(f.system.confirm('c',f.snapshot()!.id,0).success).toBe(false);
  });
  it('allows a gift and safely nets the same stack in both directions',()=>{
    const f=setup();grantItem(f.a,'bone',7);grantItem(f.b,'bone',5);f.begin();f.offer('a',0,[{itemTemplateId:'bone',qty:4}]);f.offer('b',0,[{itemTemplateId:'bone',qty:2}]);f.confirm('a');f.confirm('b');
    expect(f.a.inventory.get('bone')?.qty).toBe(5);expect(f.b.inventory.get('bone')?.qty).toBe(7);
    f.begin();f.offer('a',15);f.confirm('a');f.confirm('b');expect([f.a.gold,f.b.gold]).toEqual([85,115]);
  });
  it('rejects receiver overflow before any asset moves',()=>{
    const f=setup();f.b.gold=Number.MAX_SAFE_INTEGER;f.begin();f.offer('a',1);f.confirm('a');expect(f.confirm('b').success).toBe(false);expect(f.a.gold).toBe(100);
  });
});
