import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGltf, inspectGltf, accessorValues, encodeGlb } from './gltf.mjs';
async function fixture() {
 const dir=await mkdtemp(join(tmpdir(),'aden-hero-gltf-')); const buffer=Buffer.alloc(54);
 [0,0,0,99,1,0,0,99,0,1,0,99].forEach((n,i)=>buffer.writeFloatLE(n,i*4));
 [0,1,2].forEach((n,i)=>buffer.writeUInt16LE(n,48+i*2));
 const json={asset:{version:'2.0'},buffers:[{uri:'mesh.bin',byteLength:54}],bufferViews:[{buffer:0,byteOffset:0,byteLength:48,byteStride:16},{buffer:0,byteOffset:48,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}]};
 await writeFile(join(dir,'mesh.bin'),buffer);await writeFile(join(dir,'mesh.gltf'),JSON.stringify(json));return {dir,json,buffer};
}
test('reads strided positions and integer indices from external buffers',async()=>{
 const {dir}=await fixture();const doc=await readGltf(join(dir,'mesh.gltf'));
 assert.deepEqual(accessorValues(doc,0),[0,0,0,1,0,0,0,1,0]);assert.deepEqual(accessorValues(doc,1),[0,1,2]);assert.equal(inspectGltf(doc).triangles,1);
 await unlink(join(dir,'mesh.bin'));await assert.rejects(readGltf(join(dir,'mesh.gltf')),/buffer/i);
});
test('GLB round trip preserves integer indices without mutating JSON',async()=>{
 const {dir,json,buffer}=await fixture();const copy=structuredClone(json);
 await writeFile(join(dir,'mesh.glb'),encodeGlb(json,buffer));const doc=await readGltf(join(dir,'mesh.glb'));
 assert.deepEqual(accessorValues(doc,1),[0,1,2]);assert.deepEqual(json,copy);assert.equal(inspectGltf(doc).triangles,1);
});
test('rejects truncated accessors and out of range indices',async()=>{
 const {dir}=await fixture();const doc=await readGltf(join(dir,'mesh.gltf'));doc.json.accessors[0].count=4;
 assert.throws(()=>accessorValues(doc,0),/bounds/i);doc.json.accessors[0].count=3;doc.buffers[0].writeUInt16LE(5,48);assert.throws(()=>inspectGltf(doc),/index/i);
});
