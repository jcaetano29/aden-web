import * as THREE from "three";

/** Closed, angular armour replaces the old exposed cartoon skeletons. */
export function addRevenantDetails(root: THREE.Object3D, model: string): void {
  if (model !== "DreadKnight" && model !== "DreadStalker") return;
  const knight = model === "DreadKnight";
  const h = root.userData.visualHeight as number;
  const head = root.getObjectByName("Head")!;
  root.updateMatrixWorld(true);
  const p = head.getWorldPosition(new THREE.Vector3());
  const iron = new THREE.MeshStandardMaterial({color:0x252e38,metalness:0.7,roughness:0.5});
  const edge = new THREE.MeshStandardMaterial({color:0x87939d,metalness:0.65,roughness:0.4});
  const black = new THREE.MeshStandardMaterial({color:0x080d14,roughness:0.95});
  const glow = new THREE.MeshStandardMaterial({color:0x89e7dc,emissive:0x30bda9,emissiveIntensity:2.8,roughness:0.5});
  function mesh(parent:THREE.Object3D, geometry:THREE.BufferGeometry, material:THREE.Material, x:number,y:number,z:number) {
    const m = new THREE.Mesh(geometry,material);m.position.set(x*h,y*h,z*h);parent.add(m);return m;
  }
  function anchor(group:THREE.Group,bone:THREE.Object3D,position:THREE.Vector3) {
    group.position.copy(position);root.add(group);root.updateMatrixWorld(true);bone.attach(group);
  }
  const mask = new THREE.Group();mask.name="revenant_mask";
  if(knight) {
    // Remove the complete rigid face/hair mesh, replacing it with a helmet.
    const face=root.getObjectByName("Face");if(face)face.visible=false;
    const shell=mesh(mask,new THREE.SphereGeometry(1,6,5),iron,0,0.092,0.02);
    shell.scale.set(h*.083,h*.115,h*.083);
    mesh(mask,new THREE.BoxGeometry(h*.143,h*.026,h*.025),black,0,.105,.094);
    const jaw=mesh(mask,new THREE.ConeGeometry(h*.07,h*.105,4),iron,0,.03,.054);jaw.rotation.z=Math.PI;
    for(const side of [-1,1]){
      const horn=mesh(mask,new THREE.ConeGeometry(h*.024,h*.16,5),edge,side*.074,.199,.005);horn.rotation.z=-side*.42;
      mesh(mask,new THREE.BoxGeometry(h*.045,h*.009,h*.009),glow,side*.037,.105,.109);
    }
    mesh(mask,new THREE.BoxGeometry(h*.012,h*.135,h*.02),edge,0,.066,.105);
  }else{
    // A steel death mask fills the opening of the original hood.
    const shell=mesh(mask,new THREE.SphereGeometry(1,6,5),iron,0,.055,.079);shell.scale.set(h*.069,h*.065,h*.035);
    for(const side of [-1,1])mesh(mask,new THREE.BoxGeometry(h*.036,h*.008,h*.012),glow,side*.026,.072,.115);
    for(const x of [-.018,0,.018])mesh(mask,new THREE.BoxGeometry(h*.006,h*.032,h*.008),black,x,.026,.114);
  }
  anchor(mask,head,p);
  for(const side of ["L","R"]){
    const bone=root.getObjectByName(`UpperArm${side}`);if(!bone)continue;
    const sign=side==="L"?1:-1;
    const pauldron=new THREE.Group();pauldron.name=`revenant_pauldron_${side}`;
    const plate=mesh(pauldron,new THREE.SphereGeometry(1,5,4),iron,sign*.02,0,0);plate.scale.set(h*.105,h*.07,h*.1);
    for(let i=0;i<(knight?3:1);i++){
      const spike=mesh(pauldron,new THREE.ConeGeometry(h*.019,h*(.11+i*.02),5),edge,sign*(.015+i*.027),.075,-.025+i*.022);spike.rotation.z=-sign*.35;
    }
    anchor(pauldron,bone,bone.getWorldPosition(new THREE.Vector3()));
  }
  const torso=root.getObjectByName("Torso");
  if(torso){
    const sigil=new THREE.Group();sigil.name="revenant_sigil";
    const gem=mesh(sigil,new THREE.OctahedronGeometry(h*.035),glow,0,0,.12);gem.scale.y=1.5;
    anchor(sigil,torso,torso.getWorldPosition(new THREE.Vector3()));
  }
}
