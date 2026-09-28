import type {CharacterGender} from '@aden/shared';
export const HERO_ANCHORS = {head:'Head',torso:'spine_03',pelvis:'pelvis',rightHand:'hand_r',leftHand:'hand_l',rightFoot:'foot_r',leftFoot:'foot_l'} as const;
export type HeroAnchor=keyof typeof HERO_ANCHORS;
export const HERO_MANIFEST:Record<CharacterGender,{url:string;height:number}>={male:{url:'/models/heroes/hero-male.glb',height:2.5},female:{url:'/models/heroes/hero-female.glb',height:2.5}};
export const HERO_CLIPS={Idle:'Idle',Walk:'Walk',Primary_Attack:'Sword_Attack',Hit:'Hit',Death:'Death'} as const;
export const SAMPLE_HERO_CLASSES=['knight','mage'] as const;
