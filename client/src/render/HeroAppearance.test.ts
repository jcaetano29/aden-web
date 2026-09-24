import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildHeroAppearance } from './HeroAppearance.js';
import { EquipmentViews } from './EquipmentViews.js';

function hero() {
  const root = new THREE.Group(); root.userData.visualHeight = 2.5;
  const add = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const bone = new THREE.Bone(); bone.name = name; bone.position.set(x, y, z);
    root.add(bone); root.updateMatrixWorld(true); parent.attach(bone); return bone;
  };
  const hips = add('Hips', root, 0, 1.2);
  const abdomen = add('Abdomen', hips, 0, 1.4);
  const torso = add('Torso', abdomen, 0, 1.7);
  const neck = add('Neck', torso, 0, 2.08);
  add('Head', neck, 0, 2.2);
  for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
    const arm = add(`UpperArm.${side}`, torso, sign * .36, 1.97);
    const forearm = add(`LowerArm.${side}`, arm, sign * .43, 1.64);
    const fist = add(`Fist.${side}`, forearm, sign * .46, 1.3);
    if (side === 'R') add('WeaponR', fist, -.46, 1.3);
    const leg = add(`UpperLeg.${side}`, hips, sign * .17, 1.2);
    const shin = add(`LowerLeg.${side}`, leg, sign * .17, .64);
    add(`Foot.${side}`, shin, sign * .17, .12);
  }
  return root;
}

describe('continuous hero body', () => {
  it('does not recolor boots when changing trousers after detail batching', () => {
    const root = hero(); buildHeroAppearance(root, 'Knight', 'female');
    let greave!: THREE.Mesh;
    root.traverse(object => {
      if (object instanceof THREE.Mesh && [object.name, ...(object.userData.parts ?? [])].includes('hero_greave_L')) greave = object;
    });
    const original = greave.material;
    new EquipmentViews(root).update({ pants: 'aden_grebas_de_la_senda_del_alba' });
    expect(greave.material).toBe(original);
  });
  it('bends the chest with the torso while keeping the pelvis attached to the hips', () => {
    const root = hero(); buildHeroAppearance(root, 'Knight', 'female');
    const body = root.getObjectByName('hero_cuirass') as THREE.SkinnedMesh;
    expect(body.isSkinnedMesh).toBe(true);
    const position = body.geometry.getAttribute('position');
    const low = 0, high = position.count - 1;
    root.updateMatrixWorld(true); body.skeleton.update();
    const beforeLow = body.applyBoneTransform(low, new THREE.Vector3().fromBufferAttribute(position, low));
    const beforeHigh = body.applyBoneTransform(high, new THREE.Vector3().fromBufferAttribute(position, high));
    root.getObjectByName('Torso')!.rotation.x = .35;
    root.updateMatrixWorld(true); body.skeleton.update();
    const afterLow = body.applyBoneTransform(low, new THREE.Vector3().fromBufferAttribute(position, low));
    const afterHigh = body.applyBoneTransform(high, new THREE.Vector3().fromBufferAttribute(position, high));
    expect(afterLow.distanceTo(beforeLow)).toBeLessThan(.00001);
    expect(afterHigh.distanceTo(beforeHigh)).toBeGreaterThan(.08);
    expect(Array.from(body.geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
  });

  it('clones the fitted body onto each player skeleton without deforming other players', () => {
    const original = hero(); buildHeroAppearance(original, 'Ranger', 'female');
    const copy = clone(original);
    const body = copy.getObjectByName('hero_cuirass') as THREE.SkinnedMesh;
    expect(body.isSkinnedMesh).toBe(true);
    for (const bone of body.skeleton.bones) expect(bone).toBe(copy.getObjectByName(bone.name));
    copy.getObjectByName('Torso')!.rotation.z = .4;
    expect(original.getObjectByName('Torso')!.rotation.z).toBeCloseTo(0);
  });
});
