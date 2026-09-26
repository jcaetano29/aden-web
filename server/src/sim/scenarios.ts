import { SPAWN_ZONES, getItem, getQuest, questReward, dungeonReward, createItemInstance, CRYPT_BOSS } from '@aden/shared';
import type { GameRoom } from '../rooms/GameRoom.js';
import type { Profile, Scenario } from './BalanceSimulator.js';

export type GearStage = 'ruins' | 'crypt' | 'throne' | 'act2' | 'mines' | 'mines_late';

function spawnOf(templateId: string): { mapId: string; x: number; z: number } {
  const zone = SPAWN_ZONES.find(z => z.templateId === templateId);
  if (!zone) throw new Error(`sin spawn para ${templateId}`);
  return { mapId: zone.mapId, x: zone.centerX, z: zone.centerZ };
}

/** Equipo garantizado por la campaña al llegar a cada jefe (sin botín aleatorio). */
export function gearFor(className: string, stage: GearStage): Record<string, string> {
  const base = getItem(dungeonReward(className));
  const early = createItemInstance(base, { quality: 'magic', level: 2 }, `sim_q2_${className}`);
  const crypt = createItemInstance(base, { quality: 'magic', level: 5, skill: true }, `sim_crypt_${className}`);
  const trinkets = { accessory: 'hunter_charm', ring: 'aden_sello_del_veneno_antiguo' };
  switch (stage) {
    case 'ruins': return { weapon: early, armor: 'leather_vest', ...trinkets };
    case 'crypt': return { weapon: early, armor: 'crypt_plate', ...trinkets };
    case 'throne': return { weapon: crypt, armor: 'ash_guard', ...trinkets };
    case 'act2': return { weapon: crypt, armor: 'nihil_aegis', ...trinkets };
    case 'mines': return { weapon: crypt, armor: 'nihil_aegis', accessory: 'memory_locket', ring: trinkets.ring };
    case 'mines_late': return { weapon: questReward(getQuest('f_foreman'), className)!, armor: 'nihil_aegis', accessory: 'memory_locket', ring: trinkets.ring };
  }
}

function profile(className: string, level: number, stage: GearStage, questId?: string): Profile {
  return { className, level, equipment: gearFor(className, stage), potions: { greater_potion: 20, health_potion: 20 }, questId };
}

function scenario(name: string, templateId: string, p: Profile, setup?: (room: GameRoom) => void): Scenario {
  return { name, templateId, ...spawnOf(templateId), profile: p, setup };
}

/** Jefes y enemigos actuales al nivel previsto de la campaña. */
export function baselineScenarios(className: string): Scenario[] {
  return [
    scenario('Centinela', 'crypt_sentinel', profile(className, 6, 'ruins')),
    { ...scenario('Custodio', 'crypt_warden', profile(className, 7, 'crypt'), room => {
      (room as unknown as { dungeonRun: { dungeonStage: number } }).dungeonRun.dungeonStage = 4;
    }), x: CRYPT_BOSS.x, z: CRYPT_BOSS.z },
    scenario('Nihil', 'skeleton_king', profile(className, 10, 'throne')),
    scenario('Saqueador', 'veil_raider', profile(className, 10, 'act2')),
    scenario('Guardián del Velo', 'veil_guardian', profile(className, 12, 'act2')),
    scenario('Guardia', 'memory_guard', profile(className, 13, 'act2')),
    scenario('Carcelero', 'memory_jailer', profile(className, 14, 'act2')),
    scenario('Prior', 'memory_prior', profile(className, 15, 'act2', 'a2_prior')),
  ];
}

/** Enemigos de las Minas al nivel previsto de la ruta. */
export function minesScenarios(className: string): Scenario[] {
  return [
    scenario('Excavador', 'mine_digger', profile(className, 15, 'mines')),
    scenario('Armadura', 'mine_armor', profile(className, 16, 'mines')),
    scenario('Troll', 'cave_troll', profile(className, 18, 'mines')),
    scenario('Capataz', 'mine_foreman', profile(className, 19, 'mines')),
    scenario('Halden', 'halden', profile(className, 20, 'mines_late', 'f_halden')),
  ];
}

/** Mago de nivel 15 con el equipo del Acto II, para medir el maná en combate. */
export function manaProfile(): Profile {
  return profile('mage', 15, 'act2', 'a2_prior');
}
