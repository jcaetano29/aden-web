// Convert the author's self-contained glTF files to compact GLB. No mesh or clip
// data is changed. Source files are downloaded separately into artifacts/source-models.
const fs = require('node:fs');
const mapping = { Warrior:'Knight', Wizard:'Mage', Rogue:'Rogue', Monk:'Barbarian',
  Orc:'OrcBrute', OrcSkull:'BoneWarden', Yeti:'ForestTroll', Demon:'InfernalDemon', Ghost:'DeathWraith', Dragon:'AncientDrake' };
for(const [source,target] of Object.entries(mapping)) {
  const json=JSON.parse(fs.readFileSync(`artifacts/source-models/${source}.gltf`,'utf8'));
  if(json.buffers.length!==1 || !json.buffers[0].uri.startsWith('data:'))throw new Error('Expected one embedded buffer: '+source);
  const binary=Buffer.from(json.buffers[0].uri.split(',')[1],'base64');
  delete json.buffers[0].uri;
  json.asset.extras={...json.asset.extras,source:'Quaternius',license:'CC0-1.0'};
  const text=Buffer.from(JSON.stringify(json));
  const padded=Buffer.alloc(Math.ceil(text.length/4)*4,0x20);text.copy(padded);
  const bin=Buffer.alloc(Math.ceil(binary.length/4)*4);binary.copy(bin);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
  header.writeUInt32LE(28+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(`client/public/models/${target}.glb`,Buffer.concat([header,padded,binHeader,bin]));
  console.log(`${source} → ${target}: ${bin.length} bytes binary, ${json.animations.length} animations`);
}
// Alternate enemy presentations use these rigs plus RevenantDetails at load time.
fs.copyFileSync('client/public/models/Rogue.glb','client/public/models/DreadStalker.glb');
fs.copyFileSync('client/public/models/Knight.glb','client/public/models/DreadKnight.glb');
