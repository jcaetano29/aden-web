import {appearanceOptions,APPEARANCE_FIELDS,defaultAppearance,rebaseAppearance,randomAppearance,validateAppearance,type AppearanceField,type CharacterAppearanceV1,type CharacterGender} from '@aden/shared';
import './CharacterCustomizer.css';
const labels:Record<AppearanceField,string>={faceId:'Rostro',skinToneId:'Piel',hairStyleId:'Peinado',hairColorId:'Cabello',eyeColorId:'Ojos',facialHairId:'Barba',markingId:'Marcas'};
export class CharacterCustomizer {
 private readonly root=document.createElement('section');private current:CharacterAppearanceV1;private className='knight';
 constructor(parent:HTMLElement,initial:CharacterAppearanceV1,private readonly onChange:(a:CharacterAppearanceV1)=>void){this.current=validateAppearance(initial);this.root.className='character-customizer';this.root.setAttribute('aria-label','Rasgos del personaje');parent.append(this.root);this.render();}
 get value(){return {...this.current};}
 setClass(className:string){this.className=className;}
 setGender(gender:CharacterGender){this.current=rebaseAppearance(this.current,gender);this.render();this.emit();}
 reset(){this.current=defaultAppearance(this.className,this.current.gender);this.render();this.emit();}
 private emit(){this.onChange(this.value);}
 private choose(field:AppearanceField,id:string){this.current=validateAppearance({...this.current,[field]:id});this.render();this.emit();}
 private render(){
  const focused=this.root.contains(document.activeElement)?(document.activeElement as HTMLElement).getAttribute('aria-label'):null;
  this.root.replaceChildren();const fields=document.createElement('div');fields.className='cosmetic-fields';
  for(const field of APPEARANCE_FIELDS){const options=appearanceOptions(field,this.current.gender);if(field==='facialHairId'&&options.length===1)continue;
   if(options[0]?.hex){const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`${labels[field]} · ${options.find(o=>o.id===this.current[field])!.label}`;group.append(legend);for(const option of options){const button=document.createElement('button');button.type='button';button.className='cosmetic-swatch';button.style.setProperty('--color',option.hex!);button.setAttribute('aria-label',`${labels[field]} ${option.label}`);button.setAttribute('aria-pressed',String(option.id===this.current[field]));button.title=option.label;button.addEventListener('click',()=>this.choose(field,option.id));group.append(button);}this.root.append(group);}
   else {const label=document.createElement('label');label.textContent=labels[field];const select=document.createElement('select');select.setAttribute('aria-label',labels[field]);for(const option of options){const el=document.createElement('option');el.value=option.id;el.textContent=option.label;select.append(el);}select.value=this.current[field];select.addEventListener('change',()=>this.choose(field,select.value));label.append(select);fields.append(label);}
  }
  this.root.prepend(fields);const actions=document.createElement('div');actions.className='cosmetic-actions';for(const [action,text] of [['random','Aleatorio'],['reset','Restablecer']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.textContent=text;b.setAttribute('aria-label',text);b.addEventListener('click',()=>{if(action==='reset')this.reset();else {this.current=randomAppearance(this.current.gender);this.render();this.emit();}});actions.append(b);}this.root.append(actions);
  if(focused)Array.from(this.root.querySelectorAll<HTMLElement>('[aria-label]')).find(el=>el.getAttribute('aria-label')===focused)?.focus();
 }
 dispose(){this.root.remove();}
}
