import * as THREE from 'three';
import {getItem,itemVisual} from '@aden/shared';
import type {CharacterEquipment} from './CharacterFactory.js';
import {WEAPON_MANIFEST,type SampleWeaponFamily} from '../assets/weaponManifest.js';
import type {HeroAnchor} from '../assets/heroManifest.js';
import {WeaponModels,weaponVisualFamily} from './WeaponModels.js';
import {createItemModel} from './ItemModels.js';
const defaults:Record<string,SampleWeaponFamily>={knight:'sword',mage:'staff',barbarian:'axe',rogue:'dagger',ranger:'bow'};
export class ModularHeroEquipment implements CharacterEquipment {
 private signature='';private weapons:THREE.Group[]=[];private extras:THREE.Object3D[]=[];private disposed=false;
 private readonly hair:{node:THREE.Object3D;visible:boolean}[]=[];
 private readonly helmets:THREE.Object3D[]=[];
 private readonly colors=new Map<THREE.MeshStandardMaterial,THREE.Color>();
 private readonly reference=new Map<THREE.Object3D,THREE.Matrix4>();
 constructor(private readonly root:THREE.Object3D,private readonly anchors:Record<HeroAnchor,THREE.Object3D>,private readonly className:string,private readonly models:WeaponModels){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert();
  root.traverse(o=>{this.reference.set(o,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(o.name.startsWith('hair_'))this.hair.push({node:o,visible:o.visible});if(o.name==='hero_helmet'){this.helmets.push(o);o.visible=false;}if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&!['skin','skin_hands','hair','eyes'].includes(m.name))this.colors.set(m,m.color.clone());});
  this.update({});
 }
 private attach(family:SampleWeaponFamily,slot:string,id?:string){const entry=WEAPON_MANIFEST[family];const model=this.models.create(family,id?itemVisual(getItem(id)):undefined);model.name='equipped_'+slot;model.position.fromArray(entry.position);model.rotation.set(entry.rotation[0],entry.rotation[1],entry.rotation[2]);model.scale.setScalar(entry.scale);this.anchors[entry.anchor].add(model);this.weapons.push(model);}
 private accessory(id:string,slot:string,anchor:THREE.Object3D,offset:THREE.Vector3,scale:number){const model=createItemModel(id),bind=this.reference.get(anchor)!;model.name='equipped_'+slot;model.userData.equipped=true;model.position.setFromMatrixPosition(bind).add(offset);model.scale.setScalar(scale);if(slot==='wings')model.rotation.y=Math.PI;model.updateMatrix();bind.clone().invert().multiply(model.matrix).decompose(model.position,model.quaternion,model.scale);anchor.add(model);this.extras.push(model);}
 update(equipment:Record<string,string>){if(this.disposed)return;const signature=JSON.stringify(Object.entries(equipment).sort());if(signature===this.signature)return;this.signature=signature;this.weapons.forEach(w=>this.models.release(w));this.weapons=[];this.extras.forEach(o=>o.removeFromParent());this.extras=[];
  const crown=equipment.helmet||Object.values(equipment).find(id=>id&&itemVisual(getItem(id)).family==='crown');
  this.hair.forEach(h=>h.node.visible=crown?false:h.visible);this.helmets.forEach(h=>h.visible=!!crown);this.colors.forEach((c,m)=>m.color.copy(c));
  const outfit=equipment.armor?({metal:'knight',bone:'knight',leather:'ranger',cloth:'mage'}[itemVisual(getItem(equipment.armor)).surface]??this.className):this.className;
  this.root.traverse(o=>{if(o.name.startsWith('outfit_'))o.visible=o.name.startsWith('outfit_'+outfit+'_');});
  for(const [slot,id] of Object.entries(equipment)){if(!id)continue;const finish=itemVisual(getItem(id));
   if(['armor','pants','gloves','boots','helmet'].includes(slot))this.colors.forEach((_,m)=>{if(m.name.endsWith('_'+slot)||(slot==='armor'&&['robe','armor_steel'].includes(m.name)))m.color.lerp(new THREE.Color(finish.tint),.35);});
   if(slot==='accessory'&&finish.family!=='crown')this.accessory(id,slot,this.anchors.torso,new THREE.Vector3(0,-.08,.19),.22);
   if(slot==='ring')this.accessory(id,slot,this.anchors.rightHand,new THREE.Vector3(0,0,.015),.06);
   if(slot==='wings')this.accessory(id,slot,this.anchors.torso,new THREE.Vector3(0,0,-.18),.9);
   if(slot==='pet')this.accessory(id,slot,this.root,new THREE.Vector3(.8,.2,0),.5);
  }
  const family=equipment.weapon?weaponVisualFamily(getItem(equipment.weapon)):(defaults[this.className]??'sword');
  this.root.userData.weaponFamily=family;
  if(family&&family!=='shield')this.attach(family,'weapon',equipment.weapon);
  if(equipment.shield||this.className==='knight'&&!['bow','crossbow','staff','spear'].includes(family??''))this.attach('shield','shield',equipment.shield);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.weapons.forEach(w=>this.models.release(w));this.weapons=[];this.extras.forEach(o=>o.removeFromParent());this.extras=[];this.hair.forEach(h=>h.node.visible=h.visible);this.helmets.forEach(h=>h.visible=false);this.colors.forEach((c,m)=>m.color.copy(c));}
}
