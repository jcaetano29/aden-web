import * as THREE from 'three';
import { getItem,itemVisual } from '@aden/shared';
import { createItemModel } from './ItemModels.js';
import { HeroEquipment } from './HeroEquipment.js';

/** Shared item meshes fitted in character units, then attached to animated bones. */
export class EquipmentViews {
  private signature='';
  private meshes:THREE.Object3D[]=[];
  private originals:{object:THREE.Object3D;visible:boolean}[]=[];
  private readonly reference=new Map<THREE.Object3D,THREE.Matrix4>();
  private readonly hero:HeroEquipment;
  constructor(private readonly root:THREE.Object3D) {
    this.hero=new HeroEquipment(root);
    // Captured before the character mixer starts; never fit against a moving bone.
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert();
    root.traverse(o=>this.reference.set(o,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
  }
  private attach(mesh:THREE.Object3D,anchor:THREE.Object3D,offset:THREE.Vector3,scale:number) {
    const bind=this.reference.get(anchor)!;
    mesh.position.setFromMatrixPosition(bind).add(offset);mesh.scale.setScalar(scale);mesh.updateMatrix();
    bind.clone().invert().multiply(mesh.matrix).decompose(mesh.position,mesh.quaternion,mesh.scale);
    anchor.add(mesh);this.meshes.push(mesh);
  }
  update(equipment:Record<string,string>) {
    const signature=JSON.stringify(equipment);if(signature===this.signature)return;
    this.clear();this.signature=signature;this.root.updateMatrixWorld(true);
    const h=this.root.userData.visualHeight??2.5;
    const anchors:Record<string,[string,number,number,number,number]>={
      weapon:['Weapon.R',0,.35,0,.85],shield:['LowerArm.L',0,0,.22,.7],
      helmet:['Head',0,.16,0,.85],armor:['Torso',0,-.08,.02,1],
      pants:['Hips',0,-.42,0,.95],boots:['Hips',0,-1.05,.04,.8],gloves:['Torso',0,-.6,.2,.65],
      accessory:['Torso',0,.1,.3,.33],ring:['Fist.R',0,0,0,.18],wings:['Torso',0,.05,-.32,1.5],pet:['',.9,.3,0,.65],
    };
    for(const [slot,id] of Object.entries(equipment)) {
      if(!id||!anchors[slot])continue;
      if(this.hero.apply(slot,id))continue;
      if(['gloves','boots','pants'].includes(slot)) {
        for(const side of [-1,1] as const) {
          const boneName=`${slot==='gloves'?'Fist':slot==='boots'?'Foot':'UpperLeg'}.${side===1?'L':'R'}`;
          const anchor=this.root.getObjectByName(boneName)??this.root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(boneName));
          if(!anchor)continue;
          const mesh=createItemModel(id,side);mesh.userData.equipped=true;mesh.name=`equipped_${slot}_${side}`;
          this.attach(mesh,anchor,new THREE.Vector3(0,(slot==='pants'?-.28:slot==='boots'?.04:0)*h/2.5,0),.75*h/2.5);
        }
        continue;
      }
      const item=getItem(id),family=itemVisual(item).family;
      const [bone,x,y,z,scale]=anchors[family==='crown'?'helmet':family==='ring'?'ring':slot];
      // Transformation models have no matching humanoid rig; the transformation stays authoritative.
      const anchor=bone?(this.root.getObjectByName(bone)??this.root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(bone))):this.root;if(!anchor)continue;
      if(slot==='weapon') {
        anchor.traverse(o=>{if(o instanceof THREE.Mesh){this.originals.push({object:o,visible:o.visible});o.visible=false;}});
        const bow=this.root.getObjectByName('ranger_bow');
        if(bow){this.originals.push({object:bow,visible:bow.visible});bow.visible=false;}
      }
      const mesh=createItemModel(id);mesh.userData.equipped=true;mesh.name=`equipped_${slot}`;
      if(item.slot==='wings')mesh.rotation.y=Math.PI;
      this.attach(mesh,anchor,new THREE.Vector3(x,y,z).multiplyScalar(h/2.5),scale*h/2.5);
    }
  }
  private clear(){this.hero.clear();for(const mesh of this.meshes)mesh.removeFromParent();this.meshes=[];for(const {object,visible} of this.originals)object.visible=visible;this.originals=[];}
  dispose(){this.clear();this.signature='';}
}
