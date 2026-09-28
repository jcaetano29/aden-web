/** Appearance is cosmetic: class stats and skills are independent of gender. */
export type CharacterGender = 'male' | 'female';

export function isCharacterGender(value: unknown): value is CharacterGender {
  return value === 'male' || value === 'female';
}

/** Saves written before appearance selection retain their original male model. */
export function characterGender(value: unknown): CharacterGender {
  return value === 'female' ? 'female' : 'male';
}

const FEMALE_NAMES: Record<string, string> = {
  knight: 'Caballera', mage: 'Maga', barbarian: 'Bárbara', rogue: 'Pícara', ranger: 'Exploradora',
};

export function feminineClassName(classId: string, fallback: string): string {
  return FEMALE_NAMES[classId] ?? fallback;
}

export interface CharacterAppearanceV1 {
  version: 1;
  gender: CharacterGender;
  faceId: string;
  skinToneId: string;
  hairStyleId: string;
  hairColorId: string;
  eyeColorId: string;
  facialHairId: string;
  markingId: string;
}
export interface AppearanceOption { readonly id: string; readonly label: string; readonly genders: readonly CharacterGender[]; readonly hex?: string }
const both: readonly CharacterGender[] = ['male','female'];
const option=(id:string,label:string,genders=both,hex?:string):AppearanceOption=>({id,label,genders,hex});
const palette=(values:readonly (readonly [string,string,string])[])=>values.map(([id,label,hex])=>option(id,label,both,hex));
/** Only cosmetic options backed by a prepared mesh or material are exposed. */
export const APPEARANCE_CATALOG = {
  faceId:[option('soft','Suave'),option('angular','Anguloso')],
  skinToneId:palette([['ivory','Marfil','#f1d0b7'],['peach','Melocotón','#dfa98a'],['sand','Arena','#c9956c'],['olive','Oliva','#b99570'],['bronze','Bronce','#9e6946'],['umber','Tierra','#805134'],['sienna','Siena','#68422f'],['ebony','Ébano','#482f27']]),
  hairStyleId:[option('none','Sin cabello'),option('parted','Raya lateral',['male']),option('buzzed','Corto',['male']),option('long','Largo',['female']),option('buns','Recogido',['female'])],
  hairColorId:palette([['raven','Negro','#241c1c'],['brown','Castaño','#52382b'],['chestnut','Avellana','#865638'],['copper','Cobrizo','#ac6037'],['gold','Dorado','#cfa86b'],['silver','Plata','#c4cbd1'],['white','Blanco','#e9e5dc'],['ash','Ceniza','#766e63']]),
  eyeColorId:palette([['hazel','Avellana','#a3804f'],['blue','Azul','#598fb9'],['green','Verde','#6c9666'],['gray','Gris','#98a9b4'],['brown','Marrón','#815236'],['amber','Ámbar','#cda15c']]),
  facialHairId:[option('none','Sin barba')],
  markingId:[option('none','Sin marcas')],
} satisfies Record<string,readonly AppearanceOption[]>;
export type AppearanceField=keyof typeof APPEARANCE_CATALOG;
export const APPEARANCE_FIELDS=Object.keys(APPEARANCE_CATALOG) as AppearanceField[];
export function appearanceOptions(field:AppearanceField,gender:CharacterGender):readonly AppearanceOption[]{return APPEARANCE_CATALOG[field].filter(o=>o.genders.includes(gender));}
export function defaultAppearance(className:string,gender:CharacterGender):CharacterAppearanceV1 {
  return {version:1,gender,faceId:className==='mage'?'soft':'angular',skinToneId:'peach',hairStyleId:gender==='female'?'long':'parted',hairColorId:className==='mage'?'silver':'brown',eyeColorId:'hazel',facialHairId:'none',markingId:'none'};
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const validOption=(field:AppearanceField,value:unknown,gender:CharacterGender)=>typeof value==='string'&&appearanceOptions(field,gender).some(o=>o.id===value);
export function validateAppearance(value:unknown):CharacterAppearanceV1 {
  if(!record(value)||value.version!==1||!isCharacterGender(value.gender))throw new Error('Apariencia incompatible o inválida');
  const result:CharacterAppearanceV1={version:1,gender:value.gender} as CharacterAppearanceV1;
  for(const field of APPEARANCE_FIELDS){if(!validOption(field,value[field],value.gender))throw new Error(`Opción de apariencia inválida: ${field}`);result[field]=value[field] as string;}
  return result;
}
export function appearanceFromSave(value:unknown,className:string,legacyGender:unknown):CharacterAppearanceV1 {
  if(record(value)&&value.version!==undefined&&value.version!==1)throw new Error('Versión de apariencia no compatible');
  const gender=record(value)&&isCharacterGender(value.gender)?value.gender:characterGender(legacyGender);
  const result=defaultAppearance(className,gender);
  if(record(value))for(const field of APPEARANCE_FIELDS)if(validOption(field,value[field],gender))result[field]=value[field] as string;
  return result;
}
export function rebaseAppearance(value:CharacterAppearanceV1,gender:CharacterGender):CharacterAppearanceV1 {return appearanceFromSave({...validateAppearance(value),gender},'knight',gender);}
export function randomAppearance(gender:CharacterGender,random:()=>number=Math.random):CharacterAppearanceV1 {
  const result=defaultAppearance('knight',gender);
  for(const field of APPEARANCE_FIELDS){const choices=appearanceOptions(field,gender),r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new Error('RNG debe devolver un valor entre 0 y 1 (exclusivo)');result[field]=choices[Math.floor(r*choices.length)].id;}
  return result;
}
export function appearanceKey(value:CharacterAppearanceV1):string {const v=validateAppearance(value);return [v.version,v.gender,...APPEARANCE_FIELDS.map(f=>v[f])].join(':');}
