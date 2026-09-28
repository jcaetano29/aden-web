import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const WIDTH={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const TYPES={5120:[1,'readInt8'],5121:[1,'readUInt8'],5122:[2,'readInt16LE'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']};
export async function readGltf(file) {
 const raw=await readFile(file); let json,bin;
 if(raw.length>=12&&raw.readUInt32LE(0)===0x46546c67){
  if(raw.readUInt32LE(4)!==2||raw.readUInt32LE(8)!==raw.length)throw Error('Invalid GLB header');
  for(let at=12;at<raw.length;){const length=raw.readUInt32LE(at),type=raw.readUInt32LE(at+4);if(at+8+length>raw.length)throw Error('GLB chunk bounds');const data=raw.subarray(at+8,at+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8'));else if(type===0x004e4942)bin=data;at+=8+length;}
 }else json=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
 if(!json?.asset||json.asset.version!=='2.0')throw Error('Expected glTF 2.0');
 const buffers=await Promise.all((json.buffers??[]).map(async(def,i)=>{
  try{let bytes;if(!def.uri)bytes=bin;else if(def.uri.startsWith('data:'))bytes=Buffer.from(def.uri.split(',')[1],'base64');else bytes=await readFile(resolve(dirname(file),decodeURIComponent(def.uri)));
   if(!bytes||bytes.length<def.byteLength)throw Error('truncated');return bytes.subarray(0,def.byteLength);
  }catch(error){throw Error(`Cannot read buffer ${i} in ${file}: ${error.message}`);}
 }));return {json,buffers,file};
}
export function accessorValues(doc,index) {
 const a=doc.json.accessors?.[index];if(!a)throw Error(`Missing accessor ${index}`);if(a.sparse)throw Error('Sparse accessor unsupported');
 const view=doc.json.bufferViews?.[a.bufferView],type=TYPES[a.componentType],width=WIDTH[a.type];if(!view||!type||!width)throw Error(`Invalid accessor ${index}`);
 const buffer=doc.buffers[view.buffer],stride=view.byteStride??width*type[0],start=(view.byteOffset??0)+(a.byteOffset??0);
 const end=a.count?start+(a.count-1)*stride+width*type[0]:start;
 if(!buffer||end>(view.byteOffset??0)+view.byteLength||end>buffer.length||stride<width*type[0])throw Error(`Accessor ${index} exceeds bounds`);
 const values=[];for(let i=0;i<a.count;i++)for(let c=0;c<width;c++){
  let value=buffer[type[1]](start+i*stride+c*type[0]);
  if(a.normalized&&a.componentType!==5126){const signed=a.componentType===5120||a.componentType===5122;const max=signed?2**(8*type[0]-1)-1:2**(8*type[0])-1;value=Math.max(signed?-1:0,value/max);}
  if(!Number.isFinite(value))throw Error(`Non-finite accessor ${index}`);values.push(value);
 }return values;
}
export function inspectGltf(doc) {
 let triangles=0;for(const mesh of doc.json.meshes??[])for(const p of mesh.primitives){
  if(p.attributes.POSITION===undefined)continue;const positions=accessorValues(doc,p.attributes.POSITION),count=positions.length/3;
  const indices=p.indices===undefined?null:accessorValues(doc,p.indices);
  if(indices?.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid mesh index');
  if((p.mode??4)===4)triangles+=(indices?.length??count)/3;
  if(p.attributes.WEIGHTS_0!==undefined)accessorValues(doc,p.attributes.WEIGHTS_0);
 }
 return {meshes:(doc.json.meshes??[]).length,skinnedMeshes:(doc.json.nodes??[]).filter(n=>n.skin!==undefined).length,triangles,materials:(doc.json.materials??[]).map(m=>m.name??''),joints:[...new Set((doc.json.skins??[]).flatMap(s=>s.joints.map(i=>doc.json.nodes[i].name)))],clips:(doc.json.animations??[]).map(a=>a.name)};
}
export function encodeGlb(source,binary) {
 const json=structuredClone(source);json.buffers=[{byteLength:binary.length}];const text=Buffer.from(JSON.stringify(json));const padded=Buffer.alloc(Math.ceil(text.length/4)*4,0x20);text.copy(padded);const bin=Buffer.alloc(Math.ceil(binary.length/4)*4);binary.copy(bin);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,padded,binHeader,bin]);
}
