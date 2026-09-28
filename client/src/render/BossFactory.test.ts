import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ModularHeroFactory} from './ModularHeroFactory.js';
import {loadHeroFixture} from './fixtures/modularHero.js';
import {createBossCharacter} from './BossFactory.js';

it('animates dragon limbs without moving the server root and resets after death',()=>{
  const heroFactory=new ModularHeroFactory(loadHeroFixture);
  const boss=createBossCharacter('vharzul',heroFactory)!;
  boss.root.position.set(1500,0,396);
  const wing=boss.root.getObjectByName('dragon_wing_left')!;
  boss.play('Walk',true);boss.mixer.update(.2);
  expect(Math.abs(wing.rotation.z)).toBeGreaterThan(.01);
  expect(boss.root.position.toArray()).toEqual([1500,0,396]);
  let completed=false;boss.playOnce('Death',()=>{completed=true;});boss.mixer.update(3);
  expect(completed).toBe(true);
  boss.play('Idle',true);boss.mixer.update(0);
  expect(boss.root.getObjectByName('dragon_body')!.rotation.z).toBeCloseTo(0);
  boss.dispose?.();heroFactory.dispose();
});

it('gives humanoid bosses independent materials and releases their ornaments',async()=>{
  const heroes=new ModularHeroFactory(loadHeroFixture);await heroes.preload();
  const a=createBossCharacter('skeleton_king',heroes)!,b=createBossCharacter('skeleton_king',heroes)!;
  const crown=a.root.getObjectByName('boss_crown') as THREE.Mesh;
  expect(crown).toBeDefined();expect(crown.parent?.name).toBe('Head');
  let released=false;crown.geometry.addEventListener('dispose',()=>{released=true;});
  a.dispose?.();expect(released).toBe(true);
  expect(b.root.getObjectByName('boss_crown')).toBeDefined();
  b.play('Idle',true);b.dispose?.();heroes.dispose();
});
