import {describe,it,expect} from 'vitest';
import {defaultAppearance,validateAppearance,appearanceFromSave,rebaseAppearance,randomAppearance,appearanceKey} from './appearance.js';
describe('versioned appearance',()=>{
 it('validates without sharing the caller object or unknown fields',()=>{const a=defaultAppearance('knight','male');expect(validateAppearance({...a,extra:true})).toEqual(a);expect(validateAppearance(a)).not.toBe(a);});
 it('separates strict creation and deterministic old save repair',()=>{const a=defaultAppearance('mage','female');expect(()=>validateAppearance({...a,faceId:'../external.glb'})).toThrow();expect(appearanceFromSave(undefined,'mage','female')).toEqual(a);expect(appearanceFromSave({...a,faceId:'retired'},'mage','female').faceId).toBe(a.faceId);expect(()=>appearanceFromSave({...a,version:2},'mage','female')).toThrow();});
 it.each([null,[],{},1,{version:'1'},{version:1,gender:'other'}])('rejects invalid objects %s',v=>expect(()=>validateAppearance(v)).toThrow());
 it('rejects unavailable beards and incompatible hairstyles',()=>{const a=defaultAppearance('knight','female');expect(()=>validateAppearance({...a,facialHairId:'beard'})).toThrow();expect(()=>validateAppearance({...a,hairStyleId:'parted'})).toThrow();});
 it('changes body while preserving compatible colors',()=>{const a={...defaultAppearance('knight','male'),hairColorId:'copper'};const b=rebaseAppearance(a,'female');expect(b.hairColorId).toBe('copper');expect(b.hairStyleId).toBe('long');expect(validateAppearance(b)).toEqual(b);});
 it('produces valid combinations and stable keys',()=>{for(let i=0;i<200;i++){const a=randomAppearance(i%2?'male':'female',()=>((i*17)%199)/199);expect(validateAppearance(a)).toEqual(a);expect(appearanceKey(Object.fromEntries(Object.entries(a).reverse()) as typeof a)).toBe(appearanceKey(a));}expect(()=>randomAppearance('male',()=>1)).toThrow();});
});
