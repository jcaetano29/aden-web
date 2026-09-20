import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {ITEM_TEMPLATES} from '@aden/shared';
import {createItemModel,disposeItemModels,itemIconUrl} from './ItemModels.js';
describe('catalog models',()=>{
  it('builds every item with shared geometry and no lights',()=>{
    for(const id of Object.keys(ITEM_TEMPLATES)) {
      const a=createItemModel(id),b=createItemModel(id);
      expect(a.children.length,id).toBeGreaterThan(0);
      expect((a.children[0] as THREE.Mesh).geometry).toBe((b.children[0] as THREE.Mesh).geometry);
      expect(new THREE.Box3().setFromObject(a).isEmpty(),id).toBe(false);
      a.traverse(o=>expect(o instanceof THREE.Light).toBe(false));
      expect(itemIconUrl(id)).toContain('data:image/svg+xml');
    }
    disposeItemModels();
  });
});
