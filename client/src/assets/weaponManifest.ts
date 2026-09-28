export type WeaponVisualFamily='sword'|'dagger'|'axe'|'mace'|'spear'|'staff'|'bow'|'crossbow'|'shield';
export const WEAPON_MANIFEST={
 sword:{url:'/models/heroes/sword.glb',anchor:'rightHand',position:[0,.065,0],rotation:[0,0,0],scale:.82},
 shield:{url:'/models/heroes/shield.glb',anchor:'leftHand',position:[0,.035,.045],rotation:[0,Math.PI/2,0],scale:1.08},
 staff:{url:'/models/heroes/staff.glb',anchor:'rightHand',position:[0,.06,0],rotation:[Math.PI,0,0],scale:1},
 dagger:{url:'/models/heroes/dagger.glb',anchor:'rightHand',position:[0,.06,0],rotation:[0,0,0],scale:1},
 axe:{url:'/models/heroes/axe.glb',anchor:'rightHand',position:[0,.06,0],rotation:[0,0,0],scale:1},
 mace:{url:'/models/heroes/mace.glb',anchor:'rightHand',position:[0,.06,0],rotation:[0,0,0],scale:1},
 spear:{url:'/models/heroes/spear.glb',anchor:'rightHand',position:[0,.06,0],rotation:[Math.PI,0,0],scale:1},
 bow:{url:'/models/heroes/bow.glb',anchor:'leftHand',position:[0,.06,0],rotation:[0,0,Math.PI/2],scale:1},
 crossbow:{url:'/models/heroes/crossbow.glb',anchor:'rightHand',position:[0,.06,0],rotation:[0,Math.PI/2,Math.PI/2],scale:1},
} as const;
export type SampleWeaponFamily=keyof typeof WEAPON_MANIFEST;
export function isSampleWeapon(family:string):family is SampleWeaponFamily{return Object.hasOwn(WEAPON_MANIFEST,family);}
