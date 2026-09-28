import type {MeshStandardMaterial} from 'three';
/** Marks are blended over the selected skin tint in model space, so UV seams remain intact. */
export function applyFaceMarking(material:MeshStandardMaterial,mark:string,gender:string){
 if(mark==='none')return;
 material.onBeforeCompile=shader=>{
  shader.uniforms.markKind={value:{scar:1,paint:2,freckles:3}[mark]??0};
  shader.uniforms.faceOffset={value:gender==='female'?-.045:0};
  shader.vertexShader='varying vec3 markPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n markPosition = position;');
  shader.fragmentShader='varying vec3 markPosition; uniform float markKind; uniform float faceOffset;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=markPosition-vec3(0.0,faceOffset,0.0); float mask=0.0; vec3 ink=vec3(.19,.30,.36);
   float front=smoothstep(.055,.085,p.z);
   if(markKind<1.5){mask=(1.0-smoothstep(.001,.003,abs(p.x-.046-(p.y-1.68)*.2)))*step(1.63,p.y)*step(p.y,1.72);ink=vec3(.66,.32,.28);}
   else if(markKind<2.5){mask=(1.0-smoothstep(.009,.014,abs(p.y-1.67)))*step(.026,abs(p.x))*step(abs(p.x),.083);}
   else {vec2 q=p.xy*850.0;float h=fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453);mask=step(.82,h)*(1.0-smoothstep(.15,.3,length(fract(q)-.5)))*step(1.635,p.y)*step(p.y,1.67)*step(.02,abs(p.x));ink=vec3(.28,.12,.065);}
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.45+ink*.55,mask*front*.8);
  `);
 };
 material.customProgramCacheKey=()=>`hero-mark-${mark}-${gender}`;
}
