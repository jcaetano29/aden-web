import * as THREE from 'three';
import { WILDERNESS_CAMPS, WILDERNESS_LANDMARKS, wildernessProps, getZone } from '@aden/shared';
import { terrainMat, stoneMat, foliageMat, woodMat, clothMat } from './textures.js';

/** Batched outer scenery and four identifiable camps per expanded map. */
export function addWilderness(scene: THREE.Scene): void {
  for(const mapId of new Set(WILDERNESS_CAMPS.map(c=>c.mapId))) {
    const zone=getZone(mapId), group=new THREE.Group(); group.name=`wilderness-${mapId}`;
    const forest=['bosque','marismas'].includes(mapId);
    const props=wildernessProps(mapId);
    const geometry=forest?new THREE.IcosahedronGeometry(1,1):new THREE.DodecahedronGeometry(1,0);
    const material=forest?foliageMat(0x6b815b):stoneMat(mapId==='fragua'?0x654940:0x797777);
    const batch=new THREE.InstancedMesh(geometry,material,props.length), pose=new THREE.Object3D();
    props.forEach((p,i)=>{pose.position.set(p.x,.18*p.scale,p.z);pose.scale.set(p.scale,.35*p.scale,p.scale);pose.rotation.y=p.yaw;pose.updateMatrix();batch.setMatrixAt(i,pose.matrix);});
    batch.computeBoundingSphere();batch.receiveShadow=true;batch.userData.noCastShadow=true;group.add(batch);
    // Roads extend the existing cross all the way into the new outskirts.
    for(const [dx,dz,w,d] of [[0,90,6,62],[0,-90,6,62],[90,0,62,5],[-90,0,62,5]]) {
      const road=new THREE.Mesh(new THREE.PlaneGeometry(w,d),terrainMat('ruinas',[w/5,d/5]));
      road.rotation.x=-Math.PI/2;road.position.set(zone.center.x+dx,.03,zone.center.z+dz);
      road.userData.ground=true;group.add(road);
    }
    const timber=woodMat(),banner=clothMat(zone.biome.accent),stone=stoneMat(0x858078);
    for(const mark of WILDERNESS_LANDMARKS.filter(p=>p.mapId===mapId)) {
      const post=mark.kind==='post';
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(post?.13:.45,mark.width/2,mark.height,post?8:6),post?timber:stone);
      mesh.name=mark.id;mesh.position.set(mark.x,mark.height/2,mark.z);group.add(mesh);
      if(post) {
        const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.2,3),banner);flag.position.set(mark.x+mark.side*1.05,3.35,mark.z);flag.rotation.y=mark.side*.3;flag.material.side=THREE.DoubleSide;group.add(flag);
      }
    }
    WILDERNESS_CAMPS.filter(c=>c.mapId===mapId).forEach(camp=>{
      const trail=new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(camp.centerX-zone.center.x),3),terrainMat('ruinas',[18,1]));
      trail.rotation.x=-Math.PI/2;trail.position.set((camp.centerX+zone.center.x)/2,.032,camp.centerZ);trail.userData.ground=true;group.add(trail);
    });
    scene.add(group);
  }
}
