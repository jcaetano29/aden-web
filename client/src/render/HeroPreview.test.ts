// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import * as T from 'three';
import {defaultAppearance} from '@aden/shared';
import {ModularHeroFactory} from './ModularHeroFactory.js';
import {loadHeroFixture} from './fixtures/modularHero.js';
vi.mock('three',async importOriginal=>{const original=await importOriginal<typeof import('three')>();return {...original,WebGLRenderer:class {domElement=document.createElement('canvas');setPixelRatio(){}setSize(){}render(){}dispose(){}}};});
import {HeroPreview} from './HeroPreview.js';
it('reuses the preview renderer and releases instances without disposing repository geometry',async()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:true}));let frame!:(now:number)=>void;vi.stubGlobal('requestAnimationFrame',(cb:(now:number)=>void)=>{frame=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const f=new ModularHeroFactory(loadHeroFixture);await f.preload();const createHero=vi.fn((cls,a)=>f.create(cls,a));const host=document.createElement('div');document.body.append(host);const preview=new HeroPreview(host,{createHero} as any);
 preview.show('knight',defaultAppearance('knight','male'));const first=createHero.mock.results[0].value,geometry=(first.root.getObjectByName('face_angular') as T.Mesh).geometry;const disposed=vi.spyOn(geometry,'dispose');
 const update=vi.spyOn(first.mixer,'update');preview.setVisible(true);frame(performance.now()+20);expect(update).not.toHaveBeenCalled();
 preview.show('mage',defaultAppearance('mage','female'));expect(first.root.parent).toBeNull();expect(host.querySelectorAll('canvas')).toHaveLength(1);preview.focus('face');preview.zoom(-100000);expect((preview as any).camera.position.z).toBeGreaterThanOrEqual(.65);preview.zoom(100000);expect((preview as any).camera.position.z).toBeLessThanOrEqual(10);
 preview.dispose();expect(disposed).not.toHaveBeenCalled();expect(host.querySelector('canvas')).toBeNull();f.dispose();expect(disposed).toHaveBeenCalledOnce();host.remove();vi.unstubAllGlobals();
});
