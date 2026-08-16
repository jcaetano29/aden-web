// NOTA: import por default + destructuring en lugar de `import { Room, Client }`.
// El paquete "colyseus" (CJS, bundle de esbuild) sólo anota estáticamente
// RedisDriver/RedisPresence como named exports en su "0 && (module.exports = {...})";
// el resto (Room, Client, Server, ...) llega vía re-export dinámico (__reExport) que
// Node's cjs-module-lexer no detecta al hacer `import { Room } from "colyseus"` bajo ESM
// nativo (tsx/node), lanzando "does not provide an export named 'Room'". El default import
// sí funciona porque Node no necesita enumerar named exports para acceder a él.
// Client es sólo un tipo (no existe en runtime), por eso se importa aparte con `import type`.
import colyseusPkg from "colyseus";
import type { Client } from "colyseus";
const { Room } = colyseusPkg;
import {
  MessageType,
  type MoveToMessage,
  type SetTargetMessage,
  MAP_BOUNDS,
  TICK_RATE,
  clampToBounds,
  SPAWN_ZONES,
  MOB_MOVE_SPEED,
  AI_CONFIG,
  PLAYER_COMBAT,
  getMobCombat,
  ATTACK_RANGE,
  MOB_RESPAWN_MS,
} from "@aden/shared";
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { MobState } from "../state/MobState.js";
import { advanceMovable } from "../systems/MovementSystem.js";
import { createSpawns } from "../systems/SpawnSystem.js";
import { stepMobAI } from "../systems/MobAISystem.js";
import { canAttack, resolveAttack, tickCooldown } from "../systems/CombatSystem.js";

export class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    for (const s of createSpawns(SPAWN_ZONES, Math.random)) {
      this.spawnMob(s.id, s.templateId, s.x, s.z);
    }

    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const target = clampToBounds(msg.x, msg.z, MAP_BOUNDS);
      player.targetX = target.x;
      player.targetZ = target.z;
      player.moving = true;
    });

    this.onMessage(MessageType.SetTarget, (client, msg: SetTargetMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // objetivo válido: un mob existente y vivo, o "" para limpiar
      if (
        msg.targetId === "" ||
        (this.state.mobs.has(msg.targetId) && !this.state.mobs.get(msg.targetId)!.dead)
      ) {
        player.targetId = msg.targetId;
      }
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  /** Crea (o resetea al respawnear) un mob con posición/home/target y stats de combate. */
  spawnMob(id: string, templateId: string, x: number, z: number): MobState {
    const mob = this.state.mobs.get(id) ?? new MobState();
    mob.templateId = templateId;
    mob.x = x;
    mob.z = z;
    mob.homeX = x;
    mob.homeZ = z;
    mob.targetX = x;
    mob.targetZ = z;
    mob.moving = false;
    mob.aiState = "wander";
    mob.aggroTargetId = "";
    mob.wanderCooldownMs = 0;

    const c = getMobCombat(templateId);
    mob.hp = c.maxHp;
    mob.maxHp = c.maxHp;
    mob.pAtk = c.pAtk;
    mob.pDef = c.pDef;
    mob.dead = false;
    mob.attackCooldownMs = 0;

    this.state.mobs.set(id, mob);
    return mob;
  }

  tick(dt: number) {
    this.state.players.forEach((p) => advanceMovable(p, dt));

    const players = [...this.state.players.entries()].map(([id, p]) => ({ id, x: p.x, z: p.z }));
    const dtMs = dt * 1000;
    this.state.mobs.forEach((mob) => {
      if (mob.dead) return; // R-E2b1-3: un mob muerto no deambula ni persigue
      stepMobAI(mob, players, AI_CONFIG, Math.random, dtMs);
      advanceMovable(mob, dt, MOB_MOVE_SPEED);
    });

    // cooldowns de jugadores
    this.state.players.forEach((p) => tickCooldown(p, dtMs));

    // auto-attack del jugador sobre su target
    this.state.players.forEach((p) => {
      if (!p.targetId) return;
      const mob = this.state.mobs.get(p.targetId);
      if (!mob || mob.dead) {
        p.targetId = "";
        return;
      }
      if (canAttack(p, mob, ATTACK_RANGE)) {
        const variance = 0.9 + Math.random() * 0.2;
        const dmg = resolveAttack(p, mob, 1, variance, PLAYER_COMBAT.attackCooldownMs);
        this.broadcast(MessageType.Damage, { targetId: p.targetId, amount: dmg, hp: mob.hp });
        if (mob.hp <= 0) {
          mob.dead = true;
          mob.moving = false;
          mob.respawnMs = MOB_RESPAWN_MS;
          this.broadcast(MessageType.Death, { entityId: p.targetId });
        }
      }
    });

    // cooldowns/respawn de mobs
    this.state.mobs.forEach((mob, id) => {
      tickCooldown(mob, dtMs);
      if (mob.dead) {
        mob.respawnMs -= dtMs;
        if (mob.respawnMs <= 0) {
          this.spawnMob(id, mob.templateId, mob.homeX, mob.homeZ);
        }
      }
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    player.hp = PLAYER_COMBAT.maxHp;
    player.maxHp = PLAYER_COMBAT.maxHp;
    player.pAtk = PLAYER_COMBAT.pAtk;
    player.pDef = PLAYER_COMBAT.pDef;
    player.attackCooldownMs = 0;
    player.targetId = "";
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
