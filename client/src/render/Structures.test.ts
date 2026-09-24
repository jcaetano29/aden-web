import { expect, it } from "vitest";
import * as THREE from "three";
import { AUTHORED_STRUCTURES, STRUCTURE_OBSTACLES, STRUCTURE_BOXES, obstaclesForMap, type StructureObstacle } from "@aden/shared";
import { Environment } from "./Environment.js";

function expectMeshInside(mesh: THREE.Mesh, obstacle: StructureObstacle) {
  const positions=mesh.geometry.getAttribute('position');
  const c=Math.cos(obstacle.rotation),s=Math.sin(obstacle.rotation);
  for(let i=0;i<positions.count;i++) {
    const v=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
    const dx=v.x-obstacle.x,dz=v.z-obstacle.z;
    expect(Math.abs(dx*c-dz*s)).toBeLessThanOrEqual(obstacle.width/2+1e-4);
    expect(Math.abs(dx*s+dz*c)).toBeLessThanOrEqual(obstacle.depth/2+1e-4);
  }
}

it('uses shared footprints for actual transformed building bodies, arch piers and authored boxes',()=>{
 const scene=new THREE.Scene();new Environment(scene);scene.updateMatrixWorld(true);
 let checked=0;
 scene.traverse(object=>{
   if(object.userData.structureId) {
     const obstacle=STRUCTURE_OBSTACLES.find(p=>p.id===object.userData.structureId);
     expect(obstacle).toBeDefined();expectMeshInside(object as THREE.Mesh,obstacle!);checked++;
   }
   const id=object.userData.authoredStructureId;
   if(!id)return;
   const p=AUTHORED_STRUCTURES.find(p=>p.id===id)!;
   if(p.kind==='arch') {
     for(const [index,side]of [-1,1].entries())expectMeshInside(object.children[index] as THREE.Mesh,STRUCTURE_OBSTACLES.find(o=>o.id===`${id}-pier-${side}`)!);
   } else expectMeshInside(object.children[0] as THREE.Mesh,STRUCTURE_OBSTACLES.find(o=>o.id===id)!);
   checked++;
 });
 expect(checked).toBeGreaterThan(120);
 // Instanced ruined columns use the shared deterministic dressing stream.
 for(const map of ['ruinas','trono']) {
   const batch=scene.getObjectByName(map+'-grove-trunks') as THREE.InstancedMesh;
   const probe=new THREE.Mesh(batch.geometry);
   for(let i=0;i<batch.count;i++) {
     batch.getMatrixAt(i,probe.matrixWorld);
     probe.matrixWorld.premultiply(batch.matrixWorld);
     expectMeshInside(probe,STRUCTURE_OBSTACLES.find(o=>o.id===map+'-grove-column-'+i)!);
   }
 }
 for(const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='fence')) {
   // Each authored fence has both actual crossbars centered on its footprint.
   const rails=scene.children.filter(o=>o instanceof THREE.Mesh&&Math.abs(o.position.x-p.x)<1e-6&&Math.abs(o.position.z-p.z)<1e-6&&(o.position.y===.5||o.position.y===.95));
   expect(rails).toHaveLength(2);for(const rail of rails)expectMeshInside(rail as THREE.Mesh,p);
 }
 const renderedIds=new Set<string>();scene.traverse(o=>{if(o.userData.structureId)renderedIds.add(o.userData.structureId);});
 for(const box of STRUCTURE_BOXES.filter(p=>p.solid))expect(renderedIds.has(box.id),box.id).toBe(true);
});

it('keeps town gate, rotated arch and crypt central routes open',()=>{
 function inside(x:number,z:number,o:StructureObstacle) {
  const dx=x-o.x,dz=z-o.z,c=Math.cos(o.rotation),s=Math.sin(o.rotation);
  return Math.abs(dx*c-dz*s)<o.width/2+.4&&Math.abs(dx*s+dz*c)<o.depth/2+.4;
 }
 for(const [map,x,z]of [['pueblo',0,42],['bosque',300,55],['ruinas',40,300],['monasterio',1200,505]] as const)expect(obstaclesForMap(map).some(o=>inside(x,z,o))).toBe(false);
 for(let z=-47;z<=47;z++)expect(obstaclesForMap('cripta').some(o=>inside(900,z,o))).toBe(false);
 expect(STRUCTURE_OBSTACLES.every(o=>Object.isFrozen(o))).toBe(true);
 expect(new Set(STRUCTURE_OBSTACLES.map(o=>o.id)).size).toBe(STRUCTURE_OBSTACLES.length);
});

