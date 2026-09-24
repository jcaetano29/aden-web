// @vitest-environment jsdom
import { describe,it,expect,vi,afterEach } from 'vitest';
import { createItemInstance,getItem,type TradeSnapshot } from '@aden/shared';
import { TradePanel,type TradePanelData } from './TradePanel.js';

afterEach(()=>{document.body.replaceChildren();});
const snapshot=():TradeSnapshot=>({id:'trade-1',inviterId:'a',phase:'active',revision:2,expiresAt:Date.now()+120000,participants:[
  {id:'a',name:'Ana',offer:{gold:0,items:[]},confirmed:false},
  {id:'b',name:'Beto',offer:{gold:25,items:[{itemTemplateId:'iron_sword',qty:1}]},confirmed:false},
]});
function setup(trade:TradeSnapshot|null=null){
  const handlers={onInvite:vi.fn(),onRespond:vi.fn(),onOffer:vi.fn(),onConfirm:vi.fn(),onCancel:vi.fn()};
  const panel=new TradePanel(handlers);panel.mount(document.body);
  const data:TradePanelData={selfId:'a',connected:true,gold:100,entries:[{itemTemplateId:'bone',qty:7}],candidates:[{id:'b',name:'Beto'}],trade};
  panel.update(data);return {panel,handlers,data};
}
describe('TradePanel',()=>{
  it('shows the actual equipment options on both offer sides',()=>{
    const trade=snapshot(),id=createItemInstance(getItem('aden_punal_del_umbral'),{quality:'excellent',level:9,luck:true,skill:true,additional:12,excellent:[0]},'inspect');
    trade.participants[1].offer.items=[{itemTemplateId:id,qty:1}];
    const {panel,data}=setup(trade);panel.update({...data,entries:[{itemTemplateId:id,qty:1}]});
    const details=panel.el.querySelectorAll('details');expect(details).toHaveLength(2);
    for(const detail of details){expect(detail.textContent).toContain('Suerte');expect(detail.textContent).toContain('Habilidad');expect(detail.textContent).toContain('Adicional +12');expect(detail.textContent).toContain('Golpe excelente +10%');}
  });
  it('lists nearby players and surfaces invitations without interpreting player names as HTML',()=>{
    const {panel,handlers,data}=setup();panel.button.click();panel.el.querySelector<HTMLButtonElement>('[data-trade-invite]')!.click();expect(handlers.onInvite).toHaveBeenCalledWith('b');
    const trade=snapshot();trade.phase='invited';trade.inviterId='b';trade.participants[1].name='<img src=x>';
    panel.update({...data,trade});expect(panel.el.style.display).not.toBe('none');expect(panel.el.textContent).toContain('<img src=x>');expect(panel.el.querySelector('img')).toBeNull();
    panel.el.querySelector<HTMLButtonElement>('[data-trade-accept]')!.click();expect(handlers.onRespond).toHaveBeenCalledWith('trade-1',true);
  });
  it('submits quantities and gold, disables confirmation with unsaved edits, preserves draft on peer update',()=>{
    const {panel,handlers,data}=setup(snapshot());
    const gold=panel.el.querySelector<HTMLInputElement>('[data-trade-gold]')!;gold.value='12';gold.dispatchEvent(new Event('input'));
    const qty=panel.el.querySelector<HTMLInputElement>('[data-trade-item-qty]')!;qty.value='3';qty.dispatchEvent(new Event('input'));
    expect(panel.el.querySelector<HTMLButtonElement>('[data-trade-confirm]')!.disabled).toBe(true);
    const trade=snapshot();trade.revision=3;trade.participants[1].offer.gold=30;panel.update({...data,trade});
    expect(panel.el.querySelector<HTMLInputElement>('[data-trade-gold]')!.value).toBe('12');
    panel.el.querySelector<HTMLButtonElement>('[data-trade-save]')!.click();expect(handlers.onOffer).toHaveBeenCalledWith('trade-1',3,{gold:12,items:[{itemTemplateId:'bone',qty:3}]});
    trade.revision=4;trade.participants[0].offer={gold:12,items:[{itemTemplateId:'bone',qty:3}]};panel.update({...data,trade});
    panel.el.querySelector<HTMLButtonElement>('[data-trade-confirm]')!.click();expect(handlers.onConfirm).toHaveBeenCalledWith('trade-1',4);
    panel.el.querySelector<HTMLButtonElement>('[data-trade-cancel]')!.click();expect(handlers.onCancel).toHaveBeenCalledWith('trade-1');
  });
  it('disables invalid offers and clears a terminated trade on disconnect',()=>{
    const {panel,data}=setup(snapshot());const gold=panel.el.querySelector<HTMLInputElement>('[data-trade-gold]')!;
    gold.value='101';gold.dispatchEvent(new Event('input'));expect(panel.el.querySelector<HTMLButtonElement>('[data-trade-save]')!.disabled).toBe(true);
    panel.update({...data,connected:false,trade:null});expect(panel.el.querySelector('[data-trade-confirm]')).toBeNull();expect(panel.el.textContent).toContain('desconectado');
  });
  it('keeps newer typing when acknowledgement for a previous save arrives',()=>{
    const {panel,data}=setup(snapshot());const input=panel.el.querySelector<HTMLInputElement>('[data-trade-gold]')!;
    input.value='10';input.dispatchEvent(new Event('input'));panel.el.querySelector<HTMLButtonElement>('[data-trade-save]')!.click();
    input.value='12';input.dispatchEvent(new Event('input'));
    const trade=snapshot();trade.revision=3;trade.participants[0].offer.gold=10;panel.update({...data,trade});
    expect(panel.el.querySelector<HTMLInputElement>('[data-trade-gold]')!.value).toBe('12');expect(panel.el.querySelector<HTMLButtonElement>('[data-trade-confirm]')!.disabled).toBe(true);
  });
});
