import * as THREE from 'three';
import {defaultAppearance} from '@aden/shared';
import type {Character} from './CharacterFactory.js';
import type {ModularHeroFactory} from './ModularHeroFactory.js';
import {BossParts,sweep,capeGeometry,type V3} from './BossGeometry.js';
import {createDragonBoss} from './DragonBoss.js';
import {metalMat,clothMat,boneMat,crackedStoneMat} from './textures.js';

interface Regalia {className:string;metal:number;trim:number;cloth:number;glow:number;kind:'king'|'forge'|'specter'|'demon'|'colossus'}
const regalia:Record<string,Regalia>={
  skeleton_king:{className:'knight',metal:0x313e56,trim:0xc8aa66,cloth:0x47233f,glow:0x83dded,kind:'king'},
  halden:{className:'knight',metal:0x555662,trim:0xc48f4d,cloth:0x4b2920,glow:0xffa447,kind:'forge'},
  memory_prior:{className:'mage',metal:0x414655,trim:0xbba979,cloth:0x303950,glow:0x8bdccb,kind:'specter'},
  veil_specter:{className:'mage',metal:0x344759,trim:0x90b9c7,cloth:0x263b50,glow:0x63c8e7,kind:'specter'},
  waste_herald:{className:'barbarian',metal:0x4a3339,trim:0xb48551,cloth:0x392021,glow:0xf29639,kind:'demon'},
  ember_colossus:{className:'barbarian',metal:0x41414b,trim:0x92613e,cloth:0x2e2523,glow:0xff882f,kind:'colossus'},
};

/** Boss-only presentation. Combat templates, hit timing and normal mobs are shared. */
export function createBossCharacter(templateId:string,heroes:ModularHeroFactory):Character|undefined {
  if(templateId==='vharzul'||templateId==='crimson_dragon')return createDragonBoss(templateId==='crimson_dragon');
  const style=regalia[templateId];if(!style)return undefined;
  const appearance={...defaultAppearance(style.className,'male'),hairStyleId:'none',facialHairId:'none'};
  const hero=heroes.create(style.className,appearance),root=hero.root,parts=new BossParts();
  if(style.kind==='forge')hero.equipment?.update({weapon:'aden_martillo_del_rompemuros'});
  const spectral=style.kind==='specter',colossus=style.kind==='colossus';
  root.name=`boss_${templateId}`;
  root.traverse(o=>{
    if(o.name.startsWith('face_') || o.name==='hero_eyes' || o.name==='hero_brows')o.visible=false;
    if(!(o instanceof THREE.Mesh))return;
    for(const material of Array.isArray(o.material)?o.material:[o.material]) {
      if(!(material instanceof THREE.MeshStandardMaterial))continue;
      if(material.name.startsWith('skin'))material.color.set(spectral?0x82949b:style.kind==='demon'?0x765154:colossus?0x66636b:0xa49b91);
      else if(material.name.includes('gold'))material.color.set(style.trim);
      else if(material.name.includes('steel')||material.name.includes('metal')){material.color.set(style.metal);material.metalness=.65;material.roughness=.43;}
      else if(material.name.includes('cloth')||material.name.includes('leather')||material.name.includes('robe'))material.color.set(style.cloth);
    }
  });
  const metal=parts.material(colossus?crackedStoneMat(style.metal):metalMat(style.metal));
  metal.roughness=.67;metal.metalness=.4;
  const trim=parts.material(metalMat(style.trim)),cloth=parts.material(clothMat(style.cloth));cloth.side=THREE.DoubleSide;
  const ivory=parts.material(boneMat(0xb8af94));
  const glow=parts.material(new THREE.MeshStandardMaterial({color:style.glow,emissive:style.glow,emissiveIntensity:1.1,roughness:.4}));
  const attach=(boneName:string,name:string,g:THREE.BufferGeometry,mat:THREE.Material,p:V3,s:V3=[1,1,1])=>{
    const mesh=parts.mesh(root,name,g,mat,p,s);root.updateMatrixWorld(true);
    const bone=root.getObjectByName(boneName);if(!bone)throw new Error(`Boss rig is missing ${boneName}`);
    bone.attach(mesh);return mesh;
  };
  // Sculpted overlapping pauldrons with a gilded ridge, held by the animated torso.
  for(const side of [-1,1]) {
    for(let layer=0;layer<3;layer++) {
      const x=side*(.46+layer*.055),y=2.1-layer*.105;
      attach('spine_03',`boss_pauldron_${side}_${layer}`,new THREE.SphereGeometry(1,8,5,0,Math.PI*2,0,Math.PI*.63),layer===1?trim:metal,[x,y,-.015],[.32-layer*.025,.145,.275]);
    }
    for(let i=0;i<3;i++)attach('spine_03','boss_pauldron_spine',sweep([[side*(.5+i*.09),2.17,-.1],[side*(.59+i*.1),2.31+i*.035,-.17],[side*(.68+i*.13),2.43+i*.04,-.25]],[.055,.032,.002],14,8),ivory,[0,0,0]);
    attach('spine_03','boss_chest_ridge',sweep([[side*.32,2.03,.19],[side*.19,1.86,.31],[0,1.73,.34]],[.037,.032,.017],18,8),trim,[0,0,0]);
  }
  const gem=attach('spine_03','boss_soulstone',new THREE.OctahedronGeometry(.075),glow,[0,1.96,.36],[.7,1.15,.45]);
  gem.userData.bossEmblem=true;
  const cape=attach('spine_03','boss_mantle',capeGeometry(spectral?1.65:1.42,spectral?1.98:1.8),cloth,[0,2.13,-.26]);
  cape.castShadow=true;
  if(spectral) {
    // Tall mitre, dark face veil and segmented aureole: readable at game distance.
    attach('Head','boss_veil',new THREE.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI*.73),cloth,[0,2.38,.01],[.26,.35,.255]);
    attach('Head','boss_crown',new THREE.ConeGeometry(.245,.62,6),trim,[0,2.76,-.015],[1,1,.52]);
    for(const side of [-1,1])attach('Head','boss_eyes',new THREE.SphereGeometry(1,10,6),glow,[side*.075,2.39,.248],[.038,.015,.016]);
    for(let i=0;i<9;i++) {
      const a=(i/8)*Math.PI;
      attach('Head','boss_aureole',new THREE.OctahedronGeometry(.065),trim,[Math.cos(a)*.47,2.45+Math.sin(a)*.55,-.14],[.7,2,.6]);
    }
  } else {
    // Armored faceplate, narrow eye slits and a crown with unequal spires.
    const face=new THREE.Shape();face.moveTo(-.17,.2);face.lineTo(-.22,.08);face.lineTo(-.13,-.2);face.lineTo(0,-.28);face.lineTo(.13,-.2);face.lineTo(.22,.08);face.lineTo(.17,.2);face.closePath();
    attach('Head','boss_faceplate',new THREE.ExtrudeGeometry(face,{depth:.045,bevelEnabled:true,bevelThickness:.015,bevelSize:.025,bevelSegments:2,steps:1}),metal,[0,2.34,.17]);
    attach('Head','boss_helmet_shell',new THREE.SphereGeometry(1,10,8),metal,[0,2.4,-.04],[.22,.25,.2]);
    attach('Head','boss_visor_ridge',sweep([[0,2.55,.25],[0,2.35,.27],[0,2.13,.22]],[.024,.032,.006],14,6),trim,[0,0,0]);
    for(const side of [-1,1])attach('Head','boss_eyes',new THREE.SphereGeometry(1,10,6),glow,[side*.078,2.39,.237],[.052,.009,.008]);
    const band=attach('Head','boss_crown',new THREE.TorusGeometry(.225,.033,7,24),trim,[0,2.49,0]);
    // Geometry orientation must be baked before attachment (bone-local axes differ).
    band.geometry.rotateX(Math.PI/2);
    for(let i=0;i<7;i++) {
      const a=(i/7)*Math.PI*2,x=Math.sin(a)*.21,z=Math.cos(a)*.2;
      const h=style.kind==='king'?.24+(i%2)*.15:.12;
      attach('Head','boss_crown_spire',sweep([[x,2.47,z],[x*1.15,2.57,z*1.15],[x*1.27,2.53+h,z*1.27]],[.045,.028,.002],12,7),trim,[0,0,0]);
    }
    if(style.kind==='demon'||colossus)for(const side of [-1,1])attach('Head','boss_horn',sweep([[side*.18,2.45,-.04],[side*.37,2.7,-.17],[side*.48,2.91,-.35],[side*.34,3.02,-.39]],[.095,.075,.045,.001]),ivory,[0,0,0]);
  }
  if(style.kind==='forge') {
    // Smith's furnace vents and concentric riveted plates.
    for(let i=-2;i<=2;i++)attach('spine_03','boss_furnace_vent',new THREE.CapsuleGeometry(.017,.2,3,6),glow,[i*.058,1.69,.31]);
    for(const side of [-1,1])attach('spine_03','boss_forge_seal',new THREE.TorusGeometry(.18,.032,6,16),trim,[side*.57,2.13,.21]);
  }
  if(colossus) {
    for(const side of [-1,1])for(let i=0;i<3;i++)attach('spine_03','boss_obsidian',new THREE.DodecahedronGeometry(.23,1),metal,[side*(.24+i*.13),1.9+i*.12,.025],[1,1.6,1.05]);
    for(let i=0;i<4;i++)attach('spine_03','boss_magma_seam',sweep([[-.23,1.95-i*.13,.24],[0,1.88-i*.13,.33],[.23,1.95-i*.13,.24]],[.018,.023,.018],12,6),glow,[0,0,0]);
    // Broaden the presentation rig below the server-position root.
    for(const child of root.children){child.scale.x*=1.24;child.scale.z*=1.16;}
  }
  root.userData.visualHeight=spectral?3.1:style.kind==='demon'?3.1:2.94;
  const release=hero.dispose?.bind(hero);let disposed=false;
  hero.dispose=()=>{if(disposed)return;disposed=true;parts.dispose();hero.equipment?.dispose();release?.();};
  return hero;
}
