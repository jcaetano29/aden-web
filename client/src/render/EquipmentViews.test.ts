import {it,expect} from 'vitest';
import * as THREE from 'three';
import {EquipmentViews} from './EquipmentViews.js';
it('fits equipped armor to the existing hero silhouette and restores it on unequip',()=>{
  const root=new THREE.Group();root.userData.heroClass='Knight';
  const torso=new THREE.Bone();torso.name='Torso';root.add(torso);
  const original=new THREE.MeshStandardMaterial({color:0x112233});
  const body=new THREE.Mesh(new THREE.SphereGeometry(),original);body.name='hero_cuirass';root.add(body);
  const otherPlayer=body.clone();
  const equipment=new EquipmentViews(root);
  equipment.update({armor:'iron_mail'});
  expect(body.material).not.toBe(original);
  expect(otherPlayer.material).toBe(original);
  expect(root.getObjectByName('equipped_armor')).toBeUndefined();
  equipment.update({});expect(body.material).toBe(original);
});
it('keeps both sides of fitted cloth visible after changing armor',()=>{
  const root=new THREE.Group();root.userData.heroClass='Mage';
  const mantle=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));
  mantle.name='hero_mantle';root.add(mantle);
  new EquipmentViews(root).update({armor:'iron_mail'});
  expect(mantle.material.side).toBe(THREE.DoubleSide);
});
it('replaces equipment without accumulating meshes and restores original weapons',()=>{
  const root=new THREE.Group(),hand=new THREE.Bone(),original=new THREE.Mesh();hand.name='WeaponR';original.name='Warrior_Sword';hand.add(original);root.add(hand);
  const equipment=new EquipmentViews(root);
  equipment.update({weapon:'iron_sword'});expect(original.visible).toBe(false);
  equipment.update({weapon:'ember_axe'});expect(hand.children.filter(o=>o.userData.equipped)).toHaveLength(1);
  equipment.update({});expect(original.visible).toBe(true);expect(hand.children.filter(o=>o.userData.equipped)).toHaveLength(0);
});
it('uses reference attachment transforms even when equipping during animation',()=>{
  const root=new THREE.Group(),hand=new THREE.Bone();hand.name='WeaponR';root.add(hand);
  const equipment=new EquipmentViews(root);equipment.update({weapon:'iron_sword'});
  const initial=hand.children.find(o=>o.userData.equipped)!.clone();
  equipment.update({});hand.rotation.z=Math.PI/2;
  equipment.update({weapon:'iron_sword'});hand.rotation.z=0;root.updateMatrixWorld(true);
  const actual=hand.children.find(o=>o.userData.equipped)!;
  expect(actual.quaternion.angleTo(initial.quaternion)).toBeCloseTo(0);
  expect(actual.position.distanceTo(initial.position)).toBeCloseTo(0);
});
it('hides and restores the complete ranger bow including its string',()=>{
  const root=new THREE.Group(),hand=new THREE.Bone(),bow=new THREE.Group();hand.name='WeaponR';bow.name='ranger_bow';bow.add(new THREE.Mesh(),new THREE.Line());root.add(hand,bow);
  const equipment=new EquipmentViews(root);equipment.update({weapon:'iron_sword'});expect(bow.visible).toBe(false);
  equipment.update({});expect(bow.visible).toBe(true);
});
