import * as THREE from 'three';
import {HERO_ANCHORS} from '../../assets/heroManifest.js';
export function makeModularHeroFixture(){
 const scene=new THREE.Group(),bones=Object.values(HERO_ANCHORS).map(name=>{const b=new THREE.Bone();b.name=name;return b;});
 scene.add(bones[0]);for(let i=1;i<bones.length;i++)bones[0].add(bones[i]);scene.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geometry.setIndex([0,1,2]);geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array(12).fill(0),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 for(const name of ['face_soft','face_angular','hero_eyes','hero_brows','hair_parted','hair_buzzed','hair_long','hair_buns','outfit_knight_cloth','outfit_knight_steel','outfit_knight_gold','outfit_mage_cloth','outfit_mage_robe','outfit_mage_gold']){
 const material=new THREE.MeshStandardMaterial({name:name.startsWith('face')?'skin':name.includes('hair')||name.includes('brows')?'hair':name==='hero_eyes'?'eyes':name.includes('steel')?'armor_steel':name.includes('gold')?'armor_gold':'cloth_knight'});
 const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;scene.add(mesh);mesh.bind(skeleton);
 }
 const animations=['Idle','Walk','Sword_Attack','Spell_Attack','Hit','Death'].map(name=>new THREE.AnimationClip(name,1,[new THREE.VectorKeyframeTrack(HERO_ANCHORS.rightHand+'.position',[0,1],[0,0,0,0,1,0])]));return {scene,animations};
}
export async function loadHeroFixture(url:string){if(url.includes('hero-'))return makeModularHeroFixture();const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.5,.1),new THREE.MeshStandardMaterial({name:'metal'})));return {scene,animations:[]};}
