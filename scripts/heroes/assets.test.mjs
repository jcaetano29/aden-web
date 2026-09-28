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

test('metal armor exports independently tintable visible equipment slots',async()=>{for(const gender of ['male','female']){const d=await readGltf(`client/public/models/heroes/hero-${gender}.glb`);for(const slot of ['armor','gloves','boots','helmet'])assert.ok(d.json.materials.some(m=>m.name==='armor_steel_'+slot),gender+' '+slot);}});

test('every advertised body, face, hair and beard exists and fits the visible triangle budget',async()=>{
 const weapons={};for(const name of ['sword','shield','staff','axe','dagger','bow'])weapons[name]=inspectGltf(await readGltf(`client/public/models/heroes/${name}.glb`)).triangles;
 for(const gender of ['male','female']){
  const d=await readGltf(`client/public/models/heroes/hero-${gender}.glb`);
  const triangles=new Map(d.json.nodes.filter(n=>n.mesh!==undefined).map(n=>[n.name,d.json.meshes[n.mesh].primitives.reduce((sum,p)=>sum+d.json.accessors[p.indices].count/3,0)]));
  const faces=['soft','angular','noble','broad'],hairs=gender==='male'?['none','parted','buzzed','swept','mane','topknot']:['none','long','buns','cropped','bob','ponytail'],beards=gender==='male'?['none','full','goatee','mustache']:['none'];
  for(const [prefix,ids] of [['face_',faces],['hair_',hairs],['beard_',beards]])for(const id of ids)if(id!=='none')assert.ok(triangles.get(prefix+id)>0,gender+' '+prefix+id);
  for(const cls of ['knight','mage','barbarian','rogue','ranger'])for(const face of faces)for(const hair of hairs)for(const beard of beards){
   const outfit=[...triangles].filter(([name])=>name.startsWith('outfit_'+cls+'_')).reduce((sum,[,n])=>sum+n,0);
   const body=outfit+triangles.get('face_'+face)+(triangles.get('hair_'+hair)??0)+(triangles.get('beard_'+beard)??0)+triangles.get('hero_eyes')+triangles.get('hero_brows');
   const equipment=cls==='knight'?weapons.sword+weapons.shield:weapons[{mage:'staff',barbarian:'axe',rogue:'dagger',ranger:'bow'}[cls]];
   assert.ok(body+equipment<35000,`${gender}/${cls}/${face}/${hair}/${beard}: ${body+equipment}`);
  }
 }
});
