import * as T from 'three';
import {accessorValues,encodeGlb} from './gltf.mjs';
export class Builder {
 constructor(){this.json={asset:{version:'2.0',generator:'Aden modular hero importer 1'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],skins:[],materials:[],textures:[],images:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],accessors:[],bufferViews:[],animations:[]};this.chunks=[];this.length=0;}
 bytes(bytes){const padding=(4-this.length%4)%4;if(padding){this.chunks.push(Buffer.alloc(padding));this.length+=padding;}const i=this.json.bufferViews.length;this.json.bufferViews.push({buffer:0,byteOffset:this.length,byteLength:bytes.length});this.chunks.push(bytes);this.length+=bytes.length;return i;}
 accessor(values,width=3,componentType=5126,type){const C=componentType===5126?Float32Array:componentType===5123?Uint16Array:Uint32Array;const data=new C(values);const i=this.json.accessors.length;const a={bufferView:this.bytes(Buffer.from(data.buffer)),componentType,count:values.length/width,type:type??({1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[width])};if(width===3){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<values.length;k++){a.min[k%3]=Math.min(a.min[k%3],values[k]);a.max[k%3]=Math.max(a.max[k%3],values[k]);}}this.json.accessors.push(a);return i;}
 image(bytes,name){const i=this.json.images.length;this.json.images.push({bufferView:this.bytes(bytes),mimeType:'image/jpeg',name});this.json.textures.push({source:i,sampler:0});return i;}
 mesh(name,data,material,skin){if(!data.indices.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);g.computeVertexNormals();const attributes={POSITION:this.accessor(data.positions),NORMAL:this.accessor([...g.attributes.normal.array])};if(data.uvs?.length)attributes.TEXCOORD_0=this.accessor(data.uvs,2);if(data.colors?.length)attributes.COLOR_0=this.accessor(data.colors,3);if(skin!==undefined){attributes.JOINTS_0=this.accessor(data.joints,4,5123);attributes.WEIGHTS_0=this.accessor(data.weights,4);}const node={name,mesh:this.json.meshes.length};if(skin!==undefined)node.skin=skin;this.json.meshes.push({name,primitives:[{attributes,indices:this.accessor(data.indices,1,5125),material}]});this.json.scenes[0].nodes.push(this.json.nodes.length);this.json.nodes.push(node);g.dispose();}
 finish(){return encodeGlb(this.json,Buffer.concat(this.chunks));}
}
export function hierarchy(json){const nodes=json.nodes.map(n=>{const o=new T.Object3D();o.name=n.name;if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});json.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));nodes.filter(o=>!o.parent).forEach(o=>o.updateMatrixWorld(true));return nodes;}
export function emptyGeometry(){return {positions:[],indices:[],uvs:[],joints:[],weights:[],colors:[]};}
export function appendGeometry(target,source){const offset=target.positions.length/3;target.positions.push(...source.positions);target.indices.push(...source.indices.map(i=>i+offset));for(const key of ['uvs','joints','weights','colors'])if(source[key]?.length)target[key].push(...source[key]);}
export function extract(doc,nodeIndex,primitive,keep=()=>true,modify=p=>p,jointNames){
 const source=accessorValues(doc,primitive.attributes.POSITION), indices=primitive.indices===undefined?Array.from({length:source.length/3},(_,i)=>i):accessorValues(doc,primitive.indices);
 const uv=primitive.attributes.TEXCOORD_0!==undefined?accessorValues(doc,primitive.attributes.TEXCOORD_0):null;
 const js=primitive.attributes.JOINTS_0!==undefined?accessorValues(doc,primitive.attributes.JOINTS_0):null;
 const ws=primitive.attributes.WEIGHTS_0!==undefined?accessorValues(doc,primitive.attributes.WEIGHTS_0):null;
 const skin=doc.json.skins?.[doc.json.nodes[nodeIndex].skin];const mapping=skin?.joints.map(i=>jointNames?.indexOf(doc.json.nodes[i].name));
 if(mapping?.some(i=>i===-1))throw Error('Missing skin joint');
 const matrix=hierarchy(doc.json)[nodeIndex].matrixWorld;const points=[];for(let i=0;i<source.length;i+=3)points.push(new T.Vector3().fromArray(source,i).applyMatrix4(matrix).toArray());
 const result=emptyGeometry(), remap=new Map();
 for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3);if(!keep(tri.map(id=>points[id])))continue;
 for(const id of tri){if(!remap.has(id)){remap.set(id,result.positions.length/3);result.positions.push(...modify([...points[id]]));result.uvs.push(...(uv?uv.slice(id*2,id*2+2):[0,0]));if(js){result.joints.push(...js.slice(id*4,id*4+4).map(j=>mapping[j]));const weights=ws.slice(id*4,id*4+4);const total=weights.reduce((a,b)=>a+b,0);if(!Number.isFinite(total)||total<.001)throw Error('Invalid weights');result.weights.push(...weights.map(w=>w/total));}}
 result.indices.push(remap.get(id));}}
 return result;
}
export function headVariant([x,y,z],gender,variant){const offset=gender==='female'?-.045:0;const jaw=Math.max(0,1-Math.abs(y-(1.625+offset))/.055)*Math.min(1,Math.max(0,z+.015)/.065);const nose=(Math.abs(x)>.028?0:1)*Math.exp(-((x/.022)**2+((y-(1.668+offset))/.024)**2))*Math.max(0,Math.min(1,(z-.07)/.045));return [x*(1+jaw*(variant==='angular'?.2:-.12)),y,z+nose*(variant==='angular'?.018:-.005)];}
export function retargetRotation(animatedWorld,sourceRestWorld,targetRestWorld,parentTargetWorld){return parentTargetWorld.clone().invert().multiply(animatedWorld).multiply(sourceRestWorld.clone().invert()).multiply(targetRestWorld).normalize();}
export function addAnimations(builder,source,targetJson,aliases){
 const srcRest=hierarchy(source.json),targetRest=hierarchy(targetJson);const targetByName=new Map(targetJson.nodes.map((n,i)=>[n.name,i]));const dstNodes=builder.json.nodes;
 const srcWorld=srcRest.map(n=>n.getWorldQuaternion(new T.Quaternion())),dstWorld=targetRest.map(n=>n.getWorldQuaternion(new T.Quaternion()));
 const srcPelvis=srcRest.find(n=>n.name==='pelvis').getWorldPosition(new T.Vector3()).y,targetPelvis=targetRest.find(n=>n.name==='pelvis').getWorldPosition(new T.Vector3()).y,ratio=targetPelvis/srcPelvis;
 for(const [alias,name] of Object.entries(aliases)){
 const clip=source.json.animations.find(a=>a.name===name);if(!clip)throw Error(`Missing clip ${name}`);
 const channels=clip.channels.map(c=>{const s=clip.samplers[c.sampler];return {...c,times:accessorValues(source,s.input),values:accessorValues(source,s.output)};});const duration=Math.max(...channels.map(c=>c.times.at(-1)));const count=Math.ceil(duration*30);const times=Array.from({length:count+1},(_,i)=>duration*i/count);
 const samples=new Map();for(const n of targetJson.nodes)if(targetJson.skins[0].joints.some(i=>targetJson.nodes[i].name===n.name))samples.set(n.name,{rotation:[],translation:[]});
 for(const time of times){const pose=hierarchy(source.json);
 for(const c of channels){const node=pose[c.target.node],width=c.target.path==='rotation'?4:3;let end=c.times.findIndex(t=>t>=time);if(end<0)end=c.times.length-1;const start=Math.max(0,end-1),mix=end===start?0:(time-c.times[start])/(c.times[end]-c.times[start]);const a=c.values.slice(start*width,(start+1)*width),b=c.values.slice(end*width,(end+1)*width);if(c.target.path==='rotation')node.quaternion.fromArray(a).slerp(new T.Quaternion().fromArray(b),mix);else if(c.target.path==='translation')node.position.fromArray(a).lerp(new T.Vector3().fromArray(b),mix);}
 pose.filter(n=>!n.parent).forEach(n=>n.updateMatrixWorld(true));const worldTargets=new Map();
 const visit=(node)=>{const ti=targetByName.get(node.name),si=source.json.nodes.findIndex(n=>n.name===node.name);const parentQ=worldTargets.get(node.parent?.name)??new T.Quaternion();let local=node.quaternion.clone();if(si>=0&&samples.has(node.name))local=retargetRotation(pose[si].getWorldQuaternion(new T.Quaternion()),srcWorld[si],dstWorld[ti],parentQ);worldTargets.set(node.name,parentQ.clone().multiply(local));const record=samples.get(node.name);if(record){record.rotation.push(...local.toArray());let position=node.position.clone();if(node.name==='pelvis'||node.name==='root'){const delta=pose[si].position.clone().sub(srcRest[si].position).multiplyScalar(ratio);position.add(delta);}record.translation.push(...position.toArray());}node.children.forEach(visit);};targetRest.filter(n=>!n.parent).forEach(visit);
 }
 const anim={name:alias,samplers:[],channels:[]};const input=builder.accessor(times,1);builder.json.accessors[input].min=[0];builder.json.accessors[input].max=[duration];
 for(const [name,sample]of samples)for(const path of ['rotation','translation']){const output=builder.accessor(sample[path],path==='rotation'?4:3);anim.channels.push({sampler:anim.samplers.length,target:{node:dstNodes.findIndex(n=>n.name===name),path}});anim.samplers.push({input,output,interpolation:'LINEAR'});}builder.json.animations.push(anim);
 }
}


/** Clip triangles against a horizontal garment seam, keeping shared edge vertices smooth. */
export function clipGeometryAtY(source,cut){
 const out=emptyGeometry(),cache=new Map();
 const original=i=>({key:String(i),position:source.positions.slice(i*3,i*3+3),uv:source.uvs.slice(i*2,i*2+2),joints:source.joints.slice(i*4,i*4+4),weights:source.weights.slice(i*4,i*4+4)});
 function cross(a,b){const t=(cut-a.position[1])/(b.position[1]-a.position[1]),influences=new Map();for(const [v,f]of [[a,1-t],[b,t]])v.joints.forEach((joint,i)=>influences.set(joint,(influences.get(joint)??0)+v.weights[i]*f));const sorted=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4);while(sorted.length<4)sorted.push([0,0]);const sum=sorted.reduce((s,[,w])=>s+w,0);return {key:[a.key,b.key].sort().join('/'),position:a.position.map((v,i)=>i===1?cut:v+(b.position[i]-v)*t),uv:a.uv.map((v,i)=>v+(b.uv[i]-v)*t),joints:sorted.map(([j])=>j),weights:sorted.map(([,w])=>w/sum)};}
 function add(v){if(!cache.has(v.key)){cache.set(v.key,out.positions.length/3);out.positions.push(...v.position);out.uvs.push(...v.uv);out.joints.push(...v.joints);out.weights.push(...v.weights);}return cache.get(v.key);}
 for(let i=0;i<source.indices.length;i+=3){const tri=source.indices.slice(i,i+3).map(original),poly=[];for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3],inside=a.position[1]>=cut,next=b.position[1]>=cut;if(inside)poly.push(a);if(inside!==next)poly.push(cross(a,b));}for(let k=1;k<poly.length-1;k++)out.indices.push(add(poly[0]),add(poly[k]),add(poly[k+1]));}
 return out;
}
