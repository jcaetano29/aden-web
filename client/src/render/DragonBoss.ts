import * as THREE from 'three';
import type {Character} from './CharacterFactory.js';
import {BossParts,sweep,type V3} from './BossGeometry.js';
import {leatherMat,boneMat,metalMat} from './textures.js';

export function createDragonBoss(crimson:boolean):Character {
  const root=new THREE.Group(),body=new THREE.Group(),parts=new BossParts();
  body.name='dragon_body';root.add(body);
  const hide=parts.material(leatherMat(crimson?0x702b33:0x39404b));hide.map?.dispose();hide.map=null;hide.color.set(crimson?0x702b33:0x39404b);hide.roughness=.82;hide.metalness=.07;
  // Small overlapping scales keep the organic surface readable under game light.
  const pixels=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    const row=Math.floor(y/16),sx=((x+(row%2)*8)%16-8)/8,sy=(y%16)/16;
    const edge=Math.abs(sx)*.32+sy>.93,shade=edge?95:Math.round(170+55*Math.sin(sy*Math.PI)*(1-sx*sx*.3));
    const i=(y*128+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=shade;pixels[i+3]=255;
  }
  const scales=new THREE.DataTexture(pixels,128,128);scales.wrapS=scales.wrapT=THREE.RepeatWrapping;scales.repeat.set(2,2);scales.needsUpdate=true;
  hide.bumpMap?.dispose();hide.map=scales;hide.bumpMap=scales;hide.bumpScale=.028;
  const plates=parts.material(metalMat(crimson?0x9d4842:0x62747c));plates.metalness=.18;plates.roughness=.72;
  const horn=parts.material(boneMat(0xc8b58d));
  const membrane=parts.material(leatherMat(crimson?0x9b3038:0x7a4034));membrane.map?.dispose();membrane.map=null;membrane.color.set(crimson?0x843139:0x67392e);membrane.side=THREE.DoubleSide;
  const fire=parts.material(new THREE.MeshStandardMaterial({color:0xffb454,emissive:0xff7424,emissiveIntensity:1.7,roughness:.4}));
  const m=(p:THREE.Object3D,n:string,g:THREE.BufferGeometry,mat:THREE.Material,pos:V3=[0,0,0],scale:V3=[1,1,1])=>parts.mesh(p,n,g,mat,pos,scale);
  const sphere=(p:THREE.Object3D,n:string,mat:THREE.Material,pos:V3,scale:V3)=>m(p,n,new THREE.SphereGeometry(1,18,12),mat,pos,scale);
  // Long, deep ribcage, elevated neck and a tapering jaw; no oversized round head.
  sphere(body,'ribcage',hide,[0,1.45,-.25],[.68,.68,1.35]);
  for(let i=0;i<5;i++)sphere(body,'breast_scale',plates,[0,1.13+i*.18,.73],[.44-i*.017,.13,.22]);
  m(body,'neck',sweep([[0,1.45,.3],[0,2.05,.96],[0,2.65,1.12],[0,2.9,1.5]],[.48,.38,.28,.32]),hide);
  const head=new THREE.Group();head.name='dragon_head';head.position.set(0,2.86,1.47);body.add(head);
  sphere(head,'skull',hide,[0,0,.08],[.4,.32,.51]);
  sphere(head,'long_muzzle',plates,[0,-.11,.5],[.28,.18,.53]);
  sphere(head,'lower_jaw',hide,[0,-.28,.45],[.25,.09,.52]);
  for(const side of [-1,1]) {
    sphere(head,'eye',fire,[side*.302,.06,.37],[.045,.024,.078]);
    m(head,'brow',sweep([[side*.18,.14,.5],[side*.35,.19,.3],[side*.4,.14,.06]],[.065,.085,.018],12),plates);
    m(head,'royal_horn',sweep([[side*.25,.2,-.05],[side*.48,.45,-.27],[side*.6,.65,-.62],[side*.54,.8,-.85]],[.16,.12,.065,.003]),horn);
    m(head,'cheek_blade',sweep([[side*.28,-.04,.05],[side*.56,.05,-.14],[side*.7,.2,-.4]],[.12,.09,.002]),plates);
    for(let i=0;i<5;i++)m(head,'fang',new THREE.ConeGeometry(.032,.15,6),horn,[side*.225,-.25,.23+i*.13]).rotation.z=Math.PI;
    // Two articulated pairs of load-bearing legs, visibly grounded.
    for(const rear of [false,true]) {
      const leg=new THREE.Group();leg.name=`dragon_leg_${side}_${rear}`;leg.position.set(side*.45,1.45,rear?-1.02:.62);body.add(leg);
      m(leg,'upper_leg',sweep([[0,0,0],[side*.4,-.43,rear?-.23:.05],[side*.4,-.79,.12]],[.28,.3,.2]),hide);
      m(leg,'shin',sweep([[side*.4,-.77,.12],[side*.42,-1.07,.2],[side*.45,-1.3,.42]],[.19,.14,.18]),plates);
      sphere(leg,'foot',hide,[side*.45,-1.32,.51],[.28,.13,.4]);
      for(let j=0;j<3;j++)m(leg,'talon',sweep([[side*.25+j*.15,-1.32,.69],[side*.25+j*.15,-1.35,.94],[side*.25+j*.15,-1.37,1.05]],[.065,.045,.001],10,6),horn);
    }
    const wing=new THREE.Group();wing.name=side===-1?'dragon_wing_left':'dragon_wing_right';wing.position.set(side*.48,1.96,.05);body.add(wing);
    const elbow:V3=[side*1.16,1.02,-.23],tip:V3=[side*3.22,1.47,-.72];
    m(wing,'wing_arm',sweep([[0,0,0],elbow,tip],[.17,.12,.013]),hide);
    const fingers:V3[]=[tip,[side*2.8,.46,-1.5],[side*2.12,-.12,-2.12],[side*1.2,-.5,-1.68],[side*.15,-.64,-1.12]];
    for(let i=0;i<fingers.length-1;i++) {
      const a=new THREE.Vector3(...fingers[i]),b=new THREE.Vector3(...fingers[i+1]),hub=new THREE.Vector3(...elbow);
      const positions:number[]=[],indices:number[]=[];
      // Curved triangular sails with scalloped trailing edges.
      for(let r=0;r<=10;r++)for(let s=0;s<=10;s++) {
        const t=r/10,u=s/10,edge=a.clone().lerp(b,u);
        edge.lerp(hub,Math.sin(u*Math.PI)*.11);
        const v=hub.clone().lerp(edge,t);v.y-=Math.sin(t*Math.PI)*Math.sin(u*Math.PI)*.24;
        positions.push(v.x,v.y,v.z);
        if(r<10&&s<10){const k=r*11+s;indices.push(k,k+11,k+1,k+1,k+11,k+12);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      m(wing,'wing_membrane',g,membrane);
      m(wing,'wing_finger',sweep([elbow,fingers[i]],[.07,.014],12,7),horn);
    }
    m(wing,'wing_claw',sweep([elbow,[side*1.18,1.45,-.3],[side*1.37,1.62,-.49]],[.1,.05,.001]),horn);
  }
  const tail=new THREE.Group();tail.name='dragon_tail';tail.position.set(0,1.35,-1.35);body.add(tail);
  m(tail,'tail',sweep([[0,0,0],[.2,-.1,-.9],[.6,-.45,-1.8],[.94,-.58,-2.6],[1.05,-.24,-3.12]],[.4,.28,.18,.07,.003],40),hide);
  for(let i=0;i<10;i++) {
    const z=-1.22+i*.29,y=2.04+Math.max(0,z)*.44;
    m(body,'dorsal_spine',sweep([[0,y,z],[0,y+.32,z-.09],[0,y+.51,z-.32]],[.13,.08,.002],12,8),horn);
    for(const side of [-1,1])sphere(body,'overlapping_scale',plates,[side*.35,y-.26,z],[.16,.05,.18]);
  }
  root.userData.visualHeight=3.8;
  const mixer=new THREE.AnimationMixer(body),clips:THREE.AnimationClip[]=[];
  const track=(name:string,times:number[],values:number[])=>new THREE.NumberKeyframeTrack(name,times,values);
  for(const [name,duration,amplitude] of [['Idle',3,.045],['Walk',1.2,.12],['Primary_Attack',1,.24],['Hit',.45,.1],['Death',2,0]] as const) {
    const times=[0,duration*.25,duration*.5,duration*.75,duration],tracks:THREE.KeyframeTrack[]=[];
    tracks.push(track('dragon_body.rotation[z]',times,name==='Death'?[0,.1,.4,1.1,1.35]:[0,0,0,0,0]));
    tracks.push(track('dragon_body.position[y]',times,name==='Death'?[0,-.1,-.3,-.55,-.7]:[0,amplitude*.3,0,-amplitude*.3,0]));
    for(const [wing,side]of [['dragon_wing_left',-1],['dragon_wing_right',1]] as const)
      tracks.push(track(`${wing}.rotation[z]`,times,name==='Death'?[0,side*.3,side*.55,side*.6,side*.6]:[0,side*amplitude,0,-side*amplitude,0]));
    tracks.push(track('dragon_head.rotation[x]',times,name==='Primary_Attack'?[0,-.25,.65,.2,0]:[0,.02,0,-.02,0]));
    tracks.push(track('dragon_tail.rotation[y]',times,[0,amplitude,0,-amplitude,0]));
    for(const side of [-1,1])for(const rear of [false,true]) {
      const sign=side*(rear?-1:1),a=name==='Walk'?.28:name==='Primary_Attack'?.08:0;
      tracks.push(track(`dragon_leg_${side}_${rear}.rotation[x]`,times,[0,a*sign,0,-a*sign,0]));
    }
    clips.push(new THREE.AnimationClip(name,duration,tracks));
  }
  const actions=new Map(clips.map(c=>[c.name,mixer.clipAction(c)]));
  let current:THREE.AnimationAction|undefined,once:THREE.AnimationAction|undefined,callback:(()=>void)|undefined,disposed=false;
  const finished=(e:{action:THREE.AnimationAction})=>{if(e.action!==once)return;const cb=callback;callback=undefined;once=undefined;cb?.();};mixer.addEventListener('finished',finished);
  const character:Character={root,mixer,clipNames:clips.map(c=>c.name),equipment:{update(){},dispose(){}},
    play(name,immediate=false){if(disposed)return;const a=actions.get(name);if(!a)return;callback=undefined;once=undefined;if(immediate)mixer.stopAllAction();else if(current&&current!==a)current.fadeOut(.15);a.reset().setLoop(THREE.LoopRepeat,Infinity).setEffectiveWeight(1);a.clampWhenFinished=false;a.play();if(!immediate)a.fadeIn(.15);current=a;if(immediate)mixer.update(0);},
    playOnce(name,done){if(disposed)return;const a=actions.get(name);if(!a){done();return;}if(current&&current!==a)current.fadeOut(.1);a.reset().setLoop(THREE.LoopOnce,1).setEffectiveWeight(1);a.clampWhenFinished=true;a.play().fadeIn(.1);current=once=a;callback=done;},
    dispose(){if(disposed)return;disposed=true;mixer.removeEventListener('finished',finished);mixer.stopAllAction();mixer.uncacheRoot(body);parts.dispose();root.removeFromParent();},
  };
  character.play('Idle',true);return character;
}
