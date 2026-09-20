import * as THREE from "three";
import { ZONES, WORLD_OBJECTS, type Zone } from "@aden/shared";
import { woodMat, foliageMat, crackedStoneMat, stoneMat, clothMat, metalMat, texturedMaterial } from "./textures.js";

interface Placement { x: number; z: number; scale: number; yaw: number; kind: "tree" | "rock" | "shrub"; }
function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Clustered, reproducible decoration. The main route, central arena, spawn and
 * interactables reserve space before any props are emitted. No gameplay state. */
export function dressingLayout(zone: Zone): Placement[] {
  const rng = random(Array.from(zone.id).reduce((n,c)=>n*31+c.charCodeAt(0),8421));
  const objects = WORLD_OBJECTS.filter(o=>o.mapId===zone.id);
  const out: Placement[] = [];
  const count = zone.safe ? 260 : zone.id === "bosque" ? 880 : 520;
  for (let attempt=0; attempt<count*12 && out.length<count; attempt++) {
    // Alternating groves and scattered low detail avoids a uniform carpet.
    const cluster = attempt % 8;
    const angle = cluster * Math.PI / 4 + 0.24;
    const radius = zone.safe ? 52 : 34 + (cluster%2)*12;
    const dx = Math.cos(angle)*radius + (rng()-0.5)*27;
    const dz = Math.sin(angle)*radius + (rng()-0.5)*27;
    const x = zone.center.x+dx, z = zone.center.z+dz;
    if (Math.abs(dx)>60 || Math.abs(dz)>60 || Math.abs(dx)<7 || Math.abs(dz)<5) continue;
    if (Math.hypot(dx,dz)<(zone.safe?46:19)) continue;
    if (!zone.safe && [-1,1].some(side=>[-1,1].some(row=>Math.hypot(dx-side*25,dz-row*26)<10))) continue;
    if (Math.hypot(x-zone.spawn.x,z-zone.spawn.z)<10) continue;
    if (objects.some(o=>Math.hypot(x-o.x,z-o.z)<7)) continue;
    const roll=rng();
    const kind = roll < (zone.id === "bosque" ? 0.3 : zone.safe ? 0.25 : 0.12) ? "tree" : roll<0.52 ? "rock" : "shrub";
    // Keep large trees/columns from overlapping one another inside a grove.
    if (kind === "tree" && out.some(p=>p.kind==="tree" && Math.hypot(p.x-x,p.z-z)<3.5)) continue;
    out.push({x,z,scale:0.65+rng()*0.8,yaw:rng()*Math.PI*2,kind});
  }
  return out;
}

function instances(scene: THREE.Scene, name: string, geometry: THREE.BufferGeometry,
  material: THREE.Material, poses: Array<{x:number;y:number;z:number;sx:number;sy:number;sz:number;yaw:number}>, shadow=true) {
  if (!poses.length) { geometry.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry,material,poses.length);
  const transform=new THREE.Object3D();
  poses.forEach((p,i)=>{
    transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.yaw,0);transform.scale.set(p.sx,p.sy,p.sz);
    transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;
  mesh.userData.dressing=true;mesh.userData.noCastShadow=!shadow;
  scene.add(mesh);
}

/** Dense scenery uses batches per zone, not one draw call per decoration. */
export function addMapDressing(scene: THREE.Scene): void {
  for (const zone of ZONES) {
    const layout=dressingLayout(zone);
    const forest=zone.id==="bosque" || zone.safe;
    const burnt=zone.id==="yermo";
    const trees=layout.filter(p=>p.kind==="tree");
    const rocks=layout.filter(p=>p.kind==="rock");
    const shrubs=layout.filter(p=>p.kind==="shrub");
    const stone=crackedStoneMat(burnt?0x504b48:0x909186,[1,1]);
    instances(scene,`${zone.id}-grove-trunks`,new THREE.CylinderGeometry(forest||burnt?0.18:0.55,forest||burnt?0.34:0.72,1,7),
      forest||burnt?woodMat(0x63513b,[1,3]):stone,
      trees.map(p=>({x:p.x,z:p.z,y:p.scale*2.5,sx:p.scale,sy:p.scale*5,sz:p.scale,yaw:p.yaw})));
    if (forest) {
      // Broad, layered crowns break up the original cone-only silhouettes.
      const crowns=trees.flatMap(p=>[0,1,2].map(layer=>({x:p.x+Math.sin(p.yaw+layer)*0.7,z:p.z+Math.cos(p.yaw+layer)*0.7,
        y:p.scale*(4+layer*1.2),sx:p.scale*(2.3-layer*0.3),sy:p.scale*1.7,sz:p.scale*(2-layer*0.25),yaw:p.yaw+layer})));
      instances(scene,`${zone.id}-tree-crowns`,new THREE.IcosahedronGeometry(1,1),foliageMat(0x768353,[2,2]),crowns);
    } else if (burnt) {
      instances(scene,`${zone.id}-charred-spikes`,new THREE.ConeGeometry(0.65,1,5),stone,
        trees.map(p=>({x:p.x+0.6,z:p.z,y:p.scale*1.8,sx:p.scale,sy:p.scale*3.6,sz:p.scale,yaw:p.yaw})));
    } else {
      instances(scene,`${zone.id}-broken-capitals`,new THREE.BoxGeometry(1.5,0.4,1.5),stone,
        trees.map(p=>({x:p.x,z:p.z,y:p.scale*5,sx:p.scale,sy:p.scale,sz:p.scale,yaw:p.yaw})));
    }
    instances(scene,`${zone.id}-rock-clusters`,new THREE.IcosahedronGeometry(1,1),stone,
      rocks.map(p=>({x:p.x,z:p.z,y:p.scale*0.35,sx:p.scale*1.3,sy:p.scale*0.7,sz:p.scale,yaw:p.yaw})),false);
    instances(scene,`${zone.id}-undergrowth`,forest?new THREE.IcosahedronGeometry(1,0):new THREE.DodecahedronGeometry(1,0),
      forest?foliageMat(0x8b8953):stone,
      shrubs.map(p=>({x:p.x,z:p.z,y:p.scale*0.25,sx:p.scale*0.8,sy:p.scale*(forest?0.55:0.28),sz:p.scale*0.7,yaw:p.yaw})),false);
    if (!zone.safe) {
      trails(scene,zone);
      landmarks(scene,zone);
    }
  }
}

function trails(scene: THREE.Scene, zone: Zone): void {
  const material=texturedMaterial(zone.id==="bosque"?"gravel":"cobble",{color:0xada18d,tint:zone.id==="bosque"?0x8d795c:0xffffff,repeat:[2,18],roughness:1,bumpScale:0.035});
  function feather(mat: THREE.MeshStandardMaterial, horizontal=false) {
    if(typeof document==='undefined')return;
    const cv=document.createElement('canvas');cv.width=cv.height=64;
    const ctx=cv.getContext('2d')!;
    const gradient=ctx.createLinearGradient(0,0,horizontal?0:64,horizontal?64:0);
    gradient.addColorStop(0,'black');gradient.addColorStop(0.2,'white');gradient.addColorStop(0.8,'white');gradient.addColorStop(1,'black');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    mat.alphaMap=new THREE.CanvasTexture(cv);mat.transparent=true;mat.depthWrite=false;
  }
  feather(material);
  const northSouth=new THREE.Mesh(new THREE.PlaneGeometry(6,114),material);
  northSouth.rotation.x=-Math.PI/2;northSouth.position.set(zone.center.x,0.035,zone.center.z);
  northSouth.receiveShadow=true;northSouth.userData.ground=true;scene.add(northSouth);
  const crossMaterial=texturedMaterial("gravel",{color:0x8f8678,tint:zone.id==="bosque"?0x8d795c:0xffffff,repeat:[16,1],roughness:1,bumpScale:0.035});
  feather(crossMaterial,true);
  const eastWest=new THREE.Mesh(new THREE.PlaneGeometry(100,4),crossMaterial);
  eastWest.rotation.x=-Math.PI/2;eastWest.position.set(zone.center.x,0.034,zone.center.z);
  eastWest.receiveShadow=true;eastWest.userData.ground=true;scene.add(eastWest);
}

function landmarks(scene: THREE.Scene, zone: Zone): void {
  const stone=stoneMat(zone.id==="yermo"?0x615450:0x8b8890,[2,1]);
  const timber=woodMat(0x63503c,[2,1]);
  const cloth=clothMat(zone.id==="bosque"?0x65764a:zone.id==="trono"?0x812e39:0x58436e);
  const iron=metalMat(0x85837b);
  function box(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);g.add(mesh);return mesh;
  }
  // Four authored pockets flank the clear central arena and its approach.
  for (const side of [-1,1]) for (const row of [-1,1]) {
    const g=new THREE.Group();g.position.set(zone.center.x+side*25,0,zone.center.z+row*26);
    if(zone.id==="bosque") {
      // Abandoned hunting shelters, stacked supplies and a watch platform.
      for(const x of [-3,3]) for(const z of [-2,2]) box(g,x,1.8,z,0.22,3.6,0.22,timber);
      const roof=box(g,0,3.5,0,7,0.15,5,cloth);roof.rotation.z=side*0.12;
      for(let i=0;i<3;i++) box(g,-2+i*1.1,0.55,-1,0.9,1.1,0.8,timber);
      box(g,0,0.45,2.5,4.4,0.18,0.7,timber);
    } else {
      // Broken side chapels: low walls, pillars, tombs and a banner mark destinations.
      box(g,0,0.8,-4,12,1.6,0.9,stone);
      box(g,side*5,1.1,0,0.9,2.2,8,stone);
      for(const x of [-4,4]) {
        box(g,x,2.2,-3,1.1,4.4,1.1,stone);box(g,x,4.5,-3,1.8,0.4,1.8,stone);
        box(g,x,0.6,1,1.8,1.2,3,stone);
      }
      box(g,0,2.6,-3,0.12,5.2,0.12,iron);box(g,0.75,3.7,-3,1.4,2,0.08,cloth);
    }
    // Avoid burying a chest or shrine if authored locations change in shared data.
    if(WORLD_OBJECTS.some(o=>o.mapId===zone.id && Math.hypot(o.x-g.position.x,o.z-g.position.z)<12)) {
      g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});continue;
    }
    g.name=`${zone.id}-landmark`;scene.add(g);
  }
}
