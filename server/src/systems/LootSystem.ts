import { randomUUID } from 'node:crypto';
import { getItem, PICKUP_RANGE, PICKUP_DELAY_MS, DROP_DESPAWN_MS, TRANSFER_MAX_QTY, distance2D, nearestWalkable } from '@aden/shared';
import type { GameState } from '../state/GameState.js';
import { DroppedItemState } from '../state/DroppedItemState.js';
import { grantItem, instantiateItem } from './ItemSystem.js';

/** Validate everything before removing inventory. No await between removal and spawn. */
export function tryDropInventory(state:GameState, sessionId:string, id:unknown, qty:unknown):boolean {
  const p=state.players.get(sessionId);
  if(!p?.loaded || p.dead || p.hp<=0 || !Number.isFinite(p.x) || !Number.isFinite(p.z) ||
      typeof id!=='string' || id.length>2048 || typeof qty!=='number' || !Number.isSafeInteger(qty) || qty<1 || qty>TRANSFER_MAX_QTY)return false;
  const entry=p.inventory.get(id);
  if(!entry || !Number.isSafeInteger(entry.qty) || entry.qty<qty)return false;
  let item;try{item=getItem(id);}catch{return false;}
  if(item.type==='currency')return false;
  const drop=new DroppedItemState();
  Object.assign(drop,dropPosition(state,p.mapId,p.x,p.z,0),{
    itemTemplateId:instantiateItem(id),qty,mapId:p.mapId,droppedBy:sessionId,
    despawnMs:DROP_DESPAWN_MS,pickDelayMs:PICKUP_DELAY_MS,
  });
  entry.qty-=qty;
  if(entry.qty===0)p.inventory.delete(id);
  state.droppedItems.set(`discard_${randomUUID()}`,drop);
  return true;
}

/** Keep neighbouring deaths and wall-projected drops apart, with bounded search. */
export function dropPosition(state:GameState,mapId:string,x:number,z:number,index:number) {
  const nearby=[...state.droppedItems.values()].filter(d=>d.mapId===mapId&&distance2D(x,z,d.x,d.z)<12);
  let best=nearestWalkable(mapId,{x,z}),bestGap=-1;
  for(let attempt=0;attempt<48;attempt++) {
    const n=index+attempt,angle=n*2.399963229728653,radius=.7*Math.sqrt(n+1);
    const p=nearestWalkable(mapId,{x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius});
    const gap=nearby.reduce((min,d)=>Math.min(min,distance2D(p.x,p.z,d.x,d.z)),Infinity);
    if(gap>=.85)return p;
    if(gap>bestGap){best=p;bestGap=gap;}
  }
  return best;
}

/** Synchronous validation + delivery + removal: no await/reentrant callback between them.
 * Inventory currently has unlimited slots. Failed validation never consumes the drop. */
export function tryPickup(state:GameState,sessionId:string,dropId:string,automatic=false):boolean {
  const p=state.players.get(sessionId),drop=state.droppedItems.get(dropId);
  if(!p || !drop || p.dead || p.hp<=0 || p.mapId!==drop.mapId || drop.pickDelayMs>0 || drop.despawnMs<=0) return false;
  if(automatic && drop.droppedBy===sessionId)return false;
  const distance=distance2D(p.x,p.z,drop.x,drop.z);
  if(!Number.isFinite(distance) || distance>PICKUP_RANGE || !Number.isSafeInteger(drop.qty) || drop.qty<=0 || drop.qty>10000)return false;
  let item;try{item=getItem(drop.itemTemplateId);}catch{return false;}
  if(item.type==='currency') {
    if(!Number.isSafeInteger(p.gold+drop.qty))return false;
    p.gold+=drop.qty;
  } else {
    // Loot must already be instantiated at generation, so granting never rerolls properties.
    if(item.allowedQualities?.length && item.type==='equipment' && !item.options)return false;
    const before=p.inventory.get(drop.itemTemplateId)?.qty??0;
    if(!Number.isSafeInteger(before+drop.qty))return false;
    grantItem(p,drop.itemTemplateId,drop.qty);
    if(p.inventory.get(drop.itemTemplateId)?.qty!==before+drop.qty)return false;
  }
  state.droppedItems.delete(dropId);
  return true;
}
