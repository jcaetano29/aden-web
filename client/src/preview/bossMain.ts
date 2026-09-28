import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {MOB_TEMPLATES,scaleForTemplate,tintForTemplate,getZone,defaultAppearance} from '@aden/shared';
import {CharacterFactory,type Character} from '../render/CharacterFactory.js';
import {Environment} from '../render/Environment.js';
import {preloadMaterialAtlas} from '../render/materialAtlas.js';
import {selectClip,type ClipKind} from '../render/animation.js';
import './bossPreview.css';

const app=document.querySelector<HTMLElement>('#app')!;
const bosses=Object.values(MOB_TEMPLATES).filter(m=>m.boss);
const factory=new CharacterFactory();
async function start() {
  await Promise.all([preloadMaterialAtlas(),factory.preloadHeroes(),factory.preload([...new Set(bosses.map(m=>m.model))])]);
  app.innerHTML=`<header><a href="/">Aden</a><span>Bestiario de jefes</span></header>
  <main><section class="boss-stage" aria-label="Comparación 3D"><div class="boss-title"><p>Los señores de la oscuridad</p><h1></h1></div><div class="boss-canvas"></div><div class="boss-labels"><span>Anterior</span><span>Renovado</span></div><p class="boss-hint">Arrastrá para girar · Rueda para acercar</p></section>
  <aside><h2>Un encuentro memorable</h2><p>Compará la silueta, los materiales y el movimiento de cada jefe.</p><label>Jefe<select aria-label="Jefe"></select></label>
  <fieldset><legend>Animación</legend><div class="boss-actions"></div></fieldset>
  <label><input type="checkbox" id="compare" checked> Comparar con anterior</label>
  <label><input type="checkbox" id="pause"> Pausar animación</label>
  <div class="boss-views"><button data-view="portrait">Ver de cerca</button><button data-view="game">Cámara de juego</button></div>
  <label>Escenario<select aria-label="Escenario"><option value="studio">Sala del bestiario</option><option value="bosque">Bosque de Umbra</option><option value="fragua">Fragua de los Primeros</option><option value="minas">Minas de Hierro Negro</option><option value="monasterio">Monasterio de la Vigilia</option></select></label>
  <button id="outskirts">Ver sector exterior</button><p class="boss-note">Mapas de caza de 256 × 256. Las invasiones anuncian el mapa; al jefe lo encontrás explorando.</p><output aria-label="Estado"></output></aside></main>`;
  const host=app.querySelector<HTMLElement>('.boss-canvas')!;
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
  const stage=()=>{const scene=new THREE.Scene();scene.background=new THREE.Color(0x101720);scene.add(new THREE.HemisphereLight(0xc4d8f4,0x4c3e38,2));const sun=new THREE.DirectionalLight(0xffe0b5,3.4);sun.position.set(5,9,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);const rim=new THREE.DirectionalLight(0x789bcb,2.4);rim.position.set(-5,5,-5);scene.add(rim);const floor=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),new THREE.MeshStandardMaterial({color:0x1c2530,roughness:.82,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);return scene;};
  const oldScene=stage(),scene=stage(),worldScene=new THREE.Scene();
  const world=new Environment(worldScene);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);oldScene.environment=scene.environment=env.texture;room.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(38,1,.05,500),controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.minDistance=1;controls.maxDistance=130;controls.maxPolarAngle=Math.PI*.54;
  const select=app.querySelector<HTMLSelectElement>('[aria-label="Jefe"]')!;
  bosses.forEach(b=>select.add(new Option(b.name,b.id)));
  const worldSelect=app.querySelector<HTMLSelectElement>('[aria-label="Escenario"]')!;
  let current:Character,previous:Character,player:Character,compare=true,paused=false,view='portrait',outside=false;
  const release=(c:Character|undefined)=>{c?.equipment?.dispose();c?.dispose?.();c?.root.removeFromParent();};
  const inWorld=()=>worldSelect.value!=='studio';
  const location=()=>inWorld()?getZone(worldSelect.value).center:{x:0,z:0};
  function frameCamera(){
    const p=location(),split=compare&&!inWorld();
    const h=Math.max(current.root.userData.visualHeight,split?previous.root.userData.visualHeight:0)*scaleForTemplate(select.value);
    const size=new THREE.Box3().setFromObject(current.root,true).getSize(new THREE.Vector3());
    if(split)size.max(new THREE.Box3().setFromObject(previous.root,true).getSize(new THREE.Vector3()));
    const aspect=(split?host.clientWidth/2:host.clientWidth)/Math.max(1,host.clientHeight);
    const distance=Math.max(h*2.5,Math.max(size.x,size.z)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*aspect))*1.12;
    const x=p.x+(outside?86:0),z=p.z+(outside?82:0);
    if(view==='game')camera.position.set(x+17,23,z+23);
    else camera.position.set(x+distance*.4,h*.7,z+distance*.9165);
    controls.target.set(x,view==='game'?1:h*.48,z);controls.update();
  }
  function rebuild(){
    release(current);release(previous);release(player);
    const def=MOB_TEMPLATES[select.value],p=location();
    current=factory.createMob(def.model,def.id);previous=factory.create(def.model);
    // Match the former in-game palette, with preview-owned material clones.
    const tint=tintForTemplate(def.id),oldMaterials:THREE.Material[]=[];
    if(tint!==undefined)previous.root.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const color=new THREE.Color(tint);
      const clone=(source:THREE.Material)=>{const mat=source.clone();if(mat instanceof THREE.MeshStandardMaterial||mat instanceof THREE.MeshBasicMaterial)mat.color.multiply(color);oldMaterials.push(mat);return mat;};
      o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
    });
    const disposePrevious=previous.dispose?.bind(previous);
    previous.dispose=()=>{oldMaterials.forEach(m=>m.dispose());oldMaterials.length=0;disposePrevious?.();};
    for(const c of [current,previous]){c.root.scale.setScalar(scaleForTemplate(def.id));c.play(selectClip(c.clipNames,'idle')!,true);}
    current.root.position.set(p.x,0,p.z);(inWorld()?worldScene:scene).add(current.root);oldScene.add(previous.root);
    player=factory.createHero('knight',defaultAppearance('knight','male'));player.root.position.set(p.x+4,0,p.z+2);(inWorld()?worldScene:scene).add(player.root);
    app.querySelector('h1')!.textContent=def.name;
    app.querySelector<HTMLElement>('.boss-labels')!.style.display=compare&&!inWorld()?'':'none';
    if(inWorld())world.updateMood(p.x,p.z,5);
    outside=false;frameCamera();
  }
  select.onchange=rebuild;worldSelect.onchange=rebuild;
  app.querySelector<HTMLInputElement>('#compare')!.onchange=e=>{compare=(e.target as HTMLInputElement).checked;app.querySelector<HTMLElement>('.boss-labels')!.style.display=compare&&!inWorld()?'':'none';frameCamera();};
  app.querySelector<HTMLInputElement>('#pause')!.onchange=e=>{paused=(e.target as HTMLInputElement).checked;};
  for(const [kind,label] of [['idle','Reposo'],['walk','Caminar'],['attack','Atacar'],['hit','Impacto'],['death','Caer']] as const){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{for(const c of [current,previous]){const clip=selectClip(c.clipNames,kind as ClipKind);if(!clip)continue;if(['death','attack','hit'].includes(kind))c.playOnce(clip,()=>{if(kind!=='death')c.play(selectClip(c.clipNames,'idle')!,true);});else c.play(clip,true);}};app.querySelector('.boss-actions')!.append(button);}
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view!;frameCamera();});
  app.querySelector<HTMLButtonElement>('#outskirts')!.onclick=()=>{if(!inWorld()){worldSelect.value='bosque';rebuild();}outside=!outside;view='game';frameCamera();};
  select.value='skeleton_king';rebuild();
  let last=performance.now(),raf=0,lastWidth=0,lastHeight=0;
  function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!paused){current.mixer.update(dt);previous.mixer.update(dt);player.mixer.update(dt);}
    const width=host.clientWidth,height=host.clientHeight;
    if(width!==lastWidth||height!==lastHeight){renderer.setSize(width,height,false);lastWidth=width;lastHeight=height;frameCamera();}
    const split=compare&&!inWorld();camera.aspect=(split?width/2:width)/height;camera.updateProjectionMatrix();controls.update();
    renderer.setScissorTest(true);renderer.setViewport(0,0,split?width/2:width,height);renderer.setScissor(0,0,split?width/2:width,height);renderer.render(split?oldScene:inWorld()?worldScene:scene,camera);
    if(split){renderer.setViewport(width/2,0,width/2,height);renderer.setScissor(width/2,0,width/2,height);renderer.render(scene,camera);}
    app.querySelector('output')!.textContent=`${MOB_TEMPLATES[select.value].name} · ${inWorld()?getZone(worldSelect.value).name:'Vista de comparación'}`;
    document.body.dataset.ready='true';raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);release(current);release(previous);release(player);controls.dispose();env.dispose();renderer.dispose();factory.disposeHeroes();},{once:true});
}
start().catch(error=>{app.textContent=`No se pudo cargar el bestiario: ${error.message}. Recargá para reintentar.`;console.error(error);});
