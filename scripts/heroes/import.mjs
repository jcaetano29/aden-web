import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Matrix4,Color} from 'three';
import {readGltf,inspectGltf} from './gltf.mjs';
import {Builder,hierarchy,extract,headVariant,addAnimations,emptyGeometry,appendGeometry} from './build.mjs';
import {armor,staff} from './wardrobe.mjs';
const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const selection=JSON.parse((await readFile(option('--selection','scripts/heroes/source-selection.json'),'utf8')).replace(/^\uFEFF/,''));
const out=option('--out','client/public/models/heroes');await mkdir(out,{recursive:true});const cache='artifacts/source-models/heroes/texture-cache';await mkdir(cache,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');const docs=new Map();
for(const [id,pack]of Object.entries(selection.packs)){const license=await readFile(pack.licensePath);if(sha(license)!==pack.licenseSha256||!license.toString().includes('CC0 1.0'))throw Error(`Unlicensed pack ${id}`);}
for(const e of selection.entries){if(e.license!=='CC0-1.0'||e.edition!=='Standard')throw Error(`Unlicensed source ${e.id}`);for(const [file,hash] of Object.entries(e.files))if(sha(await readFile(file))!==hash)throw Error(`Source hash mismatch ${file}`);const doc=await readGltf(e.sourcePath);inspectGltf(doc);docs.set(e.id,doc);}
const entry=id=>selection.entries.find(e=>e.id===id),doc=id=>docs.get(id);
async function texture(builder,id,textureIndex,channel='raw',size=1024){
 const d=doc(id),e=entry(id),im=d.json.images[d.json.textures[textureIndex].source];if(!im.uri)throw Error('Expected audited external image');
 const input=resolve(dirname(e.sourcePath),e.uriRemaps[im.uri]??im.uri);const output=resolve(cache,sha(input+channel+size+await readFile('scripts/heroes/texture.py','utf8'))+'.jpg');
 try{await readFile(output);}catch{execFileSync(process.env.HERO_PYTHON??'python',['scripts/heroes/texture.py',input,output,channel,String(size)],{stdio:'pipe'});}
 return builder.image(await readFile(output),`${id}_${channel}`);
}
async function material(builder,id,matIndex,name,channel='raw',color=0xffffff,metalness=0,roughness=.7){
 const src=doc(id).json.materials[matIndex];const mat={name,pbrMetallicRoughness:{baseColorFactor:[...new Color(color).toArray(),1],metallicFactor:metalness,roughnessFactor:roughness}};
 if(src.pbrMetallicRoughness?.baseColorTexture)mat.pbrMetallicRoughness.baseColorTexture={index:await texture(builder,id,src.pbrMetallicRoughness.baseColorTexture.index,channel,channel==='skin'?2048:1024)};
 if(src.normalTexture)mat.normalTexture={index:await texture(builder,id,src.normalTexture.index,'raw',1024),scale:.55};
 if(src.alphaMode)mat.alphaMode=src.alphaMode;if(src.alphaCutoff)mat.alphaCutoff=src.alphaCutoff;if(src.doubleSided)mat.doubleSided=true;
 const index=builder.json.materials.length;builder.json.materials.push(mat);return index;
}
function plain(b,name,color,metallicFactor,roughness,extra={}){const i=b.json.materials.length;b.json.materials.push({name,pbrMetallicRoughness:{baseColorFactor:[...new Color(color).toArray(),1],metallicFactor,roughness},...extra});return i;}
async function projectTexture(b,channel){const e=selection.projectTextures[0];if(sha(await readFile(e.sourcePath))!==e.sourceSha256)throw Error('Project texture hash mismatch');const output=resolve(cache,channel+'.jpg');execFileSync(process.env.HERO_PYTHON??'python',['scripts/heroes/texture.py',e.sourcePath,output,channel,'512'],{stdio:'pipe'});return b.image(await readFile(output),channel);}
const outputs=[];
async function save(builder,name){const bytes=builder.finish();const file=`${out}/${name}.glb`;await writeFile(file,bytes);const inventory=inspectGltf(await readGltf(file));outputs.push({file:name+'.glb',bytes:bytes.length,sha256:sha(bytes),...inventory});console.log(name,bytes.length,inventory.triangles+' triangles (all variants)');}
for(const gender of ['male','female']){
 const b=new Builder(),base=doc(gender),canon=doc(gender+'-peasant');const canonical=structuredClone(canon.json);b.json.nodes=canonical.nodes.map(n=>{const v=structuredClone(n);delete v.mesh;delete v.skin;return v;});b.json.scenes=structuredClone(canonical.scenes);
 const rig=hierarchy(canonical),joints=canonical.skins[0].joints,names=joints.map(i=>canonical.nodes[i].name);
 for(const required of ['Head','spine_03','pelvis','hand_r','hand_l','foot_l','foot_r'])if(!names.includes(required))throw Error('Missing anchor '+required);
 b.json.skins=[{name:'HeroRig',joints,inverseBindMatrices:b.accessor(joints.flatMap(i=>rig[i].matrixWorld.clone().invert().toArray()),16)}];
 const skinMat=await material(b,gender,2,'skin','skin');const eyeMat=await material(b,gender,1,'eyes','eye');const browMat=await material(b,gender,0,'hair','hair');
 for(let i=0;i<base.json.nodes.length;i++){const node=base.json.nodes[i];if(node.mesh===undefined)continue;const prim=base.json.meshes[node.mesh].primitives[0];
 if(/Eyes|Eyebrows/.test(node.name))b.mesh(node.name==='Eyes'?'hero_eyes':'hero_brows',extract(base,i,prim,()=>true,p=>p,names),node.name==='Eyes'?eyeMat:browMat,0);
 else for(const variant of ['soft','angular'])b.mesh('face_'+variant,extract(base,i,prim,tri=>tri.every(([x,y])=>y>(gender==='male'?1.485:1.45)&&Math.abs(x)<(y>(gender==='male'?1.59:1.545)?.16:.078)),p=>headVariant(p,gender,variant),names),skinMat,0);
 }
 for(const hairId of gender==='male'?['parted','buzzed']:['long','buns']){
 const h=doc(hairId),mat=await material(b,hairId,0,'hair','hair');for(let i=0;i<h.json.nodes.length;i++){const n=h.json.nodes[i];if(n.mesh===undefined)continue;const data=extract(h,i,h.json.meshes[n.mesh].primitives[0]);for(let v=0;v<data.positions.length/3;v++){data.joints.push(names.indexOf('Head'),0,0,0);data.weights.push(1,0,0,0);}b.mesh('hair_'+hairId,data,mat,0);}}
 for(const family of ['knight','mage']){
 const clothingId=gender+(family==='knight'?'-ranger':'-peasant'),c=doc(clothingId);
 const clothMat=await material(b,clothingId,0,'cloth_'+family,'cloth',family==='knight'?0x4b6278:0x615675,0,.8);
 const skinIndex=c.json.materials.findIndex(m=>m.name.includes('Regular'));const handsMat=await material(b,clothingId,Math.max(0,skinIndex),'skin_hands','skin');const cloth=emptyGeometry(),hands=emptyGeometry();
 for(let i=0;i<c.json.nodes.length;i++){const n=c.json.nodes[i];if(n.mesh===undefined||/Hood|Pauldron|Bracer/.test(n.name)||(family==='mage'&&/Legs/.test(n.name)))continue;
 // Boots from the peasant pack avoid the ranger boot's 9k hidden triangles.
 if(family==='knight'&&/Feet/.test(n.name))continue;
 for(const p of c.json.meshes[n.mesh].primitives){const isSkin=c.json.materials[p.material].name.includes('Regular');if(isSkin){appendGeometry(hands,extract(c,i,p,()=>true,p=>p,names));continue;}
 const arm=/Arms$/.test(n.name),limit=gender==='female'?.69:.74;
 appendGeometry(cloth,extract(c,i,p,tri=>!(arm&&tri.every(v=>Math.abs(v[0])>limit))&&(!/Body/.test(n.name)||tri.every(v=>v[1]<1.12)),p=>p,names));
 if(arm&&family==='mage')appendGeometry(hands,extract(c,i,p,tri=>tri.every(v=>Math.abs(v[0])>limit),p=>p,names));}}
 if(family==='knight'){for(let i=0;i<canon.json.nodes.length;i++){const n=canon.json.nodes[i];if(n.mesh!==undefined&&/Feet/.test(n.name))for(const p of canon.json.meshes[n.mesh].primitives)appendGeometry(cloth,extract(canon,i,p,()=>true,p=>p,names));}}
 b.mesh('outfit_'+family+'_cloth',cloth,clothMat,0);if(hands.indices.length)b.mesh('outfit_'+family+'_hands',hands,handsMat,0);
 }
 const pieces=armor(gender,names),steel=plain(b,'armor_steel',0x677e91,.72,.31),gold=plain(b,'armor_gold',0xd8b878,.7,.32),robe=plain(b,'robe',0x252c58,.02,.83,{doubleSided:true});
 b.json.materials[steel].pbrMetallicRoughness.baseColorTexture={index:await projectTexture(b,'metal_atlas')};b.json.materials[robe].pbrMetallicRoughness.baseColorTexture={index:await projectTexture(b,'cloth_atlas')};b.mesh('hero_helmet',pieces.helmet,steel,0);b.mesh('outfit_knight_steel',pieces.steel,steel,0);b.mesh('outfit_knight_gold',pieces.gold,gold,0);b.mesh('outfit_mage_robe',pieces.robe,robe,0);b.mesh('outfit_mage_mantle',pieces.mantle,robe,0);b.mesh('outfit_mage_gold',pieces.mageGold,gold,0);
 addAnimations(b,doc('animations'),canonical,selection.clips);await save(b,'hero-'+gender);
}
for(const family of ['sword','shield']){const b=new Builder(),d=doc(family);const mats=[];for(let i=0;i<d.json.materials.length;i++)mats.push(await material(b,family,i,'weapon_'+i,'raw',0xffffff,.65,.38));for(let i=0;i<d.json.nodes.length;i++){const n=d.json.nodes[i];if(n.mesh===undefined)continue;for(const [k,p]of d.json.meshes[n.mesh].primitives.entries())b.mesh(family+'_'+k,extract(d,i,p),mats[p.material]);}await save(b,family);}
{const b=new Builder(),s=staff();b.mesh('staff_shaft',s.wood,plain(b,'wood',0x282f38,.15,.65));b.mesh('staff_inlay',s.metal,plain(b,'metal',0xc6a16e,.75,.3));b.mesh('staff_crystal',s.gem,plain(b,'crystal',0x79bdce,.25,.22,{emissiveFactor:new Color(0x1e6680).toArray()}));await save(b,'staff');}
await writeFile(out+'/provenance.json',JSON.stringify({version:1,license:'CC0-1.0 (source assets); project license (authored adaptations)',selection:'scripts/heroes/source-selection.json',recipes:['scripts/heroes/import.mjs','scripts/heroes/build.mjs','scripts/heroes/wardrobe.mjs','scripts/heroes/texture.py'],sources:selection.entries.map(({files,inventory,...e})=>e),outputs},null,2)+'\n');
console.log('Total GLB bytes',outputs.reduce((a,o)=>a+o.bytes,0));
