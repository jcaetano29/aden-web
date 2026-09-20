import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getItem, itemVisual } from '@aden/shared';
import { surfaceMaps, type SurfaceKind } from './materialAtlas.js';

// Finite cache by base visual and rarity, never by unique instance id.
const models=new Map<string,THREE.Group>();
export function createItemModel(id:string, side?:-1|1):THREE.Group {
  const item=getItem(id), v=itemVisual(item);
  const key=JSON.stringify(v);
  if(side) {
    const partKey=key+side;
    if(!models.has(partKey)) {
      const source=createItemModel(id),half=new THREE.Group();
      source.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return;
        const geo=o.geometry,positions=geo.getAttribute('position'),attributes:Record<string,number[]>={};
        for(const name of Object.keys(geo.attributes))attributes[name]=[];
        for(let i=0;i<positions.count;i+=3) {
          const center=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3;
          if(center*side<0)continue;
          for(const [name,data] of Object.entries(attributes)) {
            const attr=geo.getAttribute(name);
            for(let j=i;j<i+3;j++)for(let k=0;k<attr.itemSize;k++)data.push(attr.array[j*attr.itemSize+k]);
          }
        }
        if(!attributes.position.length)return;
        const geometry=new THREE.BufferGeometry();
        for(const [name,data] of Object.entries(attributes))geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,geo.getAttribute(name).itemSize));
        geometry.translate(-side*(v.family==='pants'?.22:.3),0,0);half.add(new THREE.Mesh(geometry,o.material));
      });
      models.set(partKey,half);
    }
    return models.get(partKey)!.clone();
  }
  let prototype=models.get(key);
  if(!prototype) {
    prototype=new THREE.Group(); prototype.name=`item_${v.family}`;
    const maps=surfaceMaps(v.surface as SurfaceKind);
    const materials=[
      new THREE.MeshStandardMaterial({color:v.tint,roughness:v.surface==='metal'?.45:.83,metalness:v.surface==='metal'?.3:0,map:maps?.color??null,bumpMap:maps?.bump??null,bumpScale:.035,emissive:v.color,emissiveIntensity:v.glow*.25}),
      new THREE.MeshStandardMaterial({color:0x543b29,roughness:.85,map:surfaceMaps('wood')?.color??null}),
      new THREE.MeshStandardMaterial({color:v.accent,roughness:.32,metalness:.35,emissive:v.color,emissiveIntensity:v.glow}),
    ];
    const parts:THREE.BufferGeometry[][]=[[],[],[]];
    const part=(geo:THREE.BufferGeometry,x=0,y=0,z=0,sx=1,sy=1,sz=1,mat=0,rz=0)=>{
      geo.rotateZ(rz);geo.scale(sx,sy,sz);geo.translate(x,y,z);parts[mat].push(geo.index?geo.toNonIndexed():geo.clone());geo.dispose();
    };
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,mat=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),x,y,z,1,1,1,mat,rz);
    const ball=(x:number,y:number,z:number,w:number,h:number,d:number,mat=0)=>part(new THREE.SphereGeometry(1,10,6),x,y,z,w,h,d,mat);
    const rod=(x:number,y:number,z:number,r:number,h:number,mat=1,rz=0)=>part(new THREE.CylinderGeometry(r,r,h,8),x,y,z,1,1,1,mat,rz);
    const ring=(x:number,y:number,z:number,r:number,tube:number,mat=0,arc=Math.PI*2)=>part(new THREE.TorusGeometry(r,tube,6,20,arc),x,y,z,1,1,1,mat);
    const blade=(x:number,y:number,w:number,h:number)=>{
      const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h*.28);s.lineTo(0,h/2);s.lineTo(-w/2,h*.28);s.closePath();
      part(new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:false}),x,y,-.035);
    };
    switch(v.family) {
      case 'sword': blade(0,.25,.22,1.2);rod(0,-.52,0,.06,.35);box(0,-.29,0,.53,.09,.14);ball(0,-.72,0,.09,.09,.09,2);break;
      case 'axe': rod(0,0,0,.055,1.6);blade(.22,.45,.52,.65);box(0,.45,0,.22,.15,.2);break;
      case 'mace': rod(0,-.2,0,.06,1.15);ball(0,.48,0,.25,.3,.25);for(let i=0;i<4;i++)box(0,.48,0,.65,.13,.13,0,i*Math.PI/4);break;
      case 'spear': rod(0,-.2,0,.045,1.35);blade(0,.65,.22,.5);break;
      case 'staff': rod(0,-.1,0,.065,1.4);ring(0,.62,0,.22,.05);ball(0,.62,0,.12,.16,.12,2);break;
      case 'bow': ring(0,-.6,0,.6,.06,1,Math.PI);rod(0,-.6,0,.012,1.2,0,Math.PI/2);prototype.rotation.z=-Math.PI/2;break;
      case 'crossbow': box(0,0,0,.14,1.25,.16,1);ring(0,.15,0,.5,.05,0,Math.PI);rod(0,.15,0,.012,1,0,Math.PI/2);break;
      case 'shield': ball(0,0,0,.55,.7,.12);ring(0,0,.1,.38,.035,2);ball(0,0,.16,.14,.14,.09,2);break;
      case 'helmet': part(new THREE.SphereGeometry(.48,12,8,0,Math.PI*2,0,Math.PI/2),0,0,0);box(0,-.1,.42,.13,.38,.09);box(-.38,-.12,0,.12,.35,.4);box(.38,-.12,0,.12,.35,.4);break;
      case 'armor': box(0,0,0,.72,.85,.3);ball(-.46,.28,0,.22,.19,.25);ball(.46,.28,0,.22,.19,.25);box(0,-.29,.17,.75,.09,.06,1);box(0,.1,.17,.09,.56,.04,2);break;
      case 'pants': box(-.22,-.12,0,.3,.9,.25);box(.22,-.12,0,.3,.9,.25);box(0,.38,0,.74,.22,.3,1);break;
      case 'gloves': for(const x of [-.3,.3]){box(x,0,0,.28,.38,.18);box(x-.13,-.07,0,.12,.22,.15);for(let i=0;i<3;i++)rod(x-.09+i*.09,-.28,0,.035,.22,0);}break;
      case 'boots': for(const x of [-.3,.3]){box(x,.12,0,.3,.55,.27);box(x,-.2,.13,.33,.2,.52);box(x,.3,0,.35,.08,.31,1);}break;
      case 'wings': for(const side of [-1,1])for(let i=0;i<5;i++) {const feather=new THREE.ConeGeometry(.12,.95-i*.1,5);part(feather,side*(.18+i*.16),.25-i*.1,0,1,1,.5,0,-side*(.35+i*.12));}break;
      case 'ring':ring(0,0,0,.38,.085);ball(0,.38,0,.14,.13,.12,2);break;
      case 'pendant':ring(0,.18,0,.3,.025);blade(0,-.3,.34,.45);ball(0,-.26,.07,.07,.1,.06,2);break;
      case 'crown':part(new THREE.TorusGeometry(.43,.07,6,20).rotateX(Math.PI/2),0,-.15,0);for(let i=0;i<5;i++)part(new THREE.ConeGeometry(.12,.45,4),Math.cos(i*Math.PI*2/5)*.43,.07,Math.sin(i*Math.PI*2/5)*.43);break;
      case 'potion':ball(0,-.08,0,.32,.38,.28,2);rod(0,.3,0,.12,.2,0);rod(0,.44,0,.14,.09,1);box(0,-.08,.28,.23,.17,.03,0);break;
      case 'scroll':box(0,0,0,.65,.78,.05);rod(0,.4,0,.08,.85,1,Math.PI/2);rod(0,-.4,0,.08,.85,1,Math.PI/2);for(let i=0;i<4;i++)box(0,.2-i*.13,.04,.38,.025,.02,2);break;
      case 'gem': case 'core':part(new THREE.OctahedronGeometry(.42),0,0,0,1,1.3,1,2);ring(0,0,0,.46,.025);break;
      case 'arrows':case 'bolts':for(let i=0;i<3;i++){rod((i-1)*.16,0,0,.025,v.family==='arrows'?1.3:.85);blade((i-1)*.16,.5,.13,.25);box((i-1)*.16,-.45,0,.14,.2,.03,2);}break;
      case 'coins':for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.25,.25,.07,14),i%2*.18-.1,i*.075,0,1,1,1,2);break;
      case 'bone':rod(0,0,0,.09,.85,0);for(const y of [-.44,.44])for(const x of [-.09,.09])ball(x,y,0,.14,.13,.12);break;
      case 'relic':box(0,0,0,.5,.65,.23);ring(0,.1,.14,.16,.04,2);box(0,-.4,0,.7,.14,.36);break;
      case 'pet':case 'mount':ball(0,0,0,.3,.22,.42);ball(0,.25,.32,.24,.24,.22);for(const x of [-.18,.18]){part(new THREE.ConeGeometry(.09,.25,4),x,.5,.32);for(const z of [-.25,.25])rod(x,-.27,z,.065,.32,0);}ball(-.1,.29,.51,.035,.035,.025,2);ball(.1,.29,.51,.035,.035,.025,2);if(v.family==='mount')box(0,.23,-.1,.43,.1,.4,1);break;
    }
    parts.forEach((list,i)=>{if(list.length){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());prototype!.add(new THREE.Mesh(geo,materials[i]));}else materials[i].dispose();});
    models.set(key,prototype);
  }
  return prototype.clone();
}

/** Shared atlas textures belong to materialAtlas; never dispose them here. */
export function disposeItemModels() {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  for(const root of models.values())root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);materials.add(o.material as THREE.Material);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());models.clear();icons.clear();
}

const icons=new Map<string,string>();
/** Project the same mesh into a small SVG: no second renderer or icon asset download. */
export function itemIconUrl(id:string):string {
  const v=itemVisual(getItem(id)),key=JSON.stringify(v);
  if(icons.has(key))return icons.get(key)!;
  const root=createItemModel(id);root.rotation.y+=.35;root.rotation.x=.18;root.updateMatrixWorld(true);
  const triangles:{z:number;svg:string}[]=[];
  root.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    const pos=o.geometry.getAttribute('position'),mat=o.material as THREE.MeshStandardMaterial;
    for(let i=0;i<pos.count;i+=3){
      const pts=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j).applyMatrix4(o.matrixWorld));
      const normal=pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0])).normalize();
      if(normal.z<=0)continue;
      const shade=.55+.45*Math.max(0,normal.dot(new THREE.Vector3(-.3,.6,.75).normalize()));
      const color=mat.color.clone().multiplyScalar(shade).getStyle();
      triangles.push({z:pts.reduce((n,p)=>n+p.z,0),svg:`<polygon points="${pts.map(p=>`${32+p.x*29},${32-p.y*29}`).join(' ')}" fill="${color}"/>`});
    }
  });
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="8" fill="#181e24" stroke="${v.color}"/>${triangles.sort((a,b)=>a.z-b.z).map(t=>t.svg).join('')}</svg>`);
  icons.set(key,url);return url;
}

export function itemIcon(id:string):HTMLImageElement {
  const item=getItem(id),v=itemVisual(item),img=document.createElement('img');
  img.src=itemIconUrl(id);img.alt=item.name;img.title=`${item.name} · ${item.description??item.category??item.type}`;img.width=40;img.height=40;
  img.style.cssText=`flex:0 0 40px;border-radius:6px;box-shadow:0 0 ${Math.round(v.glow*20)}px ${v.color}55;`;
  return img;
}
