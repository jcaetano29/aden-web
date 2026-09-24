import * as THREE from 'three';
import { AUTHORED_STRUCTURES } from '@aden/shared';
import { stoneMat, metalMat, woodMat } from './textures.js';

/** Solid walls use the same footprints as server navigation. */
export function addMonasteryEnvironment(scene: THREE.Scene): void {
  const root=new THREE.Group(); root.name='monasterio-landmarks';
  const stone=stoneMat(0xa1a394,[3,2]);
  for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='monasteryWall')) {
    const wall=new THREE.Mesh(new THREE.BoxGeometry(p.width,p.height,p.depth),stone);
    wall.position.set(p.x,p.height/2,p.z); wall.castShadow=true; wall.receiveShadow=true;
    wall.userData.structureId=p.id; root.add(wall);
  }
  const paving=stoneMat(0xb1ac98,[14,14]);
  for (const [x,z,w,d] of [[1200,450,9,102],[1200,460,65,9],[1180,434,36,7],[1200,401,36,23]]) {
    const path=new THREE.Mesh(new THREE.PlaneGeometry(w,d),paving);
    path.rotation.x=-Math.PI/2; path.position.set(x,.045,z); path.receiveShadow=true; root.add(path);
  }
  const iron=metalMat(0x555e59), wood=woodMat(0x786f59,[1,2]);
  // Bars sit against the rear wall, leaving every cell accessible from the courtyard.
  for (const z of [444,434,424]) {
    for (let i=0;i<8;i++) {
      const bar=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.5,5),iron);
      bar.position.set(1156,1.25,z-3+i*.85); root.add(bar);
    }
    const cot=new THREE.Mesh(new THREE.BoxGeometry(1.8,.35,.8),wood);
    cot.position.set(1158,.18,z); root.add(cot);
  }
  // Stacked records form an archive along the outer wall, outside the walking route.
  for (let i=0;i<8;i++) {
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(.6,1.8,1.8),wood);
    shelf.position.set(1239, .9, 451+i*2.5); root.add(shelf);
    const pages=new THREE.Mesh(new THREE.BoxGeometry(.65,.8,1.5),new THREE.MeshStandardMaterial({color:i%2?0xaeb8a0:0xc4ad86}));
    pages.position.set(1238.9,1.3,451+i*2.5); root.add(pages);
  }
  const bell=new THREE.Mesh(new THREE.CylinderGeometry(1.1,2.2,2.6,16,1,true),metalMat(0xb4a56d));
  bell.position.set(1200,13,391); bell.castShadow=true; root.add(bell);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(41,.6,.8),wood);
  beam.position.set(1200,15,391); root.add(beam);
  scene.add(root);
}
