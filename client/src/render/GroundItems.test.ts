// @vitest-environment jsdom
import {it,expect} from 'vitest';
import * as THREE from 'three';
import {GroundItems} from './GroundItems.js';

it('filters maps for visibility and selection; removes meshes and label on cleanup',()=>{
  const scene=new THREE.Scene(),drops=new GroundItems(scene);
  drops.add('a','iron_sword',0,0,'bosque');drops.add('b','health_potion',0,0,'cripta',3);
  drops.setMap('bosque');expect(drops.raycastTargets().objects).toHaveLength(1);
  expect(scene.children.filter(o=>o.visible)).toHaveLength(2);
  drops.select('a');const camera=new THREE.PerspectiveCamera();camera.position.set(0,3,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();drops.update(.1,camera);
  expect(document.body.textContent).toContain('Espada de Hierro');expect(document.body.textContent).toContain('Botín público');
  drops.setMap('cripta');expect(drops.raycastTargets().objects).toHaveLength(1);
  drops.remove('b');expect(drops.raycastTargets().objects).toHaveLength(0);
  drops.dispose();expect(scene.children).toHaveLength(0);expect(document.body.textContent).toBe('');
});
