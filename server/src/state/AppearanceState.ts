import {Schema,type} from '@colyseus/schema';
import {APPEARANCE_FIELDS,validateAppearance,type CharacterAppearanceV1,type CharacterGender} from '@aden/shared';
/** The nested schema preserves PlayerState's field budget and replicates cosmetics atomically. */
export class AppearanceState extends Schema {
 @type('uint8') version=1;
 @type('string') gender:CharacterGender='male';
 @type('string') faceId='angular';
 @type('string') skinToneId='peach';
 @type('string') hairStyleId='parted';
 @type('string') hairColorId='brown';
 @type('string') eyeColorId='hazel';
 @type('string') facialHairId='none';
 @type('string') markingId='none';
 apply(input:CharacterAppearanceV1){const value=validateAppearance(input);this.version=value.version;this.gender=value.gender;for(const field of APPEARANCE_FIELDS)this[field]=value[field];}
 toAppearance():CharacterAppearanceV1{return validateAppearance(this);}
}
