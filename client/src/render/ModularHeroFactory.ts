import {applyFaceMarking} from './HeroMarkings.js';
import {WeaponModels} from './WeaponModels.js';
import {ModularHeroEquipment} from './ModularHeroEquipment.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {appearanceKey,APPEARANCE_CATALOG,validateAppearance,type CharacterAppearanceV1,type AppearanceField} from '@aden/shared';
import {HERO_MANIFEST,HERO_ANCHORS,HERO_CLIPS,CLASS_ATTACK,SAMPLE_HERO_CLASSES} from '../assets/heroManifest.js';
import {resolveHeroAnchors,instanceMaterials,disposeSources} from './HeroRig.js';
import type {Character} from './CharacterFactory.js';
export interface HeroAsset {scene:THREE.Group;animations:THREE.AnimationClip[]}
export type HeroLoader=(url:string)=>Promise<HeroAsset>;
const color=(a:CharacterAppearanceV1,field:AppearanceField)=>APPEARANCE_CATALOG[field].find(o=>o.id===a[field])!.hex!;
export class ModularHeroFactory {
 readonly weaponModels:WeaponModels;
 private readonly assets=new Map<string,HeroAsset>();
 private loading:Promise<void>|undefined;
 private disposed=false;
 private readonly live=new Set<Character>();
 constructor(private readonly load:HeroLoader=(url)=>new GLTFLoader().loadAsync(url)){this.weaponModels=new WeaponModels(load);}
 async preload():Promise<void>{
  if(this.disposed)throw Error('Repositorio de héroes cerrado');if(this.assets.size===2)return;if(this.loading)return this.loading;
  this.loading=(async()=>{await this.weaponModels.preload();const entries=Object.entries(HERO_MANIFEST);const results=await Promise.allSettled(entries.map(([,m])=>this.load(m.url)));const failure=results.find(r=>r.status==='rejected');
   if(failure||this.disposed){disposeSources(results.flatMap(r=>r.status==='fulfilled'?[r.value.scene]:[]));if(failure?.status==='rejected')throw failure.reason;throw Error('Repositorio de héroes cerrado');}
   try{for(const r of results)if(r.status==='fulfilled'){resolveHeroAnchors(r.value.scene,HERO_ANCHORS);for(const clip of ['Idle','Walk','Sword_Attack','Spell_Attack','Heavy_Attack','Dagger_Attack','Bow_Attack','Crossbow_Attack','Hit','Death'])if(!r.value.animations.some(a=>a.name===clip))throw Error(`Falta la animación ${clip}`);}}catch(error){disposeSources(results.flatMap(r=>r.status==='fulfilled'?[r.value.scene]:[]));throw error;}results.forEach((r,i)=>{if(r.status==='fulfilled')this.assets.set(entries[i][0],r.value);});
  })();try{await this.loading;}finally{this.loading=undefined;}
 }
 create(className:string,input:CharacterAppearanceV1):Character {
  if(this.disposed)throw Error('Repositorio de héroes cerrado');if(!(SAMPLE_HERO_CLASSES as readonly string[]).includes(className))throw Error('Clase fuera de la muestra');
  const appearance=validateAppearance(input),asset=this.assets.get(appearance.gender);if(!asset)throw Error('Héroe no precargado');
  const model=cloneSkeleton(asset.scene),materials=instanceMaterials(model),skeletons=new Set<THREE.Skeleton>();model.traverse(o=>{if(o instanceof THREE.SkinnedMesh)skeletons.add(o.skeleton);});resolveHeroAnchors(model,HERO_ANCHORS);
  const outfit=new THREE.Group();outfit.name='hero_default_outfit';model.add(outfit);
  const parts:THREE.Object3D[]=[];model.traverse(o=>{if(o.name.startsWith('outfit_'))parts.push(o);if(o.name.startsWith('face_'))o.visible=o.name==='face_'+appearance.faceId;if(o.name.startsWith('hair_'))o.visible=o.name==='hair_'+appearance.hairStyleId;if(o.name.startsWith('beard_'))o.visible=o.name==='beard_'+appearance.facialHairId;});for(const part of parts){part.visible=part.name.startsWith('outfit_'+className+'_');outfit.add(part);}
  for(const material of materials){if(!(material instanceof THREE.MeshStandardMaterial))continue;if(material.name.startsWith('skin')){material.color.set(color(appearance,'skinToneId'));if(material.name==='skin')applyFaceMarking(material,appearance.markingId,appearance.gender);}else if(material.name==='hair')material.color.set(color(appearance,'hairColorId'));else if(material.name==='eyes'){
   const iris=new THREE.Color(color(appearance,'eyeColorId'));material.onBeforeCompile=shader=>{shader.uniforms.irisTint={value:iris};shader.fragmentShader='uniform vec3 irisTint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= mix(irisTint, vec3(1.0), smoothstep(0.65, 0.92, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b))));');};material.customProgramCacheKey=()=> 'hero-iris-v1';
  }}
  const root=new THREE.Group(),normalized=new THREE.Group();normalized.scale.setScalar(HERO_MANIFEST[appearance.gender].height/(appearance.gender==='male'?1.815:1.78));normalized.position.y=.012;normalized.add(model);root.add(normalized);root.userData.visualHeight=2.5;root.userData.appearanceKey=appearanceKey(appearance);
  const mixer=new THREE.AnimationMixer(model),actions=new Map<string,THREE.AnimationAction>();
  for(const [alias,source]of Object.entries(HERO_CLIPS)){const name=alias==='Primary_Attack'?(CLASS_ATTACK[className]??source):source;const clip=asset.animations.find(c=>c.name===name);if(!clip)throw Error(`Falta la animación ${name}`);actions.set(alias,mixer.clipAction(clip));}
  for(const name of ['Bow_Attack','Crossbow_Attack','Dagger_Attack','Heavy_Attack','Spell_Attack','Sword_Attack']){const clip=asset.animations.find(c=>c.name===name);if(clip)actions.set(name,mixer.clipAction(clip));}
  const choose=(name:string)=>name==='Primary_Attack'?({bow:'Bow_Attack',crossbow:'Crossbow_Attack',dagger:'Dagger_Attack',axe:'Heavy_Attack',mace:'Heavy_Attack',staff:'Spell_Attack'}[model.userData.weaponFamily as string]??'Sword_Attack'):name;
  let current:THREE.AnimationAction|undefined,once:THREE.AnimationAction|undefined,callback:(()=>void)|undefined,released=false;
  const onFinished=(e:{action:THREE.AnimationAction})=>{if(e.action!==once)return;const done=callback;once=undefined;callback=undefined;done?.();};mixer.addEventListener('finished',onFinished);
  const hero:Character={root,mixer,clipNames:[...actions.keys()],play(name,immediate=false){if(released)return;const next=actions.get(choose(name));if(!next)return;if(next===current&&!immediate&&!once)return;once=undefined;callback=undefined;if(immediate)mixer.stopAllAction();next.reset().setLoop(THREE.LoopRepeat,Infinity);next.clampWhenFinished=false;next.setEffectiveWeight(1).setEffectiveTimeScale(1);if(!immediate)next.fadeIn(.18);if(current&&current!==next&&!immediate)current.fadeOut(.18);next.play();current=next;if(immediate)mixer.update(0);},playOnce(name,done){if(released)return;const next=actions.get(choose(name));if(!next){done();return;}if(current&&current!==next)current.fadeOut(.1);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(THREE.LoopOnce,1).fadeIn(.1).play();next.clampWhenFinished=true;current=once=next;callback=done;},dispose:()=>{if(released)return;released=true;callback=undefined;mixer.removeEventListener('finished',onFinished);mixer.stopAllAction();mixer.uncacheRoot(model);materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());root.removeFromParent();this.live.delete(hero);}};
  hero.equipment=new ModularHeroEquipment(model,resolveHeroAnchors(model,HERO_ANCHORS),className,this.weaponModels);this.live.add(hero);hero.play('Idle',true);return hero;
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const h of [...this.live]){h.equipment?.dispose();h.dispose?.();}disposeSources([...this.assets.values()].map(a=>a.scene));this.assets.clear();this.weaponModels.dispose();}
}

