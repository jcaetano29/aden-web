export { dressingLayout } from "@aden/shared";
import * as THREE from "three";
import { ZONES, STRUCTURE_BOXES, STRUCTURE_SIZE, dressingLayout, type Zone } from "@aden/shared";
import { woodMat, foliageMat, crackedStoneMat, stoneMat, clothMat, metalMat, texturedMaterial } from "./textures.js";


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
    if (zone.id === "cripta" || zone.id === 'monasterio') continue; // Authored chambers have a separate, clear layout.
    const layout=dressingLayout(zone);
    const forest=zone.id==="bosque" || zone.id==='marismas' || zone.safe;
    const burnt=zone.id==="yermo";
    const trees=layout.filter(p=>p.kind==="tree");
    const rocks=layout.filter(p=>p.kind==="rock");
    const shrubs=layout.filter(p=>p.kind==="shrub");
    const stone=crackedStoneMat(burnt?0x504b48:0x909186,[1,1]);
    instances(scene,`${zone.id}-grove-trunks`,new THREE.CylinderGeometry(forest||burnt?0.18:0.55,forest||burnt?0.34:STRUCTURE_SIZE.dressingColumnRadius,1,7),
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
  const materials={stone,timber,cloth,iron};
  for(const p of STRUCTURE_BOXES.filter(p=>p.mapId===zone.id)) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(p.width,p.height,p.depth),materials[p.material as keyof typeof materials]);
    mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.rotation;
    if(p.solid)mesh.userData.structureId=p.id;
    mesh.name=zone.id+'-landmark';scene.add(mesh);
  }
}
