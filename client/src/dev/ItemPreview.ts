import * as THREE from 'three';
import { ITEM_TEMPLATES,getItem,itemVisual,createItemInstance } from '@aden/shared';
import {createItemModel,itemIcon,disposeItemModels} from '../render/ItemModels.js';
import {preloadMaterialAtlas} from '../render/materialAtlas.js';
import {GroundItems} from '../render/GroundItems.js';
import {CharacterFactory} from '../render/CharacterFactory.js';
import {EquipmentViews} from '../render/EquipmentViews.js';

await preloadMaterialAtlas();
const scene=new THREE.Scene();scene.background=new THREE.Color('#17212b');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,560);document.querySelector('#stage')!.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(42,innerWidth/560,.1,100);camera.position.set(0,12,17);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xe9f2ff,0x39402c,2));const sun=new THREE.DirectionalLight(0xffeccd,3);sun.position.set(-3,9,7);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0x273039,roughness:.9}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const drops=new GroundItems(scene);drops.setMap('preview');
const catalog=document.querySelector('#catalog')!;
const bases=Object.values(ITEM_TEMPLATES),families=[...new Map(bases.map(i=>[itemVisual(i).family,i.id])).values()];
const base=getItem('aden_punal_del_umbral');
const rarities=['worn_sword','iron_sword','bone_blade','ember_axe','crown_blade',createItemInstance(base,{quality:'magic',luck:true},'previewmagic'),createItemInstance(base,{quality:'excellent',excellent:[0]},'previewexcellent')];
let ids:string[]=[],heroes:THREE.Object3D[]=[];
function show(list:string[]) {
  camera.position.set(0,9,12);camera.lookAt(0,0,0);
  ids.forEach(id=>drops.remove(id));heroes.forEach(h=>h.removeFromParent());heroes=[];catalog.replaceChildren();
  ids=list.map((_,i)=>String(i));const cols=Math.min(list.length,list.length>50?20:7),rows=Math.ceil(list.length/cols),spacing=list.length>50?.85:2.25;
  list.forEach((id,i)=>{
    drops.add(String(i),id,(i%cols-(cols-1)/2)*spacing,(Math.floor(i/cols)-(rows-1)/2)*spacing,'preview');
    const row=document.createElement('article');row.append(itemIcon(id),document.createTextNode(getItem(id).name));catalog.append(row);
  });
  document.querySelector('#status')!.textContent=`${bases.length} bases cubiertas · ${families.length} familias · ${list.length} objetos mostrados`;
}
document.querySelector('#families')!.addEventListener('click',()=>show(families));
document.querySelector('#rarities')!.addEventListener('click',()=>show(rarities));
document.querySelector('#stress')!.addEventListener('click',()=>show(Array.from({length:300},(_,i)=>families[i%families.length])));
document.querySelector('#equipment')!.addEventListener('click',async()=>{
  show([]);camera.position.set(0,3.5,9);camera.lookAt(0,1,0);const factory=new CharacterFactory();await factory.preload(['Knight','Mage','Ranger','Barbarian']);
  ['Knight','Mage','Ranger','Barbarian'].forEach((name,i)=>{
    const hero=factory.create(name).root;scene.add(hero);hero.position.x=(i-1.5)*3;
    const eq=new EquipmentViews(hero);eq.update({weapon:['crown_blade','aden_baston_del_huesero','aden_arco_de_la_senda','ember_axe'][i],armor:'crypt_plate',helmet:bases.find(b=>b.slot==='helmet')!.id,gloves:bases.find(b=>b.slot==='gloves')!.id,boots:bases.find(b=>b.slot==='boots')!.id,pants:bases.find(b=>b.slot==='pants')!.id,...(i===0?{accessory:'skull_crown'}:i===2?{wings:bases.find(b=>b.slot==='wings')!.id}:{})});heroes.push(hero);
  });
});
const ray=new THREE.Raycaster();renderer.domElement.addEventListener('pointermove',e=>{const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);drops.hover(ray);});
show(families);
let last=performance.now(),report=last,frames=0;
renderer.setAnimationLoop(()=>{const now=performance.now();drops.update((now-last)/1000,camera);last=now;renderer.render(scene,camera);frames++;
  if(now-report>1000){document.querySelector('#status')!.textContent=`${bases.length} bases · ${families.length} familias · ${ids.length} drops · ${renderer.info.render.calls} draw calls · ${renderer.info.memory.geometries} geometrías · ${Math.round(frames*1000/(now-report))} FPS`;report=now;frames=0;}
});
window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);drops.dispose();disposeItemModels();renderer.dispose();});
