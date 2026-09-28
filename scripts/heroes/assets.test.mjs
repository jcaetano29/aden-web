import {test} from 'node:test';import assert from 'node:assert/strict';
import {readGltf,inspectGltf,encodeGlb} from './gltf.mjs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {AnimationMixer,SkinnedMesh,Vector3} from 'three';
for(const gender of ['male','female'])test(`real ${gender} export has finite deformation in every sample animation`,async()=>{
 const d=await readGltf(`client/public/models/heroes/hero-${gender}.glb`),info=inspectGltf(d);assert.deepEqual([...info.clips].sort(),['Idle','Walk','Sword_Attack','Spell_Attack','Heavy_Attack','Dagger_Attack','Bow_Attack','Crossbow_Attack','Hit','Death'].sort());
 for(const m of d.json.materials){delete m.normalTexture;delete m.emissiveTexture;delete m.occlusionTexture;delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}d.json.images=[];d.json.textures=[];
 const bytes=encodeGlb(d.json,d.buffers[0]);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const mixer=new AnimationMixer(gltf.scene);for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).play();for(const fraction of [0,.25,.5,.75,.99]){mixer.setTime(clip.duration*fraction);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!(o instanceof SkinnedMesh))return;o.skeleton.update();const v=new Vector3();for(let i=0;i<o.geometry.attributes.position.count;i+=17){o.getVertexPosition(i,v);assert.ok(v.toArray().every(Number.isFinite),`${clip.name} ${o.name}`);assert.ok(v.length()<4,`${clip.name} ${o.name} unbounded deformation`);}});}}
 assert.ok(gltf.scene.getObjectByName('hair_'+(gender==='male'?'parted':'long')));assert.ok(gltf.scene.getObjectByName('hero_helmet'));
});
