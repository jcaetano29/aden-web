import { describe,it,expect } from 'vitest';
import { GameState } from '../state/GameState.js';
import { PlayerState } from '../state/PlayerState.js';
import { DroppedItemState } from '../state/DroppedItemState.js';
import { tryPickup,dropPosition,tryDropInventory } from './LootSystem.js';
import { grantItem } from './ItemSystem.js';
import { createItemInstance,getItem,getZone,isWalkable,distance2D } from '@aden/shared';

function fixture() {
  const state=new GameState(),p=new PlayerState(),other=new PlayerState(),drop=new DroppedItemState();
  p.mapId=other.mapId=drop.mapId='bosque';p.x=other.x=drop.x=10;p.z=other.z=drop.z=10;p.hp=other.hp=100;
  drop.itemTemplateId=createItemInstance(getItem('aden_punal_del_umbral'),{quality:'magic',level:3,luck:true},'unique');drop.qty=1;drop.despawnMs=5000;
  state.players.set('p',p);state.players.set('other',other);state.droppedItems.set('drop',drop);
  return {state,p,other,drop};
}
describe('public atomic loot',()=>{
  it('drops a partial stack publicly without automatically reclaiming it',()=>{
    const {state,p,other}=fixture(); p.loaded=true;
    grantItem(p,'bone',7);
    expect(tryDropInventory(state,'p','bone',3)).toBe(true);
    const [id,drop]=[...state.droppedItems].find(([,d])=>d.itemTemplateId==='bone')!;
    expect(p.inventory.get('bone')?.qty).toBe(4);
    expect(drop.qty).toBe(3); expect(isWalkable(p.mapId,drop)).toBe(true);
    drop.pickDelayMs=0; p.x=other.x=drop.x; p.z=other.z=drop.z;
    expect(tryPickup(state,'p',id,true)).toBe(false);
    expect(tryPickup(state,'other',id,true)).toBe(true);
    expect(other.inventory.get('bone')?.qty).toBe(3);
  });
  it('preserves instance options, removes an empty slot and permits explicit recovery',()=>{
    const {state,p,drop}=fixture(); p.loaded=true; const itemId=drop.itemTemplateId;
    state.droppedItems.clear(); grantItem(p,itemId,1);
    expect(tryDropInventory(state,'p',itemId,1)).toBe(true);
    expect(p.inventory.size).toBe(0);
    const [id,d]=[...state.droppedItems][0]; expect(d.itemTemplateId).toBe(itemId);
    d.pickDelayMs=0; p.x=d.x;p.z=d.z;
    expect(tryPickup(state,'p',id)).toBe(true); expect(p.inventory.get(itemId)?.qty).toBe(1);
  });
  it.each([0,-1,1.5,NaN,Infinity,10001,8,'2',null])('rejects invalid drop quantity %s without mutations',qty=>{
    const {state,p}=fixture(); p.loaded=true; grantItem(p,'bone',7);
    expect(tryDropInventory(state,'p','bone',qty)).toBe(false);
    expect(p.inventory.get('bone')?.qty).toBe(7);expect(state.droppedItems.size).toBe(1);
  });
  it.each(['dead','unloaded','equipped','currency','unknown'])('rejects %s inventory drops',kind=>{
    const {state,p}=fixture();p.loaded=true;grantItem(p,'bone',1);
    if(kind==='dead')p.dead=true;if(kind==='unloaded')p.loaded=false;
    p.equipment.set('weapon','iron_sword');grantItem(p,'gold',5);
    const id=kind==='equipped'?'iron_sword':kind==='currency'?'gold':kind==='unknown'?'invalid':'bone';
    expect(tryDropInventory(state,'p',id,1)).toBe(false);expect(state.droppedItems.size).toBe(1);
  });
  it('spreads repeated deaths on walkable ground',()=>{
    const state=new GameState(),spawn=getZone('cripta').spawn;
    for(let i=0;i<15;i++) {
      const p=dropPosition(state,'cripta',spawn.x,spawn.z,i%3);
      expect(isWalkable('cripta',p)).toBe(true);
      for(const d of state.droppedItems.values())expect(distance2D(d.x,d.z,p.x,p.z)).toBeGreaterThanOrEqual(.85);
      const drop=new DroppedItemState();Object.assign(drop,{...p,mapId:'cripta'});state.droppedItems.set(String(i),drop);
    }
  });
  it('first valid attempt wins with exact identity; second receives nothing',()=>{
    const {state,p,other,drop}=fixture();
    expect(tryPickup(state,'other','drop')).toBe(true);
    expect(tryPickup(state,'p','drop')).toBe(false);
    expect(other.inventory.get(drop.itemTemplateId)?.qty).toBe(1);expect(p.inventory.size).toBe(0);expect(state.droppedItems.size).toBe(0);
  });
  it.each(['far','dead','hp','map','delay','expired','invalid','quantity','missingPlayer','missingDrop'])('rejects %s without losing loot',kind=>{
    const {state,p,drop}=fixture();
    if(kind==='far')p.x+=100;if(kind==='dead')p.dead=true;if(kind==='hp')p.hp=0;if(kind==='map')p.mapId='pueblo';
    if(kind==='delay')drop.pickDelayMs=100;if(kind==='expired')drop.despawnMs=0;if(kind==='invalid')drop.itemTemplateId='invalid';if(kind==='quantity')drop.qty=-1;
    expect(tryPickup(state,kind==='missingPlayer'?'absent':'p',kind==='missingDrop'?'absent':'drop')).toBe(false);
    expect(state.droppedItems.has('drop')).toBe(true);expect(p.inventory.size).toBe(0);
  });
});
