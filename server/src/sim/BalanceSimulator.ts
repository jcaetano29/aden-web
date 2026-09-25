import { boot, type ColyseusTestServer } from '@colyseus/testing';
import type { Client } from 'colyseus';
import {
  MessageType, TICK_RATE, availableSkills, getSkill, nearestWalkable, pointsForLevel, weaponRange, distance2D,
  CATALOG_ITEMS, type SkillConfig,
} from '@aden/shared';
import config from '../testServer.js';
import type { GameRoom } from '../rooms/GameRoom.js';
import { PlayerState } from '../state/PlayerState.js';
import type { MobState } from '../state/MobState.js';
import { grantItem, playerLoadout } from '../systems/ItemSystem.js';
import { inHazard } from '../systems/EncounterSystem.js';

export type Behavior = 'attentive' | 'stationary';
export interface Attributes { str: number; agi: number; vit: number; ene: number }
export interface Profile {
  className: string;
  level: number;
  equipment: Record<string, string>;
  attributes?: Attributes;
  potions?: Record<string, number>;
  questId?: string;
}
export interface Scenario {
  name: string;
  templateId: string;
  mapId: string;
  x: number;
  z: number;
  profile: Profile;
  setup?: (room: GameRoom) => void;
}
export interface FightResult {
  scenario: string;
  className: string;
  behavior: Behavior;
  level: number;
  enemyLevel: number;
  outcome: 'kill' | 'death' | 'timeout';
  seconds: number;
  /** Mayor caída de vida durante la pelea, en % de la vida máxima. */
  hpLostPct: number;
  potions: number;
}

const BOT_ID = 'sim_bot';
const TARGET_ID = 'sim_target';
const HP_POTIONS = ['greater_potion', 'health_potion'];
const FULL_CIRCLE = Math.PI * 2;

/** Reparto equilibrado: puntos del nivel en partes iguales; el resto a vitalidad. */
export function balancedAttributes(level: number): Attributes {
  const total = pointsForLevel(level), each = Math.floor(total / 4);
  return { str: each, agi: each, ene: each, vit: total - each * 3 };
}

/** PRNG determinista (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Punto seguro: detrás del jefe para un cono; fuera del círculo para un área. Si el bot está
 * cerca del centro, sale hacia el origen del jefe (como haría una persona) para no arrastrarlo
 * hasta el límite de persecución, que lo reiniciaría con la vida llena.
 */
export function escapePoint(mob: Pick<MobState, 'hazardX' | 'hazardZ' | 'hazardRadius' | 'hazardArc' | 'hazardAngle' | 'homeX' | 'homeZ'>, p: { x: number; z: number }): { x: number; z: number } {
  if (mob.hazardArc < FULL_CIRCLE - 1e-6) {
    return { x: mob.hazardX - Math.cos(mob.hazardAngle) * 2, z: mob.hazardZ - Math.sin(mob.hazardAngle) * 2 };
  }
  const nearCenter = distance2D(p.x, p.z, mob.hazardX, mob.hazardZ) < mob.hazardRadius * 0.5;
  const towardHome = distance2D(mob.homeX, mob.homeZ, mob.hazardX, mob.hazardZ) > 1;
  let dx = nearCenter && towardHome ? mob.homeX - mob.hazardX : p.x - mob.hazardX;
  let dz = nearCenter && towardHome ? mob.homeZ - mob.hazardZ : p.z - mob.hazardZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) { dx = 1; dz = 0; } else { dx /= len; dz /= len; }
  return { x: mob.hazardX + dx * (mob.hazardRadius + 2), z: mob.hazardZ + dz * (mob.hazardRadius + 2) };
}

/**
 * Corre el combate real del servidor (daño, skills, pociones, peligros, diferencia de nivel)
 * con un bot, avanzando el tick a mano con azar y reloj controlados. No reemplaza partidas reales.
 */
export class BalanceSimulator {
  private clock = Date.now();
  private readonly client = { sessionId: BOT_ID, send: () => {} } as unknown as Client;

  private constructor(private readonly server: ColyseusTestServer, private readonly room: GameRoom) {}

  static async start(port = 2610): Promise<BalanceSimulator> {
    const server = await boot(config, port);
    const room = await server.createRoom('game', {}) as GameRoom;
    room.setSimulationInterval(() => {}, 1000);
    return new BalanceSimulator(server, room);
  }

  async stop(): Promise<void> {
    await this.server.shutdown();
  }

  fight(s: Scenario, behavior: Behavior, seed = 1, maxSeconds = 300): FightResult {
    return this.controlled(seed, advance => {
      const p = this.resetWorld(s.profile);
      s.setup?.(this.room);
      const mob = this.room.spawnMob(TARGET_ID, s.templateId, s.x, s.z, s.mapId);
      this.place(p, s.mapId, mob.x, mob.z + 5);
      this.send(MessageType.SetTarget, { targetId: TARGET_ID });
      const dt = 1 / TICK_RATE;
      let t = 0, potions = 0, lowestHp = p.hp;
      const result = (outcome: FightResult['outcome']): FightResult => ({
        scenario: s.name, className: s.profile.className, behavior, level: s.profile.level, enemyLevel: mob.level,
        outcome, seconds: Math.round(t * 10) / 10, hpLostPct: Math.round(100 * (1 - lowestHp / p.maxHp)), potions,
      });
      while (t < maxSeconds) {
        if (mob.dead) return result('kill');
        if (p.dead) return result('death');
        if (behavior === 'attentive') potions += this.attentiveStep(p, mob);
        else if (!p.targetId) this.send(MessageType.SetTarget, { targetId: TARGET_ID });
        this.room.tick(dt);
        advance(dt * 1000);
        t += dt;
        lowestHp = Math.min(lowestHp, p.hp);
      }
      return result('timeout');
    });
  }

  /** Segundos hasta que la rotación no se puede pagar con el maná disponible (null = la sostiene). */
  manaRun(profile: Profile, rotation: 'max' | 'primary', seed = 1, maxSeconds = 180): number | null {
    return this.controlled(seed, advance => {
      const p = this.resetWorld(profile);
      const dummy = this.room.spawnMob(TARGET_ID, 'veil_raider', 1200, 130, 'marismas');
      dummy.maxHp = dummy.hp = 1e9; dummy.pAtk = 0; dummy.stunMs = 1e12;
      this.place(p, 'marismas', dummy.x, dummy.z + 2);
      this.send(MessageType.SetTarget, { targetId: TARGET_ID });
      const skills = this.offensive(p, rotation);
      const dt = 1 / TICK_RATE;
      for (let t = 0; t < maxSeconds; t += dt) {
        for (const s of skills) {
          if ((p.skillCooldowns.get(s.id) ?? 0) > 0) continue;
          if (p.mp < s.mpCost) return Math.round(t * 10) / 10;
          this.send(MessageType.UseSkill, { skillId: s.id });
        }
        this.room.tick(dt);
        advance(dt * 1000);
      }
      return null;
    });
  }

  /** Devuelve 1 si usó una poción en este tick. */
  private attentiveStep(p: PlayerState, mob: MobState): number {
    if (mob.hazardMs > 0 && inHazard(mob, p.x, p.z)) {
      this.send(MessageType.MoveTo, escapePoint(mob, p));
      return 0;
    }
    let used = 0;
    if (p.hp < p.maxHp * 0.45 && p.hpPotionCooldownMs <= 0) {
      const potion = HP_POTIONS.find(id => (p.inventory.get(id)?.qty ?? 0) > 0);
      if (potion) { this.send(MessageType.UseItem, { itemTemplateId: potion }); used = 1; }
    }
    if (!p.targetId) this.send(MessageType.SetTarget, { targetId: TARGET_ID });
    for (const s of this.castable(p)) this.send(MessageType.UseSkill, { skillId: s.id });
    const range = weaponRange(playerLoadout(p));
    const d = distance2D(p.x, p.z, mob.x, mob.z);
    if (d > range * 0.9) {
      const k = (d - range * 0.7) / d;
      const goal = { x: p.x + (mob.x - p.x) * k, z: p.z + (mob.z - p.z) * k };
      if (!(mob.hazardMs > 0 && inHazard(mob, goal.x, goal.z))) this.send(MessageType.MoveTo, goal);
    }
    return used;
  }

  private skills(p: PlayerState): SkillConfig[] {
    return availableSkills(p.className, p.level, [...p.learnedTomes], p.equipment.get('weapon')).map(id => getSkill(id));
  }

  private castable(p: PlayerState): SkillConfig[] {
    return this.skills(p).filter(s => {
      if ((p.skillCooldowns.get(s.id) ?? 0) > 0 || p.mp < s.mpCost) return false;
      if (s.type === 'dash' || s.dash === 'away') return false;
      if (s.type === 'heal') return p.hp < p.maxHp * 0.6;
      if (s.type === 'buff') return (s.buffStat === 'pDef' ? p.defBuffMs : p.atkBuffMs) <= 0 && !(s.healPct && p.hp > p.maxHp * 0.6);
      return true;
    });
  }

  /** Skills ofensivas sin desplazamiento; 'primary' = solo la primera del kit. */
  private offensive(p: PlayerState, rotation: 'max' | 'primary'): SkillConfig[] {
    const list = this.skills(p).filter(s => (s.type === 'damage' || s.type === 'dot') && !s.dash);
    return rotation === 'primary' ? list.slice(0, 1) : list;
  }

  private resetWorld(profile: Profile): PlayerState {
    const r = this.room;
    r.state.mobs.clear(); r.state.players.clear(); r.state.droppedItems.clear();
    (r as unknown as { dungeonRun: { dungeonStage: number; dungeonKills: number } }).dungeonRun.dungeonStage = 0;
    const p = new PlayerState();
    p.name = BOT_ID; p.className = profile.className; p.level = profile.level;
    p.questId = profile.questId ?? 'q1';
    for (const [slot, id] of Object.entries(profile.equipment)) p.equipment.set(slot, id);
    const a = profile.attributes ?? balancedAttributes(profile.level);
    p.attributes.str = a.str; p.attributes.agi = a.agi; p.attributes.vit = a.vit; p.attributes.ene = a.ene;
    for (const [id, qty] of Object.entries(profile.potions ?? {})) grantItem(p, id, qty);
    for (const item of Object.values(CATALOG_ITEMS)) if (item.category === 'municion') grantItem(p, item.id, 5000);
    r.state.players.set(BOT_ID, p);
    (r as unknown as { recomputeStats(p: PlayerState): void }).recomputeStats(p);
    p.hp = p.maxHp; p.mp = p.maxMp; p.msSinceCombat = 100000;
    return p;
  }

  private place(p: PlayerState, mapId: string, x: number, z: number): void {
    const at = nearestWalkable(mapId, { x, z });
    p.mapId = mapId; p.x = p.targetX = at.x; p.z = p.targetZ = at.z; p.moving = false;
  }

  private send(type: string, message: unknown): void {
    const handlers = (this.room as unknown as { onMessageHandlers: Record<string, (c: Client, m: unknown) => void> }).onMessageHandlers;
    handlers[type](this.client, message);
  }

  /** Azar sembrado y reloj monótono propio (las pociones usan Date.now). */
  private controlled<T>(seed: number, run: (advance: (ms: number) => void) => T): T {
    const realRandom = Math.random, realNow = Date.now;
    Math.random = seededRandom(seed);
    Date.now = () => this.clock;
    try { return run(ms => { this.clock += ms; }); }
    finally { Math.random = realRandom; Date.now = realNow; }
  }
}
