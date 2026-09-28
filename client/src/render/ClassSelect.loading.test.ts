// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {ClassSelect} from './ClassSelect.js';
import type {CharacterFactory} from './CharacterFactory.js';
const preview=()=>({show:vi.fn(),rotate:vi.fn(),zoom:vi.fn(),focus:vi.fn(),setVisible:vi.fn(),dispose:vi.fn()});
const factory={} as CharacterFactory;
afterEach(()=>document.body.replaceChildren());
it('keeps latest choices across rejected preload and retry and prevents invalid creation',async()=>{
 let reject!:(e:Error)=>void,resolve!:()=>void;let attempt=0;const view=preview();
 const select=new ClassSelect(document.body,factory,{createPreview:()=>view,loadAssets:()=>new Promise<void>((yes,no)=>{resolve=yes;reject=no;attempt++;})});const result=select.create();document.querySelector<HTMLButtonElement>('[data-mode="create"]')!.click();
 document.querySelector<HTMLButtonElement>('[data-class="mage"]')!.click();document.querySelector<HTMLInputElement>('input[value="female"]')!.click();
 const face=document.querySelector<HTMLSelectElement>('[aria-label="Rostro"]')!;face.value='noble';face.dispatchEvent(new Event('change'));
 const name=document.querySelector<HTMLInputElement>('input[type="text"]')!,pass=document.querySelector<HTMLInputElement>('input[type="password"]')!;name.value='LatestHero';pass.value='test123';name.dispatchEvent(new Event('input'));pass.dispatchEvent(new Event('input'));
 const submit=document.querySelector<HTMLButtonElement>('.character-enter')!;expect(submit.disabled).toBe(true);reject(Error('offline'));await vi.waitFor(()=>expect(document.body.textContent).toContain('No se pudieron cargar los personajes'));
 document.querySelector<HTMLButtonElement>('.character-retry')!.click();resolve();await vi.waitFor(()=>expect(submit.disabled).toBe(false));expect(attempt).toBe(2);expect(view.show).toHaveBeenLastCalledWith('mage',expect.objectContaining({gender:'female',faceId:'noble'}));submit.click();expect(await result).toMatchObject({className:'mage',appearance:{gender:'female',faceId:'noble'}});select.remove();
});
