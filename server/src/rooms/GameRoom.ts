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
  type UseSkillMessage,
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
  TOWN,
  SAFE_RADIUS,
  PLAYER_RESPAWN_MS,
  getSkill,
  gainExp,
  getMobExp,
  rollDrops,
  PICKUP_RANGE,
  DROP_DESPAWN_MS,
  distance2D,
  statsForLevel,
} from "@aden/shared";
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { MobState } from "../state/MobState.js";
import { DroppedItemState } from "../state/DroppedItemState.js";
import { InventoryItemState } from "../state/InventoryItemState.js";
import { advanceMovable } from "../systems/MovementSystem.js";
import { createSpawns } from "../systems/SpawnSystem.js";
import { stepMobAI, eligiblePlayersForAggro } from "../systems/MobAISystem.js";
import { canAttack, resolveAttack, tickCooldown } from "../systems/CombatSystem.js";
import { createPersistence } from "../persistence/createPersistence.js";
import type { PersistenceService } from "../persistence/PersistenceService.js";
import { toCharacterSave, inventoryRecordToEntries } from "../persistence/CharacterSave.js";

/** Intervalo de guardado periódico de personajes (Etapa 3c). */
const SAVE_INTERVAL_MS = 15000;

export class GameRoom extends Room<GameState> {
  /** Contador para generar ids únicos de ítems dropeados (R-E3b-3). */
  private dropSeq = 0;
  /** Servicio de persistencia de personajes (Supabase si hay env, si no in-memory). */
  private persistence!: PersistenceService;

  onCreate() {
    this.setState(new GameState());
    this.persistence = createPersistence();
    this.clock.setInterval(() => this.saveAll(), SAVE_INTERVAL_MS);

    for (const s of createSpawns(SPAWN_ZONES, Math.random)) {
      this.spawnMob(s.id, s.templateId, s.x, s.z);
    }

    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.dead) return;
      const target = clampToBounds(msg.x, msg.z, MAP_BOUNDS);
      player.targetX = target.x;
      player.targetZ = target.z;
      player.moving = true;
    });

    this.onMessage(MessageType.SetTarget, (client, msg: SetTargetMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.dead) return;
      // objetivo válido: un mob existente y vivo, o "" para limpiar
      if (
        msg.targetId === "" ||
        (this.state.mobs.has(msg.targetId) && !this.state.mobs.get(msg.targetId)!.dead)
      ) {
        player.targetId = msg.targetId;
      }
    });

    this.onMessage(MessageType.UseSkill, (client, msg: UseSkillMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      let skill;
      try {
        skill = getSkill(msg.skillId);
      } catch {
        return;
      }
      const mob = p.targetId ? this.state.mobs.get(p.targetId) : undefined;
      if (!mob || mob.dead) return;
      if (p.mp < skill.mpCost || p.skillCooldownMs > 0) return;
      if (!canAttack(p, mob, ATTACK_RANGE)) return;
      const variance = 0.9 + Math.random() * 0.2;
      const dmg = resolveAttack(p, mob, skill.factor, variance, PLAYER_COMBAT.attackCooldownMs);
      p.mp -= skill.mpCost;
      p.skillCooldownMs = skill.cooldownMs;
      this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
      if (mob.hp <= 0) {
        this.killMob(mob, p.targetId, client.sessionId);
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

  /**
   * Centraliza la muerte de un mob: marca dead/respawn y notifica por broadcast (R-E3a-3:
   * mismo comportamiento que antes). Si se pasa killerId, otorga EXP a ese jugador y, si sube
   * de nivel, le envía LevelUp SOLO a él (R-E3a-1: mensaje dirigido, no broadcast).
   */
  private killMob(mob: MobState, mobId: string, killerId?: string) {
    mob.dead = true;
    mob.moving = false;
    mob.respawnMs = MOB_RESPAWN_MS;
    this.broadcast(MessageType.Death, { entityId: mobId });

    const killer = killerId ? this.state.players.get(killerId) : undefined;
    if (killer && !killer.dead) {
      const lvls = gainExp(killer, getMobExp(mob.templateId));
      if (lvls > 0) {
        const client = this.clients.find((c) => c.sessionId === killerId);
        client?.send(MessageType.LevelUp, { level: killer.level });
      }
    }

    // Loot (R-E3b-2): rodar drop table del mob y crear ítems en el piso con scatter.
    for (const d of rollDrops(mob.templateId, Math.random)) {
      const item = new DroppedItemState();
      item.itemTemplateId = d.itemTemplateId;
      item.qty = d.qty;
      item.x = mob.x + (Math.random() - 0.5) * 1.5;
      item.z = mob.z + (Math.random() - 0.5) * 1.5;
      item.despawnMs = DROP_DESPAWN_MS;
      this.state.droppedItems.set(`${mobId}_${d.itemTemplateId}_${this.dropSeq++}`, item);
    }
  }

  tick(dt: number) {
    this.state.players.forEach((p) => {
      if (p.dead) return; // un jugador muerto no se mueve
      advanceMovable(p, dt);
    });

    // aggro: excluye jugadores muertos y los que están en la zona segura (pueblo)
    const aggroPlayers = eligiblePlayersForAggro(
      [...this.state.players.entries()].map(([id, p]) => ({ id, x: p.x, z: p.z, dead: p.dead })),
      TOWN,
      SAFE_RADIUS,
    );
    const dtMs = dt * 1000;
    this.state.mobs.forEach((mob) => {
      if (mob.dead) return; // R-E2b1-3: un mob muerto no deambula ni persigue
      stepMobAI(mob, aggroPlayers, AI_CONFIG, Math.random, dtMs);
      advanceMovable(mob, dt, MOB_MOVE_SPEED);
    });

    // cooldowns de jugadores (ataque + skill)
    this.state.players.forEach((p) => {
      tickCooldown(p, dtMs);
      if (p.skillCooldownMs > 0) p.skillCooldownMs = Math.max(0, p.skillCooldownMs - dtMs);
    });

    // auto-attack del jugador sobre su target
    this.state.players.forEach((p, sessionId) => {
      if (p.dead || !p.targetId) return;
      const mob = this.state.mobs.get(p.targetId);
      if (!mob || mob.dead) {
        p.targetId = "";
        return;
      }
      if (canAttack(p, mob, ATTACK_RANGE)) {
        const variance = 0.9 + Math.random() * 0.2;
        const dmg = resolveAttack(p, mob, 1, variance, PLAYER_COMBAT.attackCooldownMs);
        this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
        if (mob.hp <= 0) {
          this.killMob(mob, p.targetId, sessionId);
        }
      }
    });

    // ataque de mobs sobre el jugador que persiguen (R-E2b2-2: sólo objetivo vivo)
    this.state.mobs.forEach((mob, mobId) => {
      if (mob.dead || !mob.aggroTargetId) return;
      const player = this.state.players.get(mob.aggroTargetId);
      if (!player || player.dead) return;
      if (!canAttack(mob, player, ATTACK_RANGE)) return;
      const variance = 0.9 + Math.random() * 0.2;
      const dmg = resolveAttack(mob, player, 1, variance, getMobCombat(mob.templateId).attackCooldownMs);
      this.broadcast(MessageType.Damage, { attackerId: mobId, targetId: mob.aggroTargetId, amount: dmg, hp: player.hp });
      if (player.hp <= 0) {
        player.dead = true;
        player.moving = false;
        player.respawnMs = PLAYER_RESPAWN_MS;
        player.targetId = "";
        this.broadcast(MessageType.Death, { entityId: mob.aggroTargetId });
      }
    });

    // despawn de ítems del piso (R-E3b-4: collect-then-delete, seguro sobre MapSchema)
    const despawnIds: string[] = [];
    this.state.droppedItems.forEach((it, id) => {
      it.despawnMs -= dtMs;
      if (it.despawnMs <= 0) despawnIds.push(id);
    });
    for (const id of despawnIds) this.state.droppedItems.delete(id);

    // auto-pickup por proximidad (R-E3b-1: stacking sobre MapSchema; R-E3b-4: collect-then-delete)
    this.state.players.forEach((p) => {
      if (p.dead) return; // un jugador muerto no recoge ítems
      const pickupIds: string[] = [];
      this.state.droppedItems.forEach((it, id) => {
        if (distance2D(p.x, p.z, it.x, it.z) <= PICKUP_RANGE) pickupIds.push(id);
      });
      for (const id of pickupIds) {
        const it = this.state.droppedItems.get(id);
        if (!it) continue; // ya recogido/despawneado en este mismo tick
        const existing = p.inventory.get(it.itemTemplateId);
        if (existing) {
          existing.qty += it.qty;
        } else {
          const inv = new InventoryItemState();
          inv.itemTemplateId = it.itemTemplateId;
          inv.qty = it.qty;
          p.inventory.set(it.itemTemplateId, inv);
        }
        this.state.droppedItems.delete(id);
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

    // respawn del jugador en el pueblo
    this.state.players.forEach((p) => {
      if (!p.dead) return;
      p.respawnMs -= dtMs;
      if (p.respawnMs <= 0) {
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        p.dead = false;
        p.x = p.targetX = TOWN.x;
        p.z = p.targetZ = TOWN.z;
        p.moving = false;
        p.targetId = "";
      }
    });
  }

  async onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    player.hp = PLAYER_COMBAT.maxHp;
    player.maxHp = PLAYER_COMBAT.maxHp;
    player.pAtk = PLAYER_COMBAT.pAtk;
    player.pDef = PLAYER_COMBAT.pDef;
    player.mp = PLAYER_COMBAT.maxMp ?? 0;
    player.maxMp = PLAYER_COMBAT.maxMp ?? 0;
    player.dead = false;
    player.attackCooldownMs = 0;
    player.skillCooldownMs = 0;
    player.respawnMs = 0;
    player.targetId = "";
    player.exp = 0;
    player.level = 1;
    this.state.players.set(client.sessionId, player);

    // Etapa 3c: cargar el save (si existe) y aplicarlo sobre el player ya insertado en el
    // estado. Mientras el load está en curso, el jugador ya es válido con los defaults de
    // nivel 1 seteados arriba (R-E3c-2: onJoin async, se actualiza al resolver la promesa).
    const save = await this.persistence.load(player.name);
    if (save) {
      player.level = save.level;
      player.exp = save.exp;
      const st = statsForLevel(save.level);
      player.maxHp = st.maxHp;
      player.maxMp = st.maxMp;
      player.pAtk = st.pAtk;
      player.pDef = st.pDef;
      player.hp = st.maxHp;
      player.mp = st.maxMp;
      player.x = player.targetX = save.pos_x;
      player.z = player.targetZ = save.pos_z;
      for (const [id, qty] of inventoryRecordToEntries(save.inventory)) {
        const it = new InventoryItemState();
        it.itemTemplateId = id;
        it.qty = qty;
        player.inventory.set(id, it);
      }
    }

    // Etapa 3c (fix race save-before-load): recién ahora, con el save (si existía) ya
    // aplicado por completo, el jugador es seguro de persistir. Antes de esta línea,
    // saveAll()/onLeave() deben ignorarlo para no pisar el registro real con defaults
    // de nivel 1 (ver guardas en saveAll y onLeave).
    player.loaded = true;
  }

  /** Guarda el estado de todos los jugadores conectados (fire-and-forget, periódico). */
  private async saveAll() {
    this.state.players.forEach((p) => {
      // Etapa 3c: si el load de onJoin todavía no aplicó, p tiene los defaults de nivel 1;
      // guardarlo pisaría el registro real. Se salta hasta que loaded === true.
      if (!p.loaded) return;
      this.persistence.save(p.name, toCharacterSave(p)).catch((e) => console.error("[aden] save fail", p.name, e));
    });
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Etapa 3c: si se desconectó antes de que el load resolviera, no hay nada nuevo que
      // valga la pena persistir y guardar pisaría el registro real con defaults.
      if (player.loaded) {
        try {
          await this.persistence.save(player.name, toCharacterSave(player));
        } catch (e) {
          console.error("[aden] save fail on leave", player.name, e);
        }
      }
    }
    this.state.players.delete(client.sessionId);
  }
}
