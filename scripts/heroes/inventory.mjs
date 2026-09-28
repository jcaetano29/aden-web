import { readGltf, inspectGltf, accessorValues } from './gltf.mjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root='artifacts/source-models/heroes/'; const all=await readdir(root,{recursive:true});
const entries=[];
async function entry(id,needle,filter,role,gender,pack,url){
 const path=all.find(f=>f.endsWith(needle)&&filter(f));if(!path)throw Error(needle);
 const sourcePath=(root+path).replaceAll('\\','/');const d=await readGltf(sourcePath);
 const files=[sourcePath,...d.json.buffers.filter(b=>b.uri&&!b.uri.startsWith('data:')).map(b=>sourcePath.slice(0,sourcePath.lastIndexOf('/')+1)+b.uri),...(d.json.images??[]).filter(i=>i.uri).map(i=>sourcePath.slice(0,sourcePath.lastIndexOf('/')+1)+i.uri)];
 const checksums={}, uriRemaps={};for(const f of files){let resolved=f;try{await readFile(f);}catch{resolved=f.replace('_png.png','.png');uriRemaps[f.slice(f.lastIndexOf('/')+1)]=resolved.slice(resolved.lastIndexOf('/')+1);} checksums[resolved]=createHash('sha256').update(await readFile(resolved)).digest('hex');}
 entries.push({id,sourcePath,sourceUrl:url,edition:'Standard',license:'CC0-1.0',role,gender,sourceSha256:checksums[sourcePath],files:checksums,uriRemaps,sourceNodes:d.json.nodes.filter(n=>n.mesh!==undefined).map(n=>n.name),inventory:inspectGltf(d),pack});
}
const ue=f=>f.includes('Godot')&&!f.includes('Unity');
for(const [gender,cap]of [['male','Male'],['female','Female']]){
 await entry(gender,'Superhero_'+cap+'_FullBody.gltf',ue,'body',gender,'base','https://quaternius.itch.io/universal-base-characters');
 for(const clothing of ['Ranger','Peasant'])await entry(gender+'-'+clothing.toLowerCase(),cap+'_'+clothing+'.gltf',ue,'outfit',gender,'outfits','https://quaternius.itch.io/modular-character-outfits-fantasy');
}
for(const [id,name,gender]of [['parted','SimpleParted','male'],['buzzed','Buzzed','male'],['long','Long','female'],['buns','Buns','female']])await entry(id,'Hair_'+name+'.gltf',f=>f.includes('Origin at 0')&&ue(f),'hair',gender,'base','https://quaternius.itch.io/universal-base-characters');
await entry('animations','UAL1_Standard.glb',()=>true,'animation',null,'animations','https://quaternius.itch.io/universal-animation-library');
for(const [id,name]of [['sword','Sword_Bronze'],['shield','Shield_Wooden']])await entry(id,name+'.gltf',()=>true,'weapon',null,'props','https://quaternius.itch.io/fantasy-props-megakit');
const packs={};for(const pack of ['base','outfits','animations','props']){
 const licensePath=root+all.find(f=>f.startsWith(pack+'\\')&& /License.*\.txt$/.test(f));
 packs[pack]={licensePath:licensePath.replaceAll('\\','/'),licenseSha256:createHash('sha256').update(await readFile(licensePath)).digest('hex'),archiveSha256:createHash('sha256').update(await readFile(root+pack+'-standard.zip')).digest('hex')};
}
await writeFile('scripts/heroes/source-selection.json',JSON.stringify({version:1,packs,entries,projectTextures:[{sourcePath:'client/public/textures/hero-material-atlas.png',sourceSha256:createHash('sha256').update(await readFile('client/public/textures/hero-material-atlas.png')).digest('hex'),license:'Existing project-generated artwork',role:'engraved metal and woven cloth swatches'}],authored:['plate cuirass, pauldrons, greaves and bracers','split mage robe with trim','crystal staff','regional face morphs'],clips:{Idle:'Idle_Loop',Walk:'Walk_Loop',Sword_Attack:'Sword_Attack',Spell_Attack:'Spell_Simple_Shoot',Hit:'Hit_Chest',Death:'Death01'}},null,2)+'\n');
console.log('Audited',entries.length,'sources');

