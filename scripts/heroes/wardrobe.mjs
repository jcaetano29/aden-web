import * as T from 'three';
import {emptyGeometry,appendGeometry} from './build.mjs';
/** Authored in metres in the inspected rest pose. All pieces export as real indexed meshes. */
export function authoredGeometry(geometry,bone,jointNames,transform=new T.Matrix4(),weight){
 geometry.applyMatrix4(transform);const p=[...geometry.attributes.position.array],g=emptyGeometry();g.positions=p;g.indices=geometry.index?[...geometry.index.array]:Array.from({length:p.length/3},(_,i)=>i);g.uvs=geometry.attributes.uv?[...geometry.attributes.uv.array]:Array(p.length/3*2).fill(0);
 for(let i=0;i<p.length;i+=3){const influences=weight?.(p.slice(i,i+3))??[[bone,1]];while(influences.length<4)influences.push([bone,0]);g.joints.push(...influences.map(([n])=>jointNames.indexOf(n)));g.weights.push(...influences.map(([,w])=>w));}geometry.dispose();return g;
}
function matrix(position,scale=[1,1,1],rotation=[0,0,0]){return new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));}
function loft(rings,segments=32,range=[0,Math.PI*2]){const pos=[],uv=[],idx=[];for(let r=0;r<rings.length;r++){const [y,rx,rz,z=0]=rings[r];for(let s=0;s<=segments;s++){const a=range[0]+(range[1]-range[0])*s/segments;const pleat=1+.022*Math.cos(a*12);pos.push(Math.sin(a)*rx*pleat,y,Math.cos(a)*rz*pleat+z);uv.push(s/segments,r/(rings.length-1));if(r&&s){const i=r*(segments+1)+s;idx.push(i,i-1,i-segments-1,i-1,i-segments-2,i-segments-1);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
export function armor(gender,joints){const female=gender==='female',dy=female?-.038:0,sx=female?.9:1;const steel=emptyGeometry(),gloves=emptyGeometry(),boots=emptyGeometry(),gold=emptyGeometry(),robe=emptyGeometry();
 const add=(bucket,geo,bone,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0],weight)=>appendGeometry(bucket,authoredGeometry(geo,bone,joints,matrix(pos,scale,rot),weight));
 const torso=[[1.115,.155,.127,0],[1.20,.17,.139,-.005],[1.31,.218,.16,-.005],[1.40,.232,.147,-.025],[1.46,.17,.12,-.025],[1.49,.14,.11,-.035],[1.54,.13,.105,-.035],[1.575,.115,.100,-.035]];
 add(steel,loft(torso),'spine_03',[0,dy,0],[sx,1,1]);
 for(const ring of [torso[0],torso.at(-1)])add(gold,loft([ring,[ring[0]+.014,ring[1]+.002,ring[2]+.002,ring[3]]]),'spine_03',[0,dy,0],[sx,1,1]);
 for(const side of [-1,1]){const suffix=side===1?'l':'r';
 add(steel,new T.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI*.58),'clavicle_'+suffix,[side*(female?.215:.258),1.473+dy,-.064],[.155,.09,.145]);
 add(gold,new T.TorusGeometry(1,.045,5,28),'clavicle_'+suffix,[side*(female?.215:.258),1.455+dy,-.064],[.155,.145,.09],[Math.PI/2,0,0]);
 // Raised tapered ridge along each shoulder, built as a swept crest.
 add(gold,new T.ConeGeometry(.025,.15,5),'clavicle_'+suffix,[side*(female?.24:.285),1.56+dy,-.073],[1,1,1],[0,0,-side*.35]);
 add(gloves,new T.CylinderGeometry(.059,.078,.21,12,1,true),'lowerarm_'+suffix,[side*(female?.548:.589),1.432+dy,-.063],[1,1,1],[0,0,Math.PI/2]);
 for(const dx of [-.097,.097])add(gold,new T.TorusGeometry(.067,.009,5,16),'lowerarm_'+suffix,[side*(female?.548:.589)+dx,1.432+dy,-.063],[1,1,1],[0,Math.PI/2,0]);
 add(boots,new T.SphereGeometry(1,14,10),'calf_'+suffix,[side*(female?.11:.09),.29,-.015],[.069,.205,.065]);
 add(boots,new T.SphereGeometry(1,12,8),'calf_'+suffix,[side*(female?.11:.09),.447,.012],[.074,.05,.069]);
 }
 // A single crest and inlaid vertical ribs, all merged by material.
 add(gold,new T.OctahedronGeometry(.045,0),'spine_03',[0,1.373+dy,.153],[.72,1.4,.23]);
 for(const side of [-1,1])add(gold,new T.CylinderGeometry(.006,.004,.19,6),'spine_03',[side*.057,1.275+dy,.155],[1,1,1],[0,0,side*.22]);
 const mageWeight=([x,y])=>{const side=x>0?'l':'r',w=Math.max(0,Math.min(1,(1.14-y)/.5)),calf=Math.max(0,Math.min(.85,(.60-y)/.5));return [['pelvis',1-w],['thigh_'+side,w-calf],['calf_'+side,calf]];};
 const rings=[[.14,.34,.34,0],[.23,.32,.32,0],[.55,.27,.29,0],[.84,.22,.23,0],[1.08,.205,.19,0],[1.16,.19,.17,0]];
 // The opening at the front is deliberate: legs can move independently of the robe.
 for(const range of [[.09,Math.PI-.09],[Math.PI+.09,Math.PI*2-.09]])add(robe,loft(rings,20,range),'pelvis',[0,0,0],[sx,1,1],[0,0,0],mageWeight);
 const mageGold=emptyGeometry();for(const range of [[.09,Math.PI-.09],[Math.PI+.09,Math.PI*2-.09]])add(mageGold,loft([[.14,.344,.344,0],[.18,.336,.336,0]],20,range),'pelvis',[0,0,0],[sx,1,1],[0,0,0],mageWeight);
 for(const a of [.09,Math.PI-.09,Math.PI+.09,Math.PI*2-.09]){const rows=rings.map(([y,rx,rz,z])=>[y,rx+.003,rz+.003,z]);add(mageGold,loft(rows,1,[a-.018,a+.018]),'pelvis',[0,0,0],[sx,1,1],[0,0,0],mageWeight);}
 add(mageGold,loft([[1.14,.196,.18,0],[1.18,.19,.17,0]]),'pelvis',[0,0,0],[sx,1,1]);
 const mantle=emptyGeometry();add(mantle,loft([[1.075,.16,.138,0],[1.20,.165,.14,0],[1.32,.20,.155,-.01],[1.40,.205,.142,-.025],[1.455,.17,.11,-.025],[1.56,.12,.103,-.035]]),'spine_03',[0,dy,0],[sx,1,1]);
 add(mageGold,loft([[1.554,.122,.105,-.035],[1.57,.122,.105,-.035]]),'spine_03',[0,dy,0],[sx,1,1]);
 const helmet=emptyGeometry();add(helmet,new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.52),'Head',[0,1.72+(female?-.045:0),-.012],[.101,.127,.113]);return {steel,gloves,boots,gold,robe,mageGold,mantle,helmet};
}
export function staff(){const metal=emptyGeometry(),wood=emptyGeometry(),gem=emptyGeometry();const add=(bucket,g,pos,scale=[1,1,1],rot=[0,0,0])=>{const data=authoredGeometry(g,'root',['root'],matrix(pos,scale,rot));data.joints=[];data.weights=[];appendGeometry(bucket,data);};
 add(wood,new T.CylinderGeometry(.017,.024,1.55,12),[0,.45,0]);
 for(const y of [-.31,-.19,.11,.15,.70,1.1])add(metal,new T.TorusGeometry(.022,.007,6,16),[0,y,0],[1,1,1],[Math.PI/2,0,0]);
 for(const side of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(0,1.08,0),new T.Vector3(side*.115,1.19,0),new T.Vector3(side*.135,1.34,0),new T.Vector3(side*.068,1.45,0)]);add(metal,new T.TubeGeometry(curve,18,.014,6,false),[0,0,0]);}
 add(gem,new T.OctahedronGeometry(.095,0),[0,1.335,0],[.72,1.65,.72]);return {metal,wood,gem};}
/** Indexed fantasy weapon families authored around the hand pivot. */
export function weaponGeometry(family){
 const metal=emptyGeometry(),wood=emptyGeometry(),gold=emptyGeometry();
 const add=(bucket,g,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0])=>{const d=authoredGeometry(g,'root',['root'],matrix(pos,scale,rot));d.joints=[];d.weights=[];appendGeometry(bucket,d);};
 const blade=(y,w,h)=>{const shape=new T.Shape();shape.moveTo(-w*.5,-h*.5);shape.lineTo(w*.5,-h*.5);shape.lineTo(w*.40,h*.22);shape.lineTo(0,h*.5);shape.lineTo(-w*.40,h*.22);shape.closePath();add(metal,new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:1,steps:1}),[0,y,-.009]);};
 const rod=(bucket,y,r,h)=>add(bucket,new T.CylinderGeometry(r,r,h,12),[0,y,0]);
 const trim=y=>add(gold,new T.TorusGeometry(.033,.008,6,16),[0,y,0],[1,1,1],[Math.PI/2,0,0]);
 if(family==='dagger'){rod(wood,0,.027,.18);blade(.27,.095,.37);add(gold,new T.CapsuleGeometry(.017,.18,4,8),[0,.09,0],[1,1,1],[0,0,Math.PI/2]);add(gold,new T.OctahedronGeometry(.038),[0,-.1,0]);}
 if(family==='mace'){rod(wood,.15,.027,.6);rod(metal,.5,.058,.22);for(let i=0;i<6;i++)add(metal,new T.CapsuleGeometry(.018,.17,4,8),[Math.cos(i*Math.PI/3)*.10,.52,Math.sin(i*Math.PI/3)*.10]);for(const y of [-.16,.35,.65])trim(y);add(gold,new T.OctahedronGeometry(.075),[0,.54,0]);}
 if(family==='spear'){rod(wood,.28,.018,1.75);blade(1.25,.10,.35);for(const y of [-.55,.13,.2,1.08])trim(y);}
 if(family==='bow'||family==='crossbow'){
  const bow=new T.CatmullRomCurve3([new T.Vector3(0,-.66,0),new T.Vector3(.17,-.47,0),new T.Vector3(.24,-.23,0),new T.Vector3(.12,0,0),new T.Vector3(.24,.23,0),new T.Vector3(.17,.47,0),new T.Vector3(0,.66,0)]);
  const g=new T.TubeGeometry(bow,36,.023,8,false);if(family==='crossbow'){g.rotateZ(Math.PI/2);g.scale(.7,.7,1);g.translate(0,.35,0);}add(wood,g);
  if(family==='bow'){rod(gold,0,.002,1.32);add(wood,new T.CapsuleGeometry(.027,.14,4,10),[.12,0,0]);}
  else {add(wood,new T.CapsuleGeometry(.046,.62,4,12),[0,.15,0],[1,1,.6]);add(metal,new T.CylinderGeometry(.003,.003,.925,6),[0,.35,0],[1,1,1],[0,0,Math.PI/2]);add(gold,new T.TorusGeometry(.032,.009,6,12),[0,-.12,-.025]);rod(metal,.4,.007,.5);}
 }
 if(family==='bow')for(const data of [metal,wood,gold])for(let i=0;i<data.positions.length;i+=3)data.positions[i]-=.12;
 return {metal,wood,gold};
}
