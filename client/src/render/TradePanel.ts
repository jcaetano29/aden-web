import { getItem, RARITY_COLORS, EXCELLENT_LABELS, offensiveOptions, TRADE_MAX_ITEMS, TRANSFER_MAX_QTY, type TradeOffer, type TradeSnapshot } from '@aden/shared';
import { applyButton } from './theme.js';
import { itemIcon } from './ItemModels.js';
import './TradePanel.css';

export interface TradePanelData {
  selfId:string;
  connected:boolean;
  gold:number;
  entries:{itemTemplateId:string;qty:number}[];
  candidates:{id:string;name:string}[];
  trade:TradeSnapshot|null;
}
interface Handlers {
  onInvite(id:string):void;
  onRespond(tradeId:string,accept:boolean):void;
  onOffer(tradeId:string,revision:number,offer:TradeOffer):void;
  onConfirm(tradeId:string,revision:number):void;
  onCancel(tradeId:string):void;
}
function text(parent:HTMLElement,value:string,className=''):HTMLDivElement {
  const el=document.createElement('div');el.textContent=value;el.className=className;parent.append(el);return el;
}
function action(parent:HTMLElement,label:string,key:string,callback:()=>void):HTMLButtonElement {
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.setAttribute(`data-trade-${key}`,'');applyButton(button);button.addEventListener('click',callback);parent.append(button);return button;
}

function itemDetails(parent:HTMLElement,id:string,qty:number):void {
  const item=getItem(id),label=text(parent,'','trade-item-description');
  text(label,`${item.name} ×${qty}`).style.color=RARITY_COLORS[item.rarity??'common'];
  if(item.type!=='equipment')return;
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Ver atributos';details.append(summary);
  const facts:string[]=[];
  if(item.requiredLevel)facts.push(`Nivel requerido ${item.requiredLevel}`);
  const stats=item.bonuses;
  if(stats?.pAtk)facts.push(`Ataque +${stats.pAtk}`);if(stats?.pDef)facts.push(`Defensa +${stats.pDef}`);
  if(stats?.maxHp)facts.push(`Vida +${stats.maxHp}`);if(stats?.maxMp)facts.push(`Maná +${stats.maxMp}`);
  if(item.options?.luck)facts.push('Suerte');if(item.options?.skill)facts.push('Habilidad');
  if(item.options?.additional)facts.push(`Adicional +${item.options.additional}`);
  const excellent=EXCELLENT_LABELS[offensiveOptions(item)?'offensive':'defensive'];
  for(const option of item.options?.excellent??[])facts.push(excellent[option]);
  text(details,facts.join(' · ')||item.description||'Sin opciones adicionales');label.append(details);
}

/** Draft inputs remain local until saved. Confirm always refers to a server revision. */
export class TradePanel {
  readonly el=document.createElement('section');
  readonly button=document.createElement('button');
  private visible=false;
  private signature='';
  private data?:TradePanelData;
  private draftGold='0';
  private draftItems=new Map<string,string>();
  private dirty=false;
  private saveButton?:HTMLButtonElement;
  private confirmButton?:HTMLButtonElement;
  private draftStatus?:HTMLElement;

  constructor(private readonly handlers:Handlers) {
    this.el.className='aden-panel aden-scroll trade-panel';this.el.style.display='none';this.el.setAttribute('aria-label','Intercambio entre jugadores');
    this.button.type='button';this.button.className='trade-toggle';this.button.textContent='Trade · R';applyButton(this.button);this.button.style.display='none';
    this.button.setAttribute('aria-expanded','false');this.button.addEventListener('click',()=>this.toggle());
    for(const el of [this.el,this.button]) {
      el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('wheel',e=>e.stopPropagation());
    }
    this.el.addEventListener('keydown',e=>{if(e.key==='Escape')this.setVisible(false);e.stopPropagation();});
  }
  mount(parent:HTMLElement):void {parent.append(this.button,this.el);}
  toggle():void {this.setVisible(!this.visible);}
  setVisible(visible:boolean):void {this.visible=visible;this.el.style.display=visible?'block':'none';this.button.setAttribute('aria-expanded',String(visible));}

  update(data:TradePanelData):void {
    const previous=this.data?.trade;
    const own=data.trade?.participants.find(p=>p.id===data.selfId);
    const sessionChanged=data.trade?.id!==previous?.id;
    if(sessionChanged || !this.dirty) {
      this.draftGold=String(own?.offer.gold??0);this.draftItems=new Map(own?.offer.items.map(i=>[i.itemTemplateId,String(i.qty)])??[]);this.dirty=false;
    }
    if(data.trade && (sessionChanged||data.trade.phase!==previous?.phase))this.setVisible(true);
    this.data=data;
    this.button.style.display=data.connected?'block':'none';
    this.button.textContent=data.trade?'Trade pendiente · R':'Trade · R';
    // Changes in distant players don't tear down an active trade's inputs.
    const signature=JSON.stringify({...data,candidates:data.trade?[]:data.candidates});
    if(signature===this.signature)return;
    this.signature=signature;
    const focused=document.activeElement as HTMLInputElement|null;
    const focusKey=this.el.contains(focused)?focused?.dataset.tradeFocus:undefined;
    this.render(data);
    if(focusKey)this.el.querySelectorAll<HTMLInputElement>('[data-trade-focus]').forEach(input=>{if(input.dataset.tradeFocus===focusKey)input.focus({preventScroll:true});});
  }

  private offer():TradeOffer|null {
    const data=this.data;
    if(!data || this.draftGold.trim()==='')return null;
    const gold=Number(this.draftGold),items:TradeOffer['items']=[];
    if(!Number.isSafeInteger(gold)||gold<0||gold>data.gold)return null;
    for(const [itemTemplateId,value] of this.draftItems) {
      if(value.trim()==='')continue;
      const qty=Number(value),available=data.entries.find(i=>i.itemTemplateId===itemTemplateId)?.qty??0;
      if(!Number.isSafeInteger(qty)||qty<0||qty>Math.min(available,TRANSFER_MAX_QTY))return null;
      if(qty>0)items.push({itemTemplateId,qty});
    }
    return items.length<=TRADE_MAX_ITEMS?{gold,items}:null;
  }
  private updateActions():void {
    const trade=this.data?.trade,offer=this.offer(),own=trade?.participants.find(p=>p.id===this.data?.selfId);
    if(offer && own && offer.gold===own.offer.gold && offer.items.length===own.offer.items.length &&
      offer.items.every(item=>own.offer.items.some(saved=>saved.itemTemplateId===item.itemTemplateId && saved.qty===item.qty)))this.dirty=false;
    if(this.saveButton)this.saveButton.disabled=!this.dirty||!offer;
    if(this.confirmButton)this.confirmButton.disabled=this.dirty||!offer||!!own?.confirmed||!trade?.participants.some(p=>p.offer.gold>0||p.offer.items.length>0);
    if(this.draftStatus)this.draftStatus.textContent=!offer?'Revisá las cantidades y el oro disponible.':this.dirty?'Tenés cambios sin guardar. Guardá la oferta antes de confirmar.':'Oferta guardada. Cualquier cambio requiere confirmar de nuevo.';
  }

  private render(data:TradePanelData):void {
    this.el.replaceChildren();this.saveButton=undefined;this.confirmButton=undefined;
    const header=text(this.el,'','trade-header');text(header,'Intercambio','trade-title');action(header,'Cerrar','close',()=>this.setVisible(false));
    if(!data.connected){text(this.el,'Estás desconectado. Volvé a entrar para intercambiar.');return;}
    const trade=data.trade;
    if(!trade) {
      text(this.el,'Jugadores cercanos','trade-subtitle');
      text(this.el,'Acercate para intercambiar oro y objetos. Ambos deben confirmar la oferta.','trade-hint');
      if(!data.candidates.length)text(this.el,'No hay jugadores disponibles cerca.','trade-empty');
      for(const candidate of data.candidates){const row=text(this.el,'','trade-candidate');text(row,candidate.name);action(row,'Invitar','invite',()=>this.handlers.onInvite(candidate.id));}
      return;
    }
    const self=trade.participants.find(p=>p.id===data.selfId)!,other=trade.participants.find(p=>p.id!==data.selfId)!;
    if(trade.phase==='invited') {
      if(trade.inviterId===data.selfId)text(this.el,`Esperando que ${other.name} acepte tu invitación…`);
      else {text(this.el,`${other.name} quiere intercambiar con vos.`);action(this.el,'Aceptar','accept',()=>this.handlers.onRespond(trade.id,true));action(this.el,'Rechazar','reject',()=>this.handlers.onRespond(trade.id,false));}
      text(this.el,'La invitación vence en 30 segundos.','trade-hint');
      action(this.el,'Cancelar invitación','cancel',()=>this.handlers.onCancel(trade.id));return;
    }
    text(this.el,`Con ${other.name}. Permanecé cerca; el intercambio vence a los 2 minutos.`,'trade-hint');
    const columns=text(this.el,'','trade-columns'),mine=text(columns,'','trade-offer'),theirs=text(columns,'','trade-offer');
    text(mine,'Tu oferta','trade-subtitle');text(mine,`Oro disponible: ${data.gold.toLocaleString('es')}`,'trade-hint');
    const label=document.createElement('label');label.textContent='Oro a entregar';label.className='trade-gold-label';
    const gold=document.createElement('input');gold.type='number';gold.min='0';gold.max=String(data.gold);gold.step='1';gold.value=this.draftGold;gold.dataset.tradeGold='';gold.dataset.tradeFocus='gold';gold.setAttribute('aria-label','Oro a entregar');
    gold.addEventListener('input',()=>{this.draftGold=gold.value;this.dirty=true;this.updateActions();});label.append(gold);mine.append(label);
    text(mine,`Elegí cantidades (hasta ${TRADE_MAX_ITEMS} objetos distintos).`,'trade-hint');
    const inventory=text(mine,'','trade-inventory aden-scroll');
    if(!data.entries.length)text(inventory,'Tu inventario está vacío. Podés ofrecer oro.','trade-empty');
    for(const entry of data.entries) {
      let item;try{item=getItem(entry.itemTemplateId);}catch{continue;}if(item.type==='currency')continue;
      const row=text(inventory,'','trade-item');row.append(itemIcon(entry.itemTemplateId));
      itemDetails(row,entry.itemTemplateId,entry.qty);
      const input=document.createElement('input');input.type='number';input.min='0';input.max=String(Math.min(entry.qty,TRANSFER_MAX_QTY));input.step='1';input.value=this.draftItems.get(entry.itemTemplateId)??'0';
      input.dataset.tradeItemQty=entry.itemTemplateId;input.dataset.tradeFocus=entry.itemTemplateId;input.setAttribute('aria-label',`Cantidad de ${item.name}`);
      input.addEventListener('input',()=>{this.draftItems.set(entry.itemTemplateId,input.value);this.dirty=true;this.updateActions();});row.append(input);
    }
    this.saveButton=action(mine,'Guardar oferta','save',()=>{const offer=this.offer();if(offer)this.handlers.onOffer(trade.id,trade.revision,offer);});
    text(theirs,`Oferta de ${other.name}`,'trade-subtitle');text(theirs,`${other.offer.gold.toLocaleString('es')} de oro`,'trade-gold');
    if(!other.offer.items.length)text(theirs,'Sin objetos ofrecidos.','trade-empty');
    for(const entry of other.offer.items){const row=text(theirs,'','trade-item');row.append(itemIcon(entry.itemTemplateId));itemDetails(row,entry.itemTemplateId,entry.qty);}
    text(theirs,other.confirmed?'Confirmó esta oferta':'Todavía no confirmó',other.confirmed?'trade-ready':'trade-hint');
    this.draftStatus=text(this.el,'','trade-status');this.draftStatus.setAttribute('role','status');
    const footer=text(this.el,'','trade-footer');
    this.confirmButton=action(footer,self.confirmed?'Confirmado · esperando':'Confirmar intercambio','confirm',()=>this.handlers.onConfirm(trade.id,trade.revision));
    action(footer,'Cancelar intercambio','cancel',()=>this.handlers.onCancel(trade.id));this.updateActions();
  }
}
