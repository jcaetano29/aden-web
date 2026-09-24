import { describe, it, expect } from 'vitest';
import { PlayerState } from '../state/PlayerState.js';
import { MobState } from '../state/MobState.js';
import { advanceDungeonKill, activateSeal, canFightDungeonMob, resetDungeon, stepGuardianHazard } from './AdventureSystem.js';

describe('Cripta: avance de expedición', () => {
  it('exige seis enemigos variados de cada ala y sellos en orden', () => {
    const p = new PlayerState(); p.mapId = 'cripta';
    expect(activateSeal(p, 'crypt_seal_2')).toBe(false);
    advanceDungeonKill(p, 'crypt_flameguard'); expect(p.dungeonKills).toBe(0);
    expect(canFightDungeonMob(p,'crypt_flameguard')).toBe(false);
    for (let i=0;i<3;i++) {advanceDungeonKill(p, 'crypt_acolyte');advanceDungeonKill(p,'crypt_stalker');}
    expect(p.dungeonStage).toBe(1);
    expect(canFightDungeonMob(p,'crypt_warden')).toBe(false);
    expect(activateSeal(p, 'crypt_seal_1')).toBe(true);
    expect(activateSeal(p, 'crypt_seal_1')).toBe(false);
    for (let i=0;i<3;i++) advanceDungeonKill(p, 'crypt_flameguard');
    for (let i=0;i<2;i++) advanceDungeonKill(p, 'crypt_emberbeast');
    expect(p.dungeonStage).toBe(2);
    advanceDungeonKill(p,'crypt_behemoth');
    expect(activateSeal(p, 'crypt_seal_2')).toBe(true);
    expect(canFightDungeonMob(p,'crypt_warden')).toBe(true);
    expect(advanceDungeonKill(p,'crypt_warden')).toBe(true);
    expect(advanceDungeonKill(p,'crypt_warden')).toBe(false);
    resetDungeon(p); expect(p.dungeonStage).toBe(0); expect(p.dungeonKills).toBe(0);
  });
  it('no da avance fuera de la mazmorra ni estando muerto', () => {
    const p=new PlayerState();
    advanceDungeonKill(p,'crypt_acolyte'); expect(p.dungeonKills).toBe(0);
    p.mapId='cripta'; p.dead=true;
    advanceDungeonKill(p,'crypt_acolyte'); expect(p.dungeonKills).toBe(0);
  });
});

describe('Golpe anunciado del guardián', () => {
  it('el Prior protege el ritual y alterna un canal interrumpible bajo media vida', () => {
    const mob=new MobState(); mob.templateId='memory_prior'; mob.mapId='monasterio'; mob.hp=1000; mob.maxHp=4200; mob.aggroTargetId='p';
    const p=new PlayerState(); p.mapId='monasterio'; p.questId='a2_anchor_2';
    const players=new Map([['p',p]]);
    expect(canFightDungeonMob(p,mob.templateId)).toBe(false);
    stepGuardianHazard(mob,players,50); expect(mob.hazardMs).toBe(0);
    p.questId='a2_prior'; stepGuardianHazard(mob,players,50);
    expect(mob.channeling).toBe(false); expect(mob.hazardMs).toBe(1800);
    p.x=7; expect(stepGuardianHazard(mob,players,1800)).toEqual([]);
    stepGuardianHazard(mob,players,6000);
    expect(mob.channeling).toBe(true); expect(mob.hazardMs).toBe(6000); expect(mob.hazardRadius).toBe(14);
    p.x=15; expect(stepGuardianHazard(mob,players,6000)).toEqual([]); expect(mob.channeling).toBe(false);
    stepGuardianHazard(mob,players,6000); expect(mob.channeling).toBe(false); expect(mob.hazardMs).toBe(1800);
  });
  it('Nihil fija el área y acelera sus ataques bajo media vida', () => {
    const mob=new MobState();mob.templateId='skeleton_king';mob.mapId='trono';mob.hp=mob.maxHp=2500;mob.aggroTargetId='p';
    const p=new PlayerState();p.mapId='trono';
    const players=new Map([['p',p]]);
    stepGuardianHazard(mob,players,50);expect(mob.hazardMs).toBe(1800);
    p.x=8;expect(stepGuardianHazard(mob,players,1800)).toEqual([]);
    expect(mob.hazardCooldownMs).toBe(8000);
    mob.hp=1000;stepGuardianHazard(mob,players,8000);
    expect(stepGuardianHazard(mob,players,1800)).toEqual(['p']);
    expect(mob.hazardCooldownMs).toBe(5000);
  });
  it('el behemoth avisa durante dos segundos y golpea un área menor',()=>{
    const mob=new MobState();mob.templateId='crypt_behemoth';mob.mapId='cripta';mob.aggroTargetId='p';
    const p=new PlayerState();p.mapId='cripta';
    const players=new Map([['p',p]]);
    stepGuardianHazard(mob,players,50);expect(mob.hazardMs).toBe(2000);expect(mob.hazardRadius).toBe(5);
    expect(stepGuardianHazard(mob,players,1900)).toEqual([]);
    expect(stepGuardianHazard(mob,players,100)).toEqual(['p']);
  });
  it('fija el centro, permite escapar y respeta mapa/muerte', () => {
    const mob=new MobState(); mob.templateId='crypt_warden'; mob.mapId='cripta'; mob.aggroTargetId='p';
    const p=new PlayerState(); p.mapId='cripta'; p.x=900; p.z=-37;
    const players=new Map([['p',p]]);
    expect(stepGuardianHazard(mob,players,50)).toEqual([]);
    expect(mob.hazardMs).toBe(1600); expect(mob.hazardX).toBe(900);
    p.x+=7;
    expect(stepGuardianHazard(mob,players,1600)).toEqual([]);
    expect(mob.hazardMs).toBe(0);
    stepGuardianHazard(mob,players,7000);
    expect(stepGuardianHazard(mob,players,1600)).toEqual(['p']);
    mob.aggroTargetId=''; stepGuardianHazard(mob,players,50); expect(mob.hazardMs).toBe(0);
  });
});
