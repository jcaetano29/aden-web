import * as THREE from 'three';
import { getItem, itemVisual } from '@aden/shared';
import { heroMaterial } from './HeroMaterials.js';

const PARTS: Record<string, RegExp> = {
  armor: /^hero_(cuirass|pauldron|sleeve|mantle)/,
  pants: /^hero_(trouser|knee)/,
  boots: /^hero_(boot|greave|sole)/,
  gloves: /^hero_(glove|thumb|bracer|cuff)/,
};

export function heroEquipmentSlot(name: string): string | undefined {
  return Object.keys(PARTS).find(slot => PARTS[slot].test(name));
}

/** Equipment finishes the fitted hero mesh instead of covering its silhouette
 * with the generic inventory-display geometry. Per-player materials are owned
 * here; shared atlas textures and factory prototype materials are never freed. */
export class HeroEquipment {
  private readonly originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly materials: THREE.Material[] = [];
  constructor(private readonly root: THREE.Object3D) {}

  apply(slot: string, id: string): boolean {
    const pattern = PARTS[slot];
    if (!this.root.userData.heroClass || !pattern) return false;
    const meshes: THREE.Mesh[] = [];
    this.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const names: string[] = [object.name, ...(object.userData.parts ?? [])];
      if (names.some(name => pattern.test(name))) meshes.push(object);
    });
    if (!meshes.length) return false;
    const visual = itemVisual(getItem(id));
    const kind = visual.surface === 'cloth' ? 'cloth' : visual.surface === 'leather' ? 'leather' : 'metal';
    const finishes = new Map<THREE.Side, THREE.Material>();
    for (const mesh of meshes) {
      const side = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).side;
      let material = finishes.get(side);
      if (!material) {
        const finish = heroMaterial(kind, visual.tint);
        finish.side = side; finish.emissive.set(visual.color); finish.emissiveIntensity = visual.glow * .25;
        material = finish; finishes.set(side, material); this.materials.push(material);
      }
      if (!this.originals.has(mesh)) this.originals.set(mesh, mesh.material);
      mesh.material = material;
    }
    return true;
  }

  clear(): void {
    for (const [mesh, material] of this.originals) mesh.material = material;
    this.originals.clear();
    this.materials.forEach(material => material.dispose()); this.materials.length = 0;
  }
}
