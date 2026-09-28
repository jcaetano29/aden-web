// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import * as T from 'three';
import {mountHeroRedesignPreview,sampleMetrics,heroCameraPreset} from './HeroRedesignPreview.js';
vi.mock('three',async()=>{const real=await vi.importActual<typeof import('three')>('three');return {...real,PMREMGenerator:class{fromScene(){return {texture:new real.Texture(),dispose(){}};}dispose(){}},WebGLRenderer:class{domElement=document.createElement('canvas');shadowMap={};info={render:{triangles:12,calls:2},memory:{geometries:1,textures:1},reset(){}};setSize(){}setPixelRatio(){}setScissorTest(){}setViewport(){}setScissor(){}render(){}dispose(){}getContext(){return {getExtension(){return null},getParameter(){return 'test'}};}}};});
vi.mock('three/examples/jsm/controls/OrbitControls.js',()=>({OrbitControls:class{target=new T.Vector3();update(){}dispose(){} }}));
it('changes appearance and disposes prior characters without recreating the renderer',()=>{
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 const made:any[]=[];const create=()=>{const h={root:new T.Group(),mixer:{update:vi.fn()},clipNames:['Idle','Walk','Primary_Attack','Hit','Death'],play:vi.fn(),playOnce:vi.fn(),dispose:vi.fn(),equipment:{update:vi.fn(),dispose:vi.fn()}};made.push(h);return h;};
 const factory={create:vi.fn(create),createHero:vi.fn(create)};const parent=document.createElement('div');document.body.append(parent);const view=mountHeroRedesignPreview(parent,factory as any);
 const canvas=parent.querySelector('canvas');const select=parent.querySelector<HTMLSelectElement>('[aria-label="Cuerpo"]')!;select.value='female';select.dispatchEvent(new Event('change'));expect(factory.createHero).toHaveBeenLastCalledWith('knight',expect.objectContaining({gender:'female'}));expect(made[1].dispose).toHaveBeenCalledOnce();expect(parent.querySelector('canvas')).toBe(canvas);
 (Array.from(parent.querySelectorAll('button')).find(b=>b.textContent==='Atacar')!).click();expect(made.at(-1).playOnce).toHaveBeenCalledWith('Primary_Attack',expect.any(Function));view.dispose();expect(made.at(-1).dispose).toHaveBeenCalledOnce();expect(parent.children.length).toBe(0);vi.unstubAllGlobals();
});
it('reports actual renderer counters',()=>expect(sampleMetrics({info:{render:{triangles:42,calls:4},memory:{geometries:3,textures:2}}} as any)).toEqual({triangles:42,drawCalls:4,geometries:3,textures:2}));

it('keeps a full hero visible through fog at the real game camera distance',()=>{const preset=heroCameraPreset('game',1);expect(preset.position).toEqual([0,30,30]);expect(preset.fov).toBe(60);const depth=Math.hypot(30,30);expect(preset.fogFar).toBeGreaterThan(depth+2.5);expect(preset.fogNear).toBeGreaterThan(depth);});
