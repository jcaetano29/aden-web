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
  type BuyItemMessage,
  type UseItemMessage,
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
  PICKUP_DELAY_MS,
  DROP_DESPAWN_MS,
  distance2D,
  statsForLevel,
  statsForClass,
  firstQuestId,
  getQuest,
  nextQuestId,
  getItem,
  getShopPrice,
  getClass,
  isValidClass,
  respawnForTemplate,
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

  /** Agrega ítems al inventario del jugador (reutilizable en compra y pickup). */
  private addToInventory(player: PlayerState, itemTemplateId: string, qty: number): void {
    const existing = player.inventory.get(itemTemplateId);
    if (existing) {
      existing.qty += qty;
    } else {
      const inv = new InventoryItemState();
      inv.itemTemplateId = itemTemplateId;
      inv.qty = qty;
      player.inventory.set(itemTemplateId, inv);
    }
  }

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

      // Validate that skillId is in the class kit
      const kit = getClass(p.className).skills;
      if (!kit.includes(msg.skillId)) return;

      let skill;
      try {
        skill = getSkill(msg.skillId);
      } catch {
        return;
      }

      // Check MP and cooldown
      if (p.mp < skill.mpCost) return;
      if ((p.skillCooldowns.get(skill.id) ?? 0) > 0) return;

      // Branch by skill type
      if (skill.type === "damage") {
        // Damage skill: requires mob target in range
        const mob = p.targetId ? this.state.mobs.get(p.targetId) : undefined;
        if (!mob || mob.dead) return;
        if (!canAttack(p, mob, ATTACK_RANGE)) return;

        // All checks passed: spend resources
        p.mp -= skill.mpCost;
        p.skillCooldowns.set(skill.id, skill.cooldownMs);

        const variance = 0.9 + Math.random() * 0.2;
        const dmg = resolveAttack(p, mob, skill.factor ?? 1, variance, getClass(p.className).base.attackCooldownMs);
        this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
        if (mob.hp <= 0) {
          this.killMob(mob, p.targetId, client.sessionId);
        }
      } else if (skill.type === "heal") {
        // Heal skill: no target needed
        p.mp -= skill.mpCost;
        p.skillCooldowns.set(skill.id, skill.cooldownMs);

        const healAmount = Math.round(p.maxHp * (skill.healPct ?? 0));
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
      } else if (skill.type === "buff") {
        // Buff skill: no target needed, set buff on caster
        p.mp -= skill.mpCost;
        p.skillCooldowns.set(skill.id, skill.cooldownMs);

        if (skill.buffStat === "pAtk") {
          p.atkBuffMs = skill.buffMs ?? 0;
          p.atkBuffMult = skill.buffMult ?? 1;
        } else if (skill.buffStat === "pDef") {
          p.defBuffMs = skill.buffMs ?? 0;
          p.defBuffMult = skill.buffMult ?? 1;
        }
      } else if (skill.type === "dot") {
        // DoT skill: requires mob target in range
        const mob = p.targetId ? this.state.mobs.get(p.targetId) : undefined;
        if (!mob || mob.dead) return;
        if (!canAttack(p, mob, ATTACK_RANGE)) return;

        // All checks passed: spend resources
        p.mp -= skill.mpCost;
        p.skillCooldowns.set(skill.id, skill.cooldownMs);

        // Apply poison to mob (replaces any previous poison)
        mob.dotMs = skill.dotMs ?? 0;
        mob.dotDps = skill.dotDps ?? 0;
        mob.dotAttackerId = client.sessionId;
        mob.dotAccumMs = 0;
      }
    });

    // Etapa 4b-1: handler de interacción con NPC (aceptar/entregar misiones)
    this.onMessage(MessageType.InteractNpc, (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;

      // Verificar proximidad al pueblo (opcional pero recomendado)
      if (distance2D(p.x, p.z, TOWN.x, TOWN.z) > 4) return;

      // Si no hay misión activa, asignar la primera
      if (p.questId === "") {
        p.questId = firstQuestId();
        p.questProgress = 0;
        return;
      }

      try {
        const q = getQuest(p.questId);

        // Si la misión está completa, entregarla
        if (p.questProgress >= q.amount) {
          this.grantExp(p, client, q.rewardExp);
          p.gold += q.rewardGold;
          p.questId = nextQuestId(p.questId);
          p.questProgress = 0;
        }
        // Si no está completa, no-op (el cliente muestra "todavía no terminaste")
      } catch {
        // Quest no encontrada, ignorar
      }
    });

    // Etapa 4b-2: handler de compra en el mercader
    this.onMessage(MessageType.BuyItem, (client, msg: BuyItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;

      // Gate de proximidad al pueblo (igual que interactNpc)
      if (distance2D(p.x, p.z, TOWN.x, TOWN.z) > 4) return;

      // Validar cantidad
      const qty = Math.max(1, Math.floor(msg?.qty ?? 1));

      // Obtener precio (si no está a la venta, getShopPrice lanza, así que no-op)
      let price: number;
      try {
        price = getShopPrice(msg.itemTemplateId) * qty;
      } catch {
        return; // ítem no a la venta
      }

      // Verificar si tiene suficiente oro
      if (p.gold < price) return; // no suficiente, no-op

      // Deducir oro y agregar al inventario
      p.gold -= price;
      this.addToInventory(p, msg.itemTemplateId, qty);
    });

    // Etapa 4b-2: handler de uso de ítems (pociones)
    this.onMessage(MessageType.UseItem, (client, msg: UseItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;

      // Obtener definición del ítem
      let template;
      try {
        template = getItem(msg.itemTemplateId);
      } catch {
        return; // ítem desconocido
      }

      // Verificar que sea consumible y tenga curación
      if (template.type !== "consumable" || !template.heal) return;

      // Buscar en el inventario
      const invEntry = p.inventory.get(msg.itemTemplateId);
      if (!invEntry || invEntry.qty < 1) return; // no tiene el ítem

      // Si está a full HP, no hacer nada
      if (p.hp >= p.maxHp) return;

      // Curar hasta maxHp
      p.hp = Math.min(p.maxHp, p.hp + template.heal);

      // Decrementar cantidad
      invEntry.qty -= 1;

      // Si llega a 0, eliminar la entrada
      if (invEntry.qty <= 0) {
        p.inventory.delete(msg.itemTemplateId);
      }
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  /** Otorga EXP a un jugador y envía LevelUp si sube de nivel (Etapa 4b-1: reutilizable en quests). */
  private grantExp(player: PlayerState, client: Client, amount: number) {
    const lvls = gainExp(player, amount, player.className);
    if (lvls > 0) {
      client.send(MessageType.LevelUp, { level: player.level });
    }
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
    mob.respawnMs = respawnForTemplate(mob.templateId) ?? MOB_RESPAWN_MS;
    this.broadcast(MessageType.Death, { entityId: mobId });

    const killer = killerId ? this.state.players.get(killerId) : undefined;
    if (killer && !killer.dead) {
      const client = this.clients.find((c) => c.sessionId === killerId);
      if (client) {
        this.grantExp(killer, client, getMobExp(mob.templateId));
      }

      // Etapa 4b-1: progreso de misión al matar mob
      if (killer.questId !== "") {
        try {
          const q = getQuest(killer.questId);
          if (q.mobTemplateId === mob.templateId && killer.questProgress < q.amount) {
            killer.questProgress++;
          }
        } catch {
          // Quest no encontrada, ignorar
        }
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
      item.pickDelayMs = PICKUP_DELAY_MS; // visible al caer, no pickable hasta que expire
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

    // cooldowns de jugadores (ataque + skill) y buffs
    this.state.players.forEach((p) => {
      tickCooldown(p, dtMs);

      // Decrement per-skill cooldowns
      for (const [skillId, cooldownMs] of p.skillCooldowns.entries()) {
        const newCd = Math.max(0, cooldownMs - dtMs);
        if (newCd <= 0) {
          p.skillCooldowns.delete(skillId);
        } else {
          p.skillCooldowns.set(skillId, newCd);
        }
      }

      // Decrement attack buff
      if (p.atkBuffMs > 0) {
        p.atkBuffMs = Math.max(0, p.atkBuffMs - dtMs);
        if (p.atkBuffMs <= 0) {
          p.atkBuffMs = 0;
          p.atkBuffMult = 1;
        }
      }

      // Decrement defense buff
      if (p.defBuffMs > 0) {
        p.defBuffMs = Math.max(0, p.defBuffMs - dtMs);
        if (p.defBuffMs <= 0) {
          p.defBuffMs = 0;
          p.defBuffMult = 1;
        }
      }
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
        const dmg = resolveAttack(p, mob, 1, variance, getClass(p.className).base.attackCooldownMs);
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

    // DoT ticks: aplicar daño por veneno a mobs
    this.state.mobs.forEach((mob, mobId) => {
      if (mob.dead || mob.dotMs <= 0) return;

      mob.dotAccumMs += dtMs;

      // Tick de daño cada 500ms
      while (mob.dotAccumMs >= 500) {
        const dmg = Math.max(1, Math.round(mob.dotDps * 0.5));
        mob.hp = Math.max(0, mob.hp - dmg);

        this.broadcast(MessageType.Damage, {
          attackerId: mob.dotAttackerId,
          targetId: mobId,
          amount: dmg,
          hp: mob.hp,
        });

        mob.dotAccumMs -= 500;

        if (mob.hp <= 0) {
          // Mob muere por veneno: ruta la exp/loot al atacante que enveneno
          this.killMob(mob, mobId, mob.dotAttackerId);
          return; // Exit early to avoid further processing of this mob
        }
      }

      // Decrement DoT duration
      mob.dotMs = Math.max(0, mob.dotMs - dtMs);
      if (mob.dotMs <= 0) {
        mob.dotMs = 0;
        mob.dotDps = 0;
        mob.dotAttackerId = "";
        mob.dotAccumMs = 0;
      }
    });

    // despawn de ítems del piso (R-E3b-4: collect-then-delete, seguro sobre MapSchema)
    const despawnIds: string[] = [];
    this.state.droppedItems.forEach((it, id) => {
      it.despawnMs -= dtMs;
      if (it.pickDelayMs > 0) it.pickDelayMs -= dtMs;
      if (it.despawnMs <= 0) despawnIds.push(id);
    });
    for (const id of despawnIds) this.state.droppedItems.delete(id);

    // auto-pickup por proximidad (R-E3b-1: stacking sobre MapSchema; R-E3b-4: collect-then-delete)
    this.state.players.forEach((p) => {
      if (p.dead) return; // un jugador muerto no recoge ítems
      const pickupIds: string[] = [];
      this.state.droppedItems.forEach((it, id) => {
        // sólo pickable si ya pasó el delay (loot visible al caer) y está en rango
        if (it.pickDelayMs <= 0 && distance2D(p.x, p.z, it.x, it.z) <= PICKUP_RANGE) pickupIds.push(id);
      });
      for (const id of pickupIds) {
        const it = this.state.droppedItems.get(id);
        if (!it) continue; // ya recogido/despawneado en este mismo tick

        // Etapa 4b-1: oro como moneda (currency → gold, no al inventario)
        const itemDef = getItem(it.itemTemplateId);
        if (itemDef.type === "currency") {
          p.gold += it.qty;
        } else {
          this.addToInventory(p, it.itemTemplateId, it.qty);
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

  async onJoin(client: Client, options: { name?: string; className?: string }) {
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    const className = isValidClass(options?.className) ? options.className! : "knight";
    player.className = className;
    const st = statsForClass(className, 1);
    player.hp = st.maxHp;
    player.maxHp = st.maxHp;
    player.pAtk = st.pAtk;
    player.pDef = st.pDef;
    player.mp = st.maxMp;
    player.maxMp = st.maxMp;
    player.dead = false;
    player.attackCooldownMs = 0;
    player.respawnMs = 0;
    player.targetId = "";
    player.skillCooldowns.clear();
    player.atkBuffMs = 0;
    player.atkBuffMult = 1;
    player.defBuffMs = 0;
    player.defBuffMult = 1;
    player.exp = 0;
    player.level = 1;
    player.questId = firstQuestId();
    player.questProgress = 0;
    player.gold = 0;
    this.state.players.set(client.sessionId, player);

    // Etapa 3c: cargar el save (si existe) y aplicarlo sobre el player ya insertado en el
    // estado. Mientras el load está en curso, el jugador ya es válido con los defaults de
    // nivel 1 seteados arriba (R-E3c-2: onJoin async, se actualiza al resolver la promesa).
    const save = await this.persistence.load(player.name);
    if (save) {
      player.className = save.className ?? "knight";
      player.level = save.level;
      player.exp = save.exp;
      const st = statsForClass(player.className, save.level);
      player.maxHp = st.maxHp;
      player.maxMp = st.maxMp;
      player.pAtk = st.pAtk;
      player.pDef = st.pDef;
      player.hp = st.maxHp;
      player.mp = st.maxMp;
      player.x = player.targetX = save.pos_x;
      player.z = player.targetZ = save.pos_z;
      player.gold = save.gold ?? 0;
      player.questId = save.questId ?? firstQuestId();
      player.questProgress = save.questProgress ?? 0;
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
