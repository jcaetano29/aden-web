import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {itemVisual} from '@aden/shared';
import {WEAPON_MANIFEST,isSampleWeapon,type WeaponVisualFamily} from '../assets/weaponManifest.js';
import {instanceMaterials,disposeSources} from './HeroRig.js';
import type {HeroAsset,HeroLoader} from './ModularHeroFactory.js';
export class WeaponModels {
 private readonly assets=new Map<string,HeroAsset>();private loading?:Promise<void>;private disposed=false;
 private readonly instances=new Map<THREE.Group,Set<THREE.Material>>();
 constructor(private readonly load:HeroLoader=url=>new GLTFLoader().loadAsync(url)){}
 async preload(){if(this.disposed)throw Error('Repositorio de armas cerrado');if(this.assets.size===3)return;if(this.loading)return this.loading;
  this.loading=(async()=>{const entries=Object.entries(WEAPON_MANIFEST),results=await Promise.allSettled(entries.map(([,m])=>this.load(m.url)));const failure=results.find(r=>r.status==='rejected');if(failure||this.disposed){disposeSources(results.flatMap(r=>r.status==='fulfilled'?[r.value.scene]:[]));if(failure?.status==='rejected')throw failure.reason;throw Error('Repositorio de armas cerrado');}results.forEach((r,i)=>{if(r.status==='fulfilled')this.assets.set(entries[i][0],r.value);});})();try{await this.loading;}finally{this.loading=undefined;}
 }
 create(family:WeaponVisualFamily,finish?:ReturnType<typeof itemVisual>):THREE.Group {if(this.disposed||!isSampleWeapon(family))throw Error('Arma no disponible en la muestra');const asset=this.assets.get(family);if(!asset)throw Error('Arma no precargada');const root=asset.scene.clone(true),materials=instanceMaterials(root);if(finish)for(const m of materials){if(!(m instanceof THREE.MeshStandardMaterial))continue;m.color.lerp(new THREE.Color(finish.tint),.12);m.emissive.set(finish.color);m.emissiveIntensity=finish.glow*.3;}this.instances.set(root,materials);return root;}
 release(model:THREE.Group){const materials=this.instances.get(model);if(!materials)return;materials.forEach(m=>m.dispose());model.removeFromParent();this.instances.delete(model);}
 dispose(){if(this.disposed)return;this.disposed=true;for(const root of [...this.instances.keys()])this.release(root);disposeSources([...this.assets.values()].map(a=>a.scene));this.assets.clear();}
}
