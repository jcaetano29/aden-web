import {it,expect} from 'vitest';
import {appearanceOptions,defaultAppearance,validateAppearance} from './appearance.js';
it.each(['male','female'] as const)('completes the cosmetic catalog for %s',gender=>{
 expect(appearanceOptions('faceId',gender)).toHaveLength(4);
 expect(appearanceOptions('hairStyleId',gender)).toHaveLength(6);
 expect(appearanceOptions('markingId',gender)).toHaveLength(4);
 expect(appearanceOptions('facialHairId',gender)).toHaveLength(gender==='male'?4:1);
 for(const field of ['faceId','hairStyleId','facialHairId','markingId'] as const)for(const option of appearanceOptions(field,gender))expect(validateAppearance({...defaultAppearance('knight',gender),[field]:option.id})[field]).toBe(option.id);
});
