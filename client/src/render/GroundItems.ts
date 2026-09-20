
import * as THREE from 'three';
import { getItem,itemVisual,RARITY_LABELS } from '@aden/shared';
import { createItemModel } from './ItemModels.js';

interface ActiveItem { mesh:THREE.Group; halo:THREE.Mesh; mapId:string; itemId:string; qty:number; bornAt:number }
export class GroundItems {
  private readonly haloGeometry=new THREE.RingGeometry(.34,.49,24);
  private readonly haloMaterials=new Map<string,THREE.MeshBasicMaterial>();
  private readonly items=new Map<string,ActiveItem>();
  private mapId='pueblo';
  private selected:string|null=null;
  private readonly label=document.createElement('div');
  constructor(private readonly scene:THREE.Scene) {
    this.label.style.cssText='position:fixed;display:none;pointer-events:none;z-index:900;background:#10151eee;border:1px solid;padding:7px 10px;border-radius:5px;font:13px Georgia;max-width:310px;white-space:pre-line;text-shadow:0 1px 2px black;';
    document.body.append(this.label);
  }
  add(id:string,itemId:string,x:number,z:number,mapId='pueblo',qty=1) {
    if(this.items.has(id))return;
    const v=itemVisual(getItem(itemId)),mesh=createItemModel(itemId);
    mesh.position.set(x,.7,z);mesh.userData.dropId=id;mesh.visible=mapId===this.mapId;
    let material=this.haloMaterials.get(v.color);
    if(!material){material=new THREE.MeshBasicMaterial({color:v.color,transparent:true,opacity:v.halo,depthWrite:false,side:THREE.DoubleSide});this.haloMaterials.set(v.color,material);}
    const halo=new THREE.Mesh(this.haloGeometry,material);halo.rotation.x=-Math.PI/2;halo.position.set(x,.06,z);halo.visible=mesh.visible;
    this.scene.add(mesh,halo);this.items.set(id,{mesh,halo,mapId,itemId,qty,bornAt:performance.now()});
  }
  remove(id:string) {const entry=this.items.get(id);if(!entry)return;this.scene.remove(entry.mesh,entry.halo);this.items.delete(id);if(this.selected===id)this.select(null);}
  setMap(mapId:string) {if(mapId===this.mapId)return;this.mapId=mapId;this.select(null);for(const e of this.items.values())e.mesh.visible=e.halo.visible=e.mapId===mapId;}
  position(id:string) {return this.items.get(id)?.mesh.position;}
  raycastTargets() {return {objects:[...this.items.values()].filter(e=>e.mapId===this.mapId).map(e=>e.mesh),idOf:(o:THREE.Object3D):string|null=>{while(o.parent&&!o.userData.dropId)o=o.parent;return o.userData.dropId??null;}};}
  select(id:string|null) {this.selected=id;this.label.style.display='none';}
  hover(ray:THREE.Raycaster) {
    const targets=this.raycastTargets(),hit=ray.intersectObjects(targets.objects,true)[0];
    this.select(hit?targets.idOf(hit.object):null);
  }
  update(dt:number,camera?:THREE.Camera) {
    const now=performance.now();
    for(const entry of this.items.values()) {
      if(!entry.mesh.visible)continue;
      const t=(now-entry.bornAt)/1000;
      entry.mesh.rotation.y+=dt*.45;
      entry.mesh.position.y=.72+Math.sin(t*2.2)*.08+Math.sin(Math.min(1,t/.45)*Math.PI)*.4;
      entry.mesh.scale.setScalar(Math.min(1,.25+t/.3));
    }
    const e=this.selected?this.items.get(this.selected):undefined;
    if(!e||!camera||e.mapId!==this.mapId){this.label.style.display='none';return;}
    const p=e.mesh.position.clone().add(new THREE.Vector3(0,1,0)).project(camera);
    if(Math.abs(p.z)>1){this.label.style.display='none';return;}
    const item=getItem(e.itemId),v=itemVisual(item);
    this.label.textContent=`${item.name}${e.qty>1?` ×${e.qty}`:''}\n${RARITY_LABELS[item.rarity??'common']} · Botín público\nClic para acercarte y recoger`;
    this.label.style.color=v.color;this.label.style.display='block';
    this.label.style.left=`${Math.max(8,Math.min(window.innerWidth-325,(p.x*.5+.5)*window.innerWidth))}px`;
    this.label.style.top=`${Math.max(8,Math.min(window.innerHeight-95,(-p.y*.5+.5)*window.innerHeight))}px`;
  }
  dispose(){for(const id of this.items.keys())this.remove(id);this.label.remove();this.haloGeometry.dispose();this.haloMaterials.forEach(m=>m.dispose());this.haloMaterials.clear();}
}
