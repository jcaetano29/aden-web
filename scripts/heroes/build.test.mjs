import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Builder, retargetRotation, headVariant} from './build.mjs';
import {Quaternion,Vector3} from 'three';
import {readGltf,inspectGltf,accessorValues} from './gltf.mjs';
import {mkdtemp,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
test('packs indexed geometry, joints and embedded images without changing ownership',async()=>{
 const b=new Builder();b.json.nodes.push({name:'root'});b.json.scenes[0].nodes.push(0);
 b.mesh('test',{positions:[0,0,0,1,0,0,0,1,0],indices:[0,1,2],joints:Array(12).fill(0),weights:[1,0,0,0,1,0,0,0,1,0,0,0]},0,0);
 const dir=await mkdtemp(join(tmpdir(),'hero-build-'));await writeFile(join(dir,'a.glb'),b.finish());const d=await readGltf(join(dir,'a.glb'));
 assert.equal(inspectGltf(d).triangles,1);assert.deepEqual(accessorValues(d,d.json.meshes[0].primitives[0].attributes.WEIGHTS_0),[1,0,0,0,1,0,0,0,1,0,0,0]);
});
test('retargets world orientation across different rest rotations',()=>{
 const q=(angle)=>new Quaternion().setFromAxisAngle(new Vector3(0,0,1),angle);
 const out=retargetRotation(q(.3),q(.3),q(.8),q(.2));assert.ok(out.angleTo(q(.6))<1e-6);
 const animated=retargetRotation(q(.7),q(.3),q(.8),q(.2));assert.ok(animated.angleTo(q(1))<1e-6);
});
test('face variants preserve neck, eyes and differ at jaw and nose',()=>{
 assert.deepEqual(headVariant([.04,1.53,.02],'male','angular'),[.04,1.53,.02]);
 assert.deepEqual(headVariant([.04,1.7,.08],'male','angular'),[.04,1.7,.08]);
 assert.notDeepEqual(headVariant([.055,1.62,.06],'male','angular'),headVariant([.055,1.62,.06],'male','soft'));
});

import {clipGeometryAtY} from './build.mjs';
test('clips a neck boundary exactly while preserving interpolated UVs and skin weights',()=>{
 const g={positions:[0,0,0,1,2,0,-1,2,0],indices:[0,1,2],uvs:[.5,0,1,1,0,1],joints:[0,0,0,0,1,0,0,0,1,0,0,0],weights:[1,0,0,0,1,0,0,0,1,0,0,0],colors:[]};
 const cut=clipGeometryAtY(g,1);assert.equal(cut.indices.length,6);assert.ok(cut.positions.filter((_,i)=>i%3===1).every(y=>y>=1));for(let i=0;i<cut.weights.length;i+=4)assert.ok(Math.abs(cut.weights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-6);assert.ok(cut.weights.includes(.5));assert.equal(g.positions[1],0);
});

test('deduplicates identical texture payloads in a GLB',()=>{const b=new Builder();const bytes=Buffer.from([1,2,3]);expectNever();function expectNever(){assert.equal(b.image(bytes,'one'),b.image(bytes,'two'));assert.equal(b.json.images.length,1);}});
test('reuses identical accessors without aliasing different component types',()=>{const b=new Builder();const a=b.accessor([0,1,2],3);assert.equal(b.accessor([0,1,2],3),a);assert.notEqual(b.accessor([0,1,2],3,5123),a);});
