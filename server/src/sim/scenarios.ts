import { SPAWN_ZONES, INVASION_SPOTS, CASTLE_CENTER, CASTLE_BRACKETS, getItem, getQuest, questReward, dungeonReward, createItemInstance, CRYPT_BOSS } from '@aden/shared';
import type { GameRoom } from '../rooms/GameRoom.js';
import type { Profile, Scenario } from './BalanceSimulator.js';

export type ScenarioSet = (className: string) => Scenario[];
export type GearStage = 'ruins' | 'crypt' | 'throne' | 'act2' | 'mines' | 'mines_late' | 'forge' | 'forge_mid' | 'forge_late';

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
    case 'forge': return { weapon: questReward(getQuest('f_halden'), className)!, armor: 'nihil_aegis', accessory: 'memory_locket', ring: trinkets.ring };
    case 'forge_mid': return { weapon: questReward(getQuest('f_halden'), className)!, armor: questReward(getQuest('f_drakes'), className)!, accessory: 'memory_locket', ring: trinkets.ring };
    case 'forge_late': return { weapon: questReward(getQuest('f_smelter'), className)!, armor: questReward(getQuest('f_drakes'), className)!, accessory: 'memory_locket', ring: trinkets.ring };
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

/** Enemigos de la Fragua al nivel previsto de la ruta. */
export function forgeScenarios(className: string): Scenario[] {
  return [
    scenario('Imp', 'ember_imp', profile(className, 21, 'forge')),
    scenario('Draco', 'young_drake', profile(className, 22, 'forge')),
    scenario('Guardián', 'forge_construct', profile(className, 23, 'forge_mid')),
    scenario('Fundidor', 'primal_smelter', profile(className, 24, 'forge_mid')),
    scenario('Vharzul', 'vharzul', profile(className, 25, 'forge_late', 'f_vharzul')),
  ];
}

/** Guardias del Castillo del Caos contra un jugador de su tramo. */
export function castleScenarios(className: string): Scenario[] {
  const at = (name: string, templateId: string, p: Profile): Scenario => ({ name, templateId, mapId: 'castillo', ...CASTLE_CENTER, profile: p });
  return [
    at('Guardia Menor', CASTLE_BRACKETS.menor.guard, profile(className, 15, 'mines')),
    at('Guardia Mayor', CASTLE_BRACKETS.mayor.guard, profile(className, 25, 'forge_late')),
  ];
}

export interface InvasionScenario { name: string; scenario: Scenario; group: Profile[]; soloClass: string; target: [number, number] }

/** Invasores contra el grupo para el que están pensados (y el más fuerte de ese grupo, solo). */
export function invasionScenarios(): InvasionScenario[] {
  const at = (name: string, templateId: string, mapId: string, group: Profile[], soloClass: string, target: [number, number]): InvasionScenario =>
    ({ name, scenario: { name, templateId, mapId, ...INVASION_SPOTS[mapId], profile: group[0] }, group, soloClass, target });
  const team = (classes: string[], level: number, stage: GearStage) => classes.map(cls => profile(cls, level, stage));
  return [
    at('Dragón Carmesí', 'crimson_dragon', 'pueblo', team(['knight', 'mage', 'barbarian', 'rogue', 'ranger'], 25, 'forge_late'), 'barbarian', [240, 360]),
    at('Heraldo del Yermo', 'waste_herald', 'bosque', team(['knight', 'mage', 'ranger'], 11, 'act2'), 'mage', [120, 180]),
    at('Espectro del Velo', 'veil_specter', 'marismas', team(['knight', 'mage', 'ranger'], 16, 'mines'), 'mage', [120, 180]),
    at('Coloso de Brasa', 'ember_colossus', 'minas', team(['knight', 'mage', 'ranger'], 25, 'forge_late'), 'mage', [120, 180]),
  ];
}

/** Mago de nivel 15 con el equipo del Acto II, para medir el maná en combate. */
export function manaProfile(): Profile {
  return profile('mage', 15, 'act2', 'a2_prior');
}

export interface CooperationScenario { encounter: string; composition: string; scenario: Scenario; group: Profile[] }

/** Comparaciones con equipo equivalente por clase; el mismo encuentro se ejecuta con ambas conductas. */
export function cooperationScenarios(): CooperationScenario[] {
  const dragon = invasionScenarios().find(inv => inv.scenario.templateId === 'crimson_dragon')!.scenario;
  const vharzul = forgeScenarios('knight').find(s => s.templateId === 'vharzul')!;
  const teams: [string, string[]][] = [
    ['mixto', ['knight', 'mage', 'barbarian', 'rogue', 'ranger']],
    ['5 magos', Array(5).fill('mage')],
    ['5 bárbaros', Array(5).fill('barbarian')],
  ];
  return [dragon, vharzul].flatMap(scenario => teams.map(([composition, classes]) => ({
    encounter: scenario.name, composition, scenario,
    group: classes.map(cls => profile(cls, 25, 'forge_late', scenario.profile.questId)),
  })));
}
