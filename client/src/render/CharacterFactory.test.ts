import {it,expect,vi} from 'vitest';import * as T from 'three';
import {CharacterFactory} from './CharacterFactory.js';
import {makeModularHeroFixture} from './fixtures/modularHero.js';
it('legacy characters release instance skeletons and cancel callbacks without disposing shared meshes',()=>{
 const factory=new CharacterFactory(),source=makeModularHeroFixture();
 (factory as unknown as {loaded:Map<string,unknown>}).loaded.set('LegacyFixture',source);
 const a=factory.create('LegacyFixture'),b=factory.create('LegacyFixture');const am=a.root.getObjectByName('face_angular') as T.SkinnedMesh,bm=b.root.getObjectByName('face_angular') as T.SkinnedMesh;
 const skeleton=vi.spyOn(am.skeleton,'dispose'),geometry=vi.spyOn(am.geometry,'dispose'),material=vi.spyOn(am.material as T.Material,'dispose'),done=vi.fn();a.playOnce('Death',done);a.dispose?.();a.dispose?.();a.mixer.update(5);expect(done).not.toHaveBeenCalled();expect(skeleton).toHaveBeenCalledOnce();expect(geometry).not.toHaveBeenCalled();expect(material).not.toHaveBeenCalled();expect(bm.skeleton).not.toBe(am.skeleton);b.dispose?.();
});
