import * as THREE from 'three';
import {ITEM_TEMPLATES,itemVisual,RARITY_VISUALS,type Rarity} from '@aden/shared';
import {WeaponModels,weaponVisualFamily,weaponIconUrl} from '../render/WeaponModels.js';
import {captureWeaponIcon} from './WeaponIconExport.js';
const repo=new WeaponModels(),button=document.querySelector<HTMLButtonElement>('button')!,status=document.querySelector('output')!;
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
await repo.preload();button.disabled=false;
button.addEventListener('click',()=>{const icons:Record<string,string>={};for(const base of Object.values(ITEM_TEMPLATES))for(const rarity of Object.keys(RARITY_VISUALS) as Rarity[]){const item={...base,rarity};const family=weaponVisualFamily(item),url=weaponIconUrl(item);if(!family||!url||icons[url])continue;const model=repo.create(family,itemVisual(item));icons[url]=captureWeaponIcon(renderer,model);repo.release(model);const image=new Image();image.src=icons[url];image.title=item.name;document.querySelector('#icons')!.append(image);}
 const blob=new Blob([JSON.stringify(icons)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='aden-weapon-icons.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`${Object.keys(icons).length} iconos exportados`;});
window.addEventListener('pagehide',()=>{repo.dispose();renderer.dispose();});
