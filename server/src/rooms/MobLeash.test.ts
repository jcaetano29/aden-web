import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import config from '../testServer.js';
import type { GameRoom } from './GameRoom.js';
import { MessageType, AI_CONFIG, ENCOUNTER_LEASH_RADIUS, RETURNING_HOME, distance2D, getEncounter, weaponRange } from '@aden/shared';
import { playerLoadout } from '../systems/ItemSystem.js';

// Reported in play: fighting the Veil Guardian (level 12) solo at level 14, it
// "hit very fast and regenerated its life". Once it leashed, every hit re-engaged it
// beyond the leash, so it reset to full life and reopened its circle every ~2 s.
describe('mob leash', () => {
  let server: ColyseusTestServer;
  beforeAll(async () => { server = await boot(config, 2632); });
  afterAll(async () => { await server.shutdown(); });
  beforeEach(async () => { await server.cleanup(); });

  async function guardianRoom(name: string, className = 'knight') {
    const room = await server.createRoom('game', {}) as GameRoom;
    const c = await server.connectTo(room, { name, className });
    room.setSimulationInterval(() => {}, 1000); room.state.mobs.clear();
    const p = room.state.players.get(c.sessionId)!;
    p.level = 14; (room as unknown as { recomputeStats(p: unknown): void }).recomputeStats(p);
    p.mapId = 'marismas'; p.hp = p.maxHp; p.mp = p.maxMp;
    const mob = room.spawnMob('guardian', 'veil_guardian', 1200, 102, 'marismas');
    return { room, c, p, mob };
  }

  it('a leashed boss walks home ignoring hits: no re-engage, no damage, no attacks', async () => {
    const { room, c, p, mob } = await guardianRoom('LeashWalker');
    mob.z = mob.homeZ + ENCOUNTER_LEASH_RADIUS + 1;
    mob.aiState = 'chase'; mob.aggroTargetId = c.sessionId;
    p.targetId = 'guardian';
    const startDistance = distance2D(mob.x, mob.z, mob.homeX, mob.homeZ);
    const hpBefore = p.hp;
    for (let i = 0; i < 45; i++) {
      p.x = p.targetX = mob.x; p.z = p.targetZ = mob.z + 1.5; p.moving = false; p.attackCooldownMs = 0;
      room.tick(1 / 15);
      expect(mob.aiState).toBe('return');
      expect(mob.hp).toBe(mob.maxHp);
      expect(mob.hazardMs).toBe(0);
      expect(mob.windupMs).toBe(0);
    }
    expect(p.hp).toBe(hpBefore);
    expect(distance2D(mob.x, mob.z, mob.homeX, mob.homeZ)).toBeLessThan(startDistance - 5);
  });

  it('refuses damage skills and poison on an enemy returning home', async () => {
    for (const [className, skillId] of [['knight', 'shield_bash'], ['rogue', 'poison']]) {
      const { room, c, p, mob } = await guardianRoom(`Refused${className}`, className);
      mob.z = mob.homeZ + 20; mob.aiState = RETURNING_HOME; mob.targetX = mob.homeX; mob.targetZ = mob.homeZ; mob.moving = true;
      p.x = p.targetX = mob.x; p.z = p.targetZ = mob.z + 1.5; p.targetId = 'guardian';
      const refusals: { success: boolean }[] = [];
      c.onMessage(MessageType.ItemResult, (r) => refusals.push(r));
      const mp = p.mp;
      c.send(MessageType.UseSkill, { skillId });
      await vi.waitFor(() => expect(refusals.some(r => r.success === false)).toBe(true));
      expect(p.mp).toBe(mp);
      expect(mob.hp).toBe(mob.maxHp);
      expect(mob.dotMs).toBe(0);
      expect(mob.aggroTargetId).toBe('');
    }
  });

  it('keeps fighting a boss dragged past the generic leash', async () => {
    const { room, c, p, mob } = await guardianRoom('Dragger');
    mob.z = mob.homeZ + AI_CONFIG.leashRadius + 4;
    mob.aiState = 'chase'; mob.aggroTargetId = c.sessionId;
    p.maxHp = p.hp = 1e6; p.targetId = 'guardian';
    for (let i = 0; i < 45; i++) {
      p.x = p.targetX = mob.x; p.z = p.targetZ = mob.z + 1.5; p.moving = false;
      room.tick(1 / 15);
      expect(mob.aiState).toBe('chase');
    }
    expect(mob.hp).toBeLessThan(mob.maxHp);
  });

  it('dodging every circle back toward the camp keeps the Veil Guardian engaged', async () => {
    const { room, c, p, mob } = await guardianRoom('Dodger');
    p.maxHp = p.hp = 1e6; // only the boss behaviour matters here
    const range = weaponRange(playerLoadout(p));
    p.x = p.targetX = mob.x; p.z = p.targetZ = mob.z + range * 0.8;
    const handlers = (room as unknown as { onMessageHandlers: Record<string, (c: unknown, m: unknown) => void> }).onMessageHandlers;
    const send = (type: string, message: unknown) => handlers[type](c, message);
    send(MessageType.SetTarget, { targetId: 'guardian' });
    const def = getEncounter('veil_guardian')!;
    const hazardStarts: number[] = [];
    let prevHp = mob.hp, prevHazard = 0;
    for (let i = 0; i < 15 * 120 && !mob.dead; i++) {
      const d = distance2D(p.x, p.z, mob.x, mob.z);
      if (mob.hazardMs > 0 && distance2D(p.x, p.z, mob.hazardX, mob.hazardZ) <= mob.hazardRadius + 0.5) {
        // Out of the circle, south: back toward Maera's camp, where the player came from.
        send(MessageType.MoveTo, { x: mob.hazardX, z: mob.hazardZ + mob.hazardRadius + 1.5 });
      } else if (d > range * 0.9 && mob.hazardMs === 0) {
        const k = (d - range * 0.7) / d;
        send(MessageType.MoveTo, { x: p.x + (mob.x - p.x) * k, z: p.z + (mob.z - p.z) * k });
      }
      room.tick(1 / 15);
      if (mob.hazardMs > 0 && prevHazard === 0) hazardStarts.push(i / 15);
      prevHazard = mob.hazardMs;
      expect(mob.hp).toBeLessThanOrEqual(prevHp); // never refills mid-fight
      prevHp = mob.hp;
    }
    expect(mob.dead).toBe(true);
    for (let k = 1; k < hazardStarts.length; k++) {
      expect(hazardStarts[k] - hazardStarts[k - 1]).toBeGreaterThanOrEqual((def.cooldownMs + def.patterns[0].windupMs) / 1000 - 0.1);
    }
  });
});
