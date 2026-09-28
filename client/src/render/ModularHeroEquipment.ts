import * as THREE from 'three';
import {getItem,itemVisual} from '@aden/shared';
import type {CharacterEquipment} from './CharacterFactory.js';
import {WEAPON_MANIFEST,isSampleWeapon,type SampleWeaponFamily} from '../assets/weaponManifest.js';
import type {HeroAnchor} from '../assets/heroManifest.js';
import {WeaponModels} from './WeaponModels.js';
export class ModularHeroEquipment implements CharacterEquipment {
 private signature='';private weapons:THREE.Group[]=[];private disposed=false;
 private readonly hair:{node:THREE.Object3D;visible:boolean}[]=[];
 private readonly helmets:THREE.Object3D[]=[];
 private readonly colors=new Map<THREE.MeshStandardMaterial,THREE.Color>();
 constructor(private readonly root:THREE.Object3D,private readonly anchors:Record<HeroAnchor,THREE.Object3D>,private readonly className:string,private readonly models:WeaponModels){
  root.traverse(o=>{if(o.name.startsWith('hair_'))this.hair.push({node:o,visible:o.visible});if(o.name==='hero_helmet'){this.helmets.push(o);o.visible=false;}if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&(m.name==='armor_steel'||m.name.startsWith('cloth_')))this.colors.set(m,m.color.clone());});
  this.update({});
 }
 private attach(family:SampleWeaponFamily,slot:string,id?:string){const entry=WEAPON_MANIFEST[family];const model=this.models.create(family,id?itemVisual(getItem(id)):undefined);model.name='equipped_'+slot;model.position.fromArray(entry.position);model.rotation.set(entry.rotation[0],entry.rotation[1],entry.rotation[2]);model.scale.setScalar(entry.scale);this.anchors[entry.anchor].add(model);this.weapons.push(model);}
 update(equipment:Record<string,string>){if(this.disposed)return;const signature=JSON.stringify(Object.entries(equipment).sort());if(signature===this.signature)return;this.signature=signature;this.weapons.forEach(w=>this.models.release(w));this.weapons=[];
  this.hair.forEach(h=>h.node.visible=!!equipment.helmet?false:h.visible);this.helmets.forEach(h=>h.visible=!!equipment.helmet);this.colors.forEach((c,m)=>m.color.copy(c));
  if(equipment.armor){const finish=itemVisual(getItem(equipment.armor));this.colors.forEach((_,m)=>m.color.lerp(new THREE.Color(finish.tint),.25));}
  const fallback=this.className==='mage'?'staff':'sword',family=equipment.weapon?itemVisual(getItem(equipment.weapon)).family:fallback;
  if(isSampleWeapon(family)&&family!=='shield')this.attach(family,'weapon',equipment.weapon);
  else if(!equipment.weapon)this.attach(fallback,'weapon');
  if(this.className==='knight'||equipment.shield)this.attach('shield','shield',equipment.shield);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.weapons.forEach(w=>this.models.release(w));this.weapons=[];this.hair.forEach(h=>h.node.visible=h.visible);this.helmets.forEach(h=>h.visible=false);this.colors.forEach((c,m)=>m.color.copy(c));}
}

