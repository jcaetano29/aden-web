import { randomUUID } from 'node:crypto';
import {
  distance2D, getItem, TRADE_RANGE, TRADE_INVITE_MS, TRADE_SESSION_MS,
  TRADE_MAX_ITEMS, TRANSFER_MAX_QTY, type TradeOffer, type TradeSnapshot,
} from '@aden/shared';
import type { GameState } from '../state/GameState.js';
import type { PlayerState } from '../state/PlayerState.js';
import { InventoryItemState } from '../state/InventoryItemState.js';

const result=(success:boolean,text:string)=>({success,text});
const validAmount=(value:unknown):value is number=>typeof value==='number' && Number.isSafeInteger(value) && value>=0;

/** No escrow: offers reference owned assets, which are validated again at commit.
 * No asynchronous work or notifications occur between validation and both transfers. */
export class TradeSystem {
  private readonly sessions=new Map<string,TradeSnapshot>();

  constructor(
    private readonly state:GameState,
    private readonly notify:(id:string,snapshot:TradeSnapshot|null,text?:string)=>void,
    private readonly now:()=>number=Date.now,
    private readonly onComplete?:(ids:string[])=>void,
  ) {}

  private available(aId:string,bId:string):boolean {
    const a=this.state.players.get(aId),b=this.state.players.get(bId);
    return !!a?.loaded && !!b?.loaded && aId!==bId && !a.dead && !b.dead && a.hp>0 && b.hp>0 &&
      a.mapId===b.mapId && distance2D(a.x,a.z,b.x,b.z)<=TRADE_RANGE;
  }

  private publish(session:TradeSnapshot):void {
    for(const p of session.participants)this.notify(p.id,structuredClone(session));
  }

  private close(session:TradeSnapshot,text:string):void {
    for(const p of session.participants)this.sessions.delete(p.id);
    for(const p of session.participants)this.notify(p.id,null,text);
  }

  sweep():void {
    for(const session of new Set(this.sessions.values())) {
      const [a,b]=session.participants;
      if(session.expiresAt<=this.now())this.close(session,'El intercambio venció.');
      else if(!this.available(a.id,b.id))this.close(session,'Intercambio cancelado: los dos deben estar vivos y cerca en el mismo mapa.');
      else if(session.phase==='active' && session.participants.some(p=>!this.owns(this.state.players.get(p.id)!,p.offer)))
        this.close(session,'Intercambio cancelado: cambiaron los objetos o el oro ofrecidos.');
    }
  }

  invite(senderId:string,targetId:unknown) {
    this.sweep();
    if(typeof targetId!=='string' || targetId.length>128 || !this.available(senderId,targetId))
      return result(false,'Acercate a un jugador vivo del mismo mapa para intercambiar.');
    if(this.sessions.has(senderId)||this.sessions.has(targetId))return result(false,'Uno de los jugadores ya tiene un intercambio pendiente.');
    const participant=(id:string)=>({id,name:this.state.players.get(id)!.name,offer:{gold:0,items:[]},confirmed:false});
    const session:TradeSnapshot={id:randomUUID(),inviterId:senderId,phase:'invited',revision:0,expiresAt:this.now()+TRADE_INVITE_MS,
      participants:[participant(senderId),participant(targetId)]};
    for(const p of session.participants)this.sessions.set(p.id,session);
    this.publish(session);
    return result(true,'Invitación de intercambio enviada.');
  }

  private find(playerId:string,tradeId:unknown):TradeSnapshot|undefined {
    this.sweep();
    const session=this.sessions.get(playerId);
    return typeof tradeId==='string' && session?.id===tradeId ? session : undefined;
  }

  respond(playerId:string,tradeId:unknown,accept:unknown) {
    const session=this.find(playerId,tradeId);
    if(!session || session.phase!=='invited' || session.inviterId===playerId || typeof accept!=='boolean')return result(false,'Invitación no disponible.');
    if(!accept){this.close(session,'Invitación de intercambio rechazada.');return result(true,'Invitación rechazada.');}
    session.phase='active';session.expiresAt=this.now()+TRADE_SESSION_MS;
    this.publish(session);return result(true,'Intercambio abierto. Agregá tu oferta y revisá la del otro jugador.');
  }

  private parseOffer(value:unknown):TradeOffer|null {
    if(!value || typeof value!=='object')return null;
    const {gold,items}=value as TradeOffer;
    if(!validAmount(gold)||!Array.isArray(items)||items.length>TRADE_MAX_ITEMS)return null;
    const seen=new Set<string>(),offer:TradeOffer={gold,items:[]};
    for(const entry of items) {
      if(!entry || typeof entry.itemTemplateId!=='string' || entry.itemTemplateId.length>2048 ||
          !validAmount(entry.qty) || entry.qty===0 || entry.qty>TRANSFER_MAX_QTY || seen.has(entry.itemTemplateId))return null;
      try{if(getItem(entry.itemTemplateId).type==='currency')return null;}catch{return null;}
      seen.add(entry.itemTemplateId);offer.items.push({itemTemplateId:entry.itemTemplateId,qty:entry.qty});
    }
    return offer;
  }

  private owns(player:PlayerState,offer:TradeOffer):boolean {
    return validAmount(player.gold) && player.gold>=offer.gold && offer.items.every(item=>{
      const qty=player.inventory.get(item.itemTemplateId)?.qty;
      return validAmount(qty) && qty>=item.qty;
    });
  }

  offer(playerId:string,tradeId:unknown,revision:unknown,value:unknown) {
    const session=this.find(playerId,tradeId);
    if(!session || session.phase!=='active')return result(false,'Intercambio no disponible.');
    if(revision!==session.revision)return result(false,'La oferta cambió. Revisala y volvé a guardar.');
    const offer=this.parseOffer(value),player=this.state.players.get(playerId)!;
    if(!offer || !this.owns(player,offer))return result(false,'Oferta inválida: verificá el oro, los objetos y las cantidades.');
    session.participants.find(p=>p.id===playerId)!.offer=offer;
    for(const p of session.participants)p.confirmed=false;
    session.revision++;this.publish(session);
    return result(true,'Oferta actualizada. Ambos deben confirmar de nuevo.');
  }

  confirm(playerId:string,tradeId:unknown,revision:unknown) {
    const session=this.find(playerId,tradeId);
    if(!session || session.phase!=='active')return result(false,'Intercambio no disponible.');
    if(revision!==session.revision)return result(false,'La oferta cambió. Revisala antes de confirmar.');
    if(!session.participants.some(p=>p.offer.gold>0||p.offer.items.length>0))return result(false,'Agregá oro u objetos antes de confirmar.');
    session.participants.find(p=>p.id===playerId)!.confirmed=true;
    if(!session.participants.every(p=>p.confirmed)){this.publish(session);return result(true,'Confirmado. Esperando al otro jugador.');}

    // Compute both resulting balances/stacks before touching either participant.
    const plans=session.participants.map((participant,index)=>{
      const player=this.state.players.get(participant.id)!,incoming=session.participants[1-index].offer;
      const gold=player.gold-participant.offer.gold+incoming.gold;
      const quantities=new Map<string,number>();
      for(const item of [...participant.offer.items,...incoming.items])quantities.set(item.itemTemplateId,player.inventory.get(item.itemTemplateId)?.qty??0);
      for(const item of participant.offer.items)quantities.set(item.itemTemplateId,quantities.get(item.itemTemplateId)!-item.qty);
      for(const item of incoming.items)quantities.set(item.itemTemplateId,quantities.get(item.itemTemplateId)!+item.qty);
      return {player,gold,quantities};
    });
    if(plans.some(plan=>!validAmount(plan.gold)||[...plan.quantities.values()].some(qty=>!validAmount(qty)))) {
      this.close(session,'Intercambio cancelado: se excede la cantidad permitida.');return result(false,'No se pudo completar el intercambio.');
    }
    for(const {player,gold,quantities} of plans) {
      player.gold=gold;
      for(const [id,qty] of quantities) {
        if(qty===0)player.inventory.delete(id);
        else {const item=player.inventory.get(id)??new InventoryItemState();item.itemTemplateId=id;item.qty=qty;player.inventory.set(id,item);}
      }
    }
    this.close(session,'Intercambio completado.');
    this.onComplete?.(session.participants.map(p=>p.id));
    return result(true,'Intercambio completado.');
  }

  cancel(playerId:string,tradeId:unknown) {
    const session=this.find(playerId,tradeId);
    if(!session)return result(false,'Intercambio no disponible.');
    this.close(session,'Intercambio cancelado.');return result(true,'Intercambio cancelado.');
  }

  remove(playerId:string):void {
    const session=this.sessions.get(playerId);
    if(session)this.close(session,'Intercambio cancelado: un jugador se desconectó.');
  }
}
