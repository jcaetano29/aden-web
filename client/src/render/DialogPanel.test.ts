// @vitest-environment jsdom
import { it,expect,vi } from 'vitest';
import { DialogPanel } from './DialogPanel.js';
it('offers shop access independently of a contract and clears it for other NPCs',()=>{
  const parent=document.createElement('div'),dialog=new DialogPanel(parent),contract=vi.fn(),shop=vi.fn();
  dialog.open({speaker:'Boren',text:'Encargo',actionLabel:'Aceptar encargo',onAction:contract,secondaryAction:{label:'Comprar provisiones',onAction:shop}});
  const buttons=[...parent.querySelectorAll('button')];buttons.find(b=>b.textContent==='Comprar provisiones')!.click();
  expect(shop).toHaveBeenCalledOnce();expect(contract).not.toHaveBeenCalled();expect(dialog.isOpen()).toBe(false);
  dialog.open({speaker:'Iria',text:'Archivo',actionLabel:'Aceptar',onAction:contract});
  expect(buttons[1].style.display).toBe('none');buttons[0].click();expect(contract).toHaveBeenCalledOnce();dialog.remove();
});
