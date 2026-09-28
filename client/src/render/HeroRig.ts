import * as THREE from 'three';
import type {HeroAnchor} from '../assets/heroManifest.js';
export function resolveHeroAnchors(root:THREE.Object3D,names:Record<HeroAnchor,string>):Record<HeroAnchor,THREE.Object3D>{
 return Object.fromEntries(Object.entries(names).map(([key,name])=>{const node=root.getObjectByName(name);if(!node)throw new Error(`Falta el hueso ${name}`);return [key,node];})) as Record<HeroAnchor,THREE.Object3D>;
}
export function instanceMaterials(root:THREE.Object3D):Set<THREE.Material>{const copies=new Map<THREE.Material,THREE.Material>();root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const copy=(m:THREE.Material)=>{if(!copies.has(m))copies.set(m,m.clone());return copies.get(m)!;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);o.castShadow=true;o.frustumCulled=false;});return new Set(copies.values());}
/** Only the repository owns shared geometry, textures and source materials. */
export function disposeSources(roots:Iterable<THREE.Object3D>){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();for(const root of roots)root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const m of materials){for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();}geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());}
