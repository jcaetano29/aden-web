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
  type CreateGuildMessage,
  type JoinGuildMessage,
  type EquipItemMessage,
  type UnequipItemMessage,
  type EquipSlot,
  type SetTitleMessage,
  type WarpToMessage,
  type InteractObjectMessage,
  getZone,
  canEnterZone,
  TOWN_ZONE_ID,
  WORLD_OBJECTS,
  getWorldObject,
  OBJECT_INTERACT_RANGE,
  objectRespawnMs,
  SHRINE_BUFF_MS,
  SHRINE_BUFF_MULT,
  equipmentBonuses,
  getRarity,
  dayKey,
  previousDay,
  streakReward,
  dailyQuestForDay,
  getDailyQuest,
  newlyUnlocked,
  getAchievement,
  isValidTitle,
  isValidGuildTag,
  isValidGuildName,
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
  type InteractNpcMessage,
  type AllocateStatMessage,
  TOWN_SERVICE_RADIUS,
  HEAL_COST_GOLD,
  getBounty,
  firstBountyId,
  nextBountyId,
  attributeBonuses,
  isValidAttribute,
  POINTS_PER_LEVEL,
  pointsForLevel,
  type Attribute,
  getItem,
  getShopPrice,
  getClass,
  isValidClass,
  respawnForTemplate,
  isSkillLearned,
  newSkillsAtLevel,
  ATTACK_WINDUP_MS,
  computeDamage,
  applyPvpDeathPenalty,
  isBoss,
  getTemplate,
} from "@aden/shared";
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { MobState } from "../state/MobState.js";
import { DroppedItemState } from "../state/DroppedItemState.js";
import { GuildState } from "../state/GuildState.js";
import { WorldObjectState } from "../state/WorldObjectState.js";
import { InventoryItemState } from "../state/InventoryItemState.js";
import { LeaderPlayerEntry, LeaderGuildEntry } from "../state/LeaderboardState.js";
import { advanceMovable } from "../systems/MovementSystem.js";
import { createSpawns } from "../systems/SpawnSystem.js";
import { stepMobAI } from "../systems/MobAISystem.js";
import { canAttack, resolveAttack, tickCooldown } from "../systems/CombatSystem.js";
import { createPersistence } from "../persistence/createPersistence.js";
import type { PersistenceService, CharacterRank, GuildRank } from "../persistence/PersistenceService.js";
import { toCharacterSave, inventoryRecordToEntries, type CharacterSave } from "../persistence/CharacterSave.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

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

  /**
   * Etapa 12: recalcula los stats efectivos del jugador = base(clase,nivel) +
   * bonuses del equipo. Se llama tras equipar/desequipar y tras subir de nivel
   * (gainExp resetea los stats a la base, sin gear). Clampea hp/mp a los nuevos máximos.
   */
  private recomputeStats(p: PlayerState): void {
    const base = statsForClass(p.className, p.level);
    const equipped: Partial<Record<EquipSlot, string>> = {};
    p.equipment.forEach((id, slot) => { equipped[slot as EquipSlot] = id; });
    const bonus = equipmentBonuses(equipped);
    // Etapa 21: bonus de atributos primarios asignados (str/agi/vit/ene).
    const attr = attributeBonuses({ str: p.str, agi: p.agi, vit: p.vit, ene: p.ene });
    p.maxHp = base.maxHp + bonus.maxHp + attr.maxHp;
    p.maxMp = base.maxMp + bonus.maxMp + attr.maxMp;
    p.pAtk = base.pAtk + bonus.pAtk + attr.pAtk;
    p.pDef = base.pDef + bonus.pDef + attr.pDef;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    if (p.mp > p.maxMp) p.mp = p.maxMp;
  }

  /** true si el jugador posee (inventario o equipado) algún objeto legendario. */
  private hasLegendary(p: PlayerState): boolean {
    let found = false;
    p.inventory.forEach((_v, id) => { if (getRarity(id) === "legendary") found = true; });
    p.equipment.forEach((id) => { if (id && getRarity(id) === "legendary") found = true; });
    return found;
  }

  /**
   * Etapa 13: evalúa los logros del jugador y desbloquea los recién cumplidos —
   * otorga oro, auto-equipa el título más fuerte si no tiene ninguno, y avisa al
   * cliente. Se llama tras matar, subir de nivel, recoger/equipar loot.
   */
  private checkAchievements(p: PlayerState, sessionId: string): void {
    const unlocked = [...p.achievements];
    const news = newlyUnlocked(unlocked, {
      level: p.level,
      totalKills: p.totalKills,
      bossKills: p.bossKills,
      pvpKills: p.pvpKills,
      hasLegendary: this.hasLegendary(p),
    });
    if (news.length === 0) return;
    const client = this.clients.find((c) => c.sessionId === sessionId);
    let grantedTitle = "";
    for (const a of news) {
      p.achievements.push(a.id);
      p.gold += a.rewardGold;
      if (a.title) grantedTitle = a.title;
      client?.send(MessageType.Achievement, { id: a.id, name: a.name, title: a.title });
    }
    // Auto-lucir el título recién ganado sólo si no tenía ninguno puesto.
    if (p.title === "" && grantedTitle !== "") p.title = grantedTitle;
  }

  /**
   * Etapa 13: al entrar, si es un día nuevo actualiza la racha (consecutiva o
   * reinicio), asigna la misión diaria del día, otorga la recompensa de racha y
   * avisa al cliente. No hace nada si ya entró hoy.
   */
  private handleDailyRollover(p: PlayerState, client: Client): void {
    const today = dayKey(new Date());
    if (p.lastLoginDay === today) return;
    p.loginStreak = (p.lastLoginDay === previousDay(today)) ? p.loginStreak + 1 : 1;
    p.lastLoginDay = today;
    const daily = dailyQuestForDay(today);
    p.dailyQuestId = daily.id;
    p.dailyProgress = 0;
    p.dailyDone = false;
    const reward = streakReward(p.loginStreak);
    p.gold += reward;
    client.send(MessageType.DailyReset, { streak: p.loginStreak, reward, dailyDesc: daily.desc });
  }

  /**
   * Resuelve un targetId a un mob vivo o a un jugador vivo EN EL MISMO MAPA que el
   * solicitante (Etapa 15). Entidades de otros mapas se ignoran (no se ven ni se
   * targetean entre mapas).
   */
  private resolveTarget(id: string, mapId: string):
    | { kind: "mob"; entity: MobState }
    | { kind: "player"; entity: PlayerState; sessionId: string }
    | null {
    if (!id) return null;
    const mob = this.state.mobs.get(id);
    if (mob && !mob.dead && mob.mapId === mapId) return { kind: "mob", entity: mob };
    const pl = this.state.players.get(id);
    if (pl && !pl.dead && pl.mapId === mapId) return { kind: "player", entity: pl, sessionId: id };
    return null;
  }

  /** true si el mapa actual del jugador NO es seguro (PvP/combate habilitado). */
  private inPvpZone(p: { mapId: string }): boolean {
    return !getZone(p.mapId).safe;
  }

  /** Centraliza la muerte de un jugador (por mob o por PvP). Aplica penalidad si es PvP. */
  private killPlayer(victim: PlayerState, victimId: string, killerId?: string): void {
    victim.dead = true;
    victim.moving = false;
    victim.respawnMs = PLAYER_RESPAWN_MS;
    victim.targetId = "";
    this.broadcast(MessageType.Death, { entityId: victimId });
    if (killerId) {
      const pen = applyPvpDeathPenalty(victim.gold, victim.exp, victim.level);
      victim.gold = pen.gold;
      victim.exp = pen.exp;
      const killer = this.state.players.get(killerId);
      if (killer && !killer.dead) killer.pvpKills += 1;
    }
  }

  /** Borra la GuildState viva si ya no hay ningún jugador online con ese guildId. La fila persistida queda. */
  private pruneGuildIfEmpty(guildId: string): void {
    let anyOnline = false;
    this.state.players.forEach((pl) => { if (pl.guildId === guildId) anyOnline = true; });
    if (!anyOnline) this.state.guilds.delete(guildId);
  }

  /** Recalcula el snapshot del leaderboard: persistencia (incluye offline) mezclada con el estado vivo (online), ordenada, top 10. */
  private async refreshLeaderboard(): Promise<void> {
    const [chars, guilds] = await Promise.all([
      this.persistence.topCharacters(20),
      this.persistence.topGuilds(20),
    ]);

    // Jugadores: mezcla por nombre, el estado vivo pisa al persistido (stats más frescas).
    const pByName = new Map<string, CharacterRank>();
    for (const c of chars) pByName.set(c.name, c);
    this.state.players.forEach((pl) => {
      if (!pl.loaded) return;
      pByName.set(pl.name, { name: pl.name, level: pl.level, pvpKills: pl.pvpKills, className: pl.className });
    });
    const players = [...pByName.values()]
      .sort((a, b) => b.level - a.level || b.pvpKills - a.pvpKills)
      .slice(0, 10);

    // Guilds: mezcla por tag, las guilds vivas pisan a las persistidas.
    const gByTag = new Map<string, GuildRank>();
    for (const g of guilds) gByTag.set(g.tag, g);
    this.state.guilds.forEach((g) => {
      gByTag.set(g.tag, { name: g.name, tag: g.tag, bossKills: g.bossKills });
    });
    const gl = [...gByTag.values()]
      .sort((a, b) => b.bossKills - a.bossKills)
      .slice(0, 10);

    this.state.leaderboard.players.splice(0);
    for (const p of players) {
      const e = new LeaderPlayerEntry();
      e.name = p.name; e.level = p.level; e.pvpKills = p.pvpKills; e.className = p.className;
      this.state.leaderboard.players.push(e);
    }
    this.state.leaderboard.guilds.splice(0);
    for (const g of gl) {
      const e = new LeaderGuildEntry();
      e.name = g.name; e.tag = g.tag; e.bossKills = g.bossKills;
      this.state.leaderboard.guilds.push(e);
    }
  }

  onCreate() {
    this.setState(new GameState());
    this.persistence = createPersistence();
    this.clock.setInterval(() => this.saveAll(), SAVE_INTERVAL_MS);
    this.clock.setInterval(() => { void this.refreshLeaderboard(); }, 15000);
    void this.refreshLeaderboard();

    for (const s of createSpawns(SPAWN_ZONES, Math.random)) {
      this.spawnMob(s.id, s.templateId, s.x, s.z, s.mapId);
    }

    // Etapa 16: instanciar los objetos de mundo (cofres/barriles/santuarios).
    for (const def of WORLD_OBJECTS) {
      const o = new WorldObjectState();
      o.id = def.id; o.kind = def.kind; o.mapId = def.mapId; o.x = def.x; o.z = def.z; o.active = true;
      this.state.worldObjects.set(def.id, o);
    }

    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.dead) return;
      // Etapa 15: el movimiento se clampea a los bounds del MAPA ACTUAL (no se camina afuera).
      const target = clampToBounds(msg.x, msg.z, getZone(player.mapId).bounds);
      player.targetX = target.x;
      player.targetZ = target.z;
      player.moving = true;
    });

    this.onMessage(MessageType.SetTarget, (client, msg: SetTargetMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.dead) return;
      if (msg.targetId === "") { player.targetId = ""; return; }
      // Etapa 15: sólo se puede targetear entidades del mismo mapa.
      const mob = this.state.mobs.get(msg.targetId);
      const mobOk = !!mob && !mob.dead && mob.mapId === player.mapId;
      const other = this.state.players.get(msg.targetId);
      const playerOk = msg.targetId !== client.sessionId && !!other && !other.dead && other.mapId === player.mapId;
      if (mobOk || playerOk) player.targetId = msg.targetId;
    });

    this.onMessage(MessageType.UseSkill, (client, msg: UseSkillMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      if (p.stunMs > 0) return; // Etapa 22: aturdido no puede castear

      // Etapa 22: sólo se puede castear un skill YA APRENDIDO al nivel actual.
      if (!isSkillLearned(p.className, p.level, msg.skillId)) return;

      let skill;
      try {
        skill = getSkill(msg.skillId);
      } catch {
        return;
      }

      // Check MP and cooldown
      if (p.mp < skill.mpCost) return;
      if ((p.skillCooldowns.get(skill.id) ?? 0) > 0) return;

      const atkCd = getClass(p.className).base.attackCooldownMs;
      const spend = () => { p.mp -= skill.mpCost; p.skillCooldowns.set(skill.id, skill.cooldownMs); };
      const applyCleanse = () => { if (skill.cleanse) { p.stunMs = 0; p.rootMs = 0; } };

      // Branch by skill type
      if (skill.type === "damage") {
        const t = p.targetId ? this.resolveTarget(p.targetId, p.mapId) : null;
        if (!t) return;
        const gapCloser = skill.dash === "toTarget";
        // Enganche: requiere ataque listo pero NO rango (el dash acerca); si no, canAttack normal.
        const ready = gapCloser ? (p.attackCooldownMs <= 0 && t.entity.hp > 0) : canAttack(p, t.entity, ATTACK_RANGE);
        if (!ready) return;
        if (t.kind === "player") {
          const victim = t.entity;
          if (p.guildId !== "" && p.guildId === victim.guildId) return; // aliados no se pegan
          if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
        }
        if (gapCloser) this.dashToTarget(p, t.entity.x, t.entity.z);
        spend();
        const variance = 0.9 + Math.random() * 0.2;
        const dmg = resolveAttack(p, t.entity, skill.factor ?? 1, variance, atkCd);
        // Modificadores de counterplay sobre el objetivo.
        if (skill.stunMs) t.entity.stunMs = Math.max(t.entity.stunMs, skill.stunMs);
        if (skill.rootMs) t.entity.rootMs = Math.max(t.entity.rootMs, skill.rootMs);
        if (skill.lifestealPct) p.hp = Math.min(p.maxHp, p.hp + Math.round(dmg * skill.lifestealPct));
        this.markCombat(p);
        if (t.kind === "player") this.markCombat(t.entity);
        this.broadcast(MessageType.SkillCast, { casterId: client.sessionId, skillId: skill.id, targetId: p.targetId, amount: dmg });
        this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: t.entity.hp });
        if (t.entity.hp <= 0) {
          if (t.kind === "mob") this.killMob(t.entity, p.targetId, client.sessionId);
          else this.killPlayer(t.entity, p.targetId, client.sessionId);
        }
      } else if (skill.type === "heal") {
        spend();
        const healAmount = Math.round(p.maxHp * (skill.healPct ?? 0));
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        applyCleanse();
        this.broadcast(MessageType.SkillCast, { casterId: client.sessionId, skillId: skill.id, targetId: "", amount: healAmount });
      } else if (skill.type === "buff") {
        spend();
        if (skill.buffStat === "pAtk") {
          p.atkBuffMs = skill.buffMs ?? 0;
          p.atkBuffMult = skill.buffMult ?? 1;
        } else if (skill.buffStat === "pDef") {
          p.defBuffMs = skill.buffMs ?? 0;
          p.defBuffMult = skill.buffMult ?? 1;
        }
        // Algunos buffs también curan (last_stand) / limpian / dan escape (vanish).
        let healAmount = 0;
        if (skill.healPct) { healAmount = Math.round(p.maxHp * skill.healPct); p.hp = Math.min(p.maxHp, p.hp + healAmount); }
        applyCleanse();
        if (skill.dash === "away") this.dashAway(p, skill.dashRange);
        this.broadcast(MessageType.SkillCast, { casterId: client.sessionId, skillId: skill.id, targetId: "", amount: healAmount || undefined });
      } else if (skill.type === "dash") {
        // Movilidad pura (blink): escape sin objetivo.
        spend();
        if (skill.dash === "away") this.dashAway(p, skill.dashRange);
        applyCleanse();
        this.broadcast(MessageType.SkillCast, { casterId: client.sessionId, skillId: skill.id, targetId: "" });
      } else if (skill.type === "dot") {
        // DoT skill: requires mob target in range (mismo mapa)
        const mob = p.targetId ? this.state.mobs.get(p.targetId) : undefined;
        if (!mob || mob.dead || mob.mapId !== p.mapId) return;
        if (!canAttack(p, mob, ATTACK_RANGE)) return;
        spend();
        mob.dotMs = skill.dotMs ?? 0;
        mob.dotDps = skill.dotDps ?? 0;
        mob.dotAttackerId = client.sessionId;
        mob.dotAccumMs = 0;
        this.markCombat(p);
        this.broadcast(MessageType.SkillCast, { casterId: client.sessionId, skillId: skill.id, targetId: p.targetId });
      }
    });

    // Etapa 4b-1 / 20: interacción con NPCs, ruteada por npcId. El pueblo es un
    // mapa seguro entero; la cercanía a los servicios se mide contra su centro.
    this.onMessage(MessageType.InteractNpc, (client, msg: InteractNpcMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      if (distance2D(p.x, p.z, TOWN.x, TOWN.z) > TOWN_SERVICE_RADIUS) return;

      const npcId = msg?.npcId ?? "elder";
      if (npcId === "healer") { this.serveHealer(p); return; }
      if (npcId === "captain") { this.serveCaptain(p, client); return; }
      // Por defecto: el Anciano (campaña principal).
      this.serveElder(p, client);
    });

    // Etapa 4b-2: handler de compra en el mercader
    this.onMessage(MessageType.BuyItem, (client, msg: BuyItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;

      // Gate de proximidad al pueblo (igual que interactNpc)
      if (distance2D(p.x, p.z, TOWN.x, TOWN.z) > TOWN_SERVICE_RADIUS) return;

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

    // Etapa 9b: handlers de guild (crear/unirse/salir)
    this.onMessage(MessageType.CreateGuild, (client, msg: CreateGuildMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.guildId !== "") return;
      const name = (msg?.name ?? "").trim();
      const tag = (msg?.tag ?? "").trim().toUpperCase();
      if (!isValidGuildName(name) || !isValidGuildTag(tag)) return;
      let taken = false;
      this.state.guilds.forEach((g) => { if (g.tag === tag) taken = true; });
      if (taken) return;
      const id = `${tag.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
      const g = new GuildState();
      g.id = id; g.name = name; g.tag = tag; g.leaderName = p.name; g.bossKills = 0;
      this.state.guilds.set(id, g);
      p.guildId = id; p.guildName = name; p.guildTag = tag;
      this.persistence.saveGuild({ id, name, tag, leaderName: p.name, bossKills: 0 })
        .catch((e) => console.error("[aden] saveGuild fail", id, e));
    });

    this.onMessage(MessageType.JoinGuild, (client, msg: JoinGuildMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.guildId !== "") return;
      const g = this.state.guilds.get(msg?.guildId ?? "");
      if (!g) return;
      p.guildId = g.id; p.guildName = g.name; p.guildTag = g.tag;
    });

    this.onMessage(MessageType.LeaveGuild, (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.guildId === "") return;
      const gid = p.guildId;
      p.guildId = ""; p.guildName = ""; p.guildTag = "";
      this.pruneGuildIfEmpty(gid);
    });

    // Etapa 12: equipar un ítem del inventario en su slot (arma/armadura/accesorio).
    this.onMessage(MessageType.EquipItem, (client, msg: EquipItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      const id = msg?.itemTemplateId;
      if (!id) return;
      let item;
      try { item = getItem(id); } catch { return; }
      if (item.type !== "equipment" || !item.slot) return;
      const inv = p.inventory.get(id);
      if (!inv || inv.qty < 1) return;
      // Sacar uno del inventario.
      inv.qty -= 1;
      if (inv.qty <= 0) p.inventory.delete(id);
      // Si el slot ya tenía algo, vuelve al inventario (swap).
      const prev = p.equipment.get(item.slot);
      if (prev) this.addToInventory(p, prev, 1);
      p.equipment.set(item.slot, id);
      this.recomputeStats(p);
      this.checkAchievements(p, client.sessionId); // p.ej. equipar un legendario
    });

    // Etapa 12: desequipar el slot dado → el ítem vuelve al inventario.
    this.onMessage(MessageType.UnequipItem, (client, msg: UnequipItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const slot = msg?.slot;
      if (!slot) return;
      const cur = p.equipment.get(slot);
      if (!cur) return;
      p.equipment.delete(slot);
      this.addToInventory(p, cur, 1);
      this.recomputeStats(p);
    });

    // Etapa 13: lucir un título desbloqueado ("" = ninguno).
    this.onMessage(MessageType.SetTitle, (client, msg: SetTitleMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const title = msg?.title ?? "";
      if (!isValidTitle(title)) return;
      // Sólo puede lucir un título de un logro que ya desbloqueó (o "").
      if (title !== "" && ![...p.achievements].some((id) => {
        try { return getAchievement(id).title === title; } catch { return false; }
      })) return;
      p.title = title;
    });

    // Etapa 15: viajar a un mapa (menú M). Validado por nivel; teletransporta al spawn.
    this.onMessage(MessageType.WarpTo, (client, msg: WarpToMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      let zone;
      try { zone = getZone(msg?.mapId ?? ""); } catch { return; }
      if (zone.id === p.mapId) return; // ya estás ahí
      if (!canEnterZone(zone, p.level)) return; // nivel insuficiente
      p.mapId = zone.id;
      p.x = p.targetX = zone.spawn.x;
      p.z = p.targetZ = zone.spawn.z;
      p.moving = false;
      p.targetId = "";
    });

    // Etapa 16: interactuar con un objeto de mundo (cofre / barril / santuario).
    this.onMessage(MessageType.InteractObject, (client, msg: InteractObjectMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      const o = this.state.worldObjects.get(msg?.objectId ?? "");
      if (!o || !o.active || o.mapId !== p.mapId) return;
      if (distance2D(p.x, p.z, o.x, o.z) > OBJECT_INTERACT_RANGE) return;
      let def;
      try { def = getWorldObject(o.id); } catch { return; }
      if (o.kind === "shrine") {
        // Bendición temporal (reusa el sistema de buffs de skills).
        if (def.buff === "atk") { p.atkBuffMs = SHRINE_BUFF_MS; p.atkBuffMult = SHRINE_BUFF_MULT; }
        else { p.defBuffMs = SHRINE_BUFF_MS; p.defBuffMult = SHRINE_BUFF_MULT; }
      } else if (def.lootId) {
        this.dropLoot(def.lootId, o.x, o.z, o.mapId);
      }
      o.active = false;
      o.respawnMs = objectRespawnMs(def.kind);
    });

    // Etapa 21: gastar un punto de atributo (Fuerza/Agilidad/Vitalidad/Energía).
    this.onMessage(MessageType.AllocateStat, (client, msg: AllocateStatMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (p.statPoints <= 0) return;
      const attr = msg?.attr ?? "";
      if (!isValidAttribute(attr)) return;
      p[attr as Attribute] += 1;
      p.statPoints -= 1;
      this.recomputeStats(p);
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  /** Etapa 22: marca a un jugador como "en combate" (corta la regen de HP 5 s). */
  private markCombat(p: PlayerState): void {
    p.msSinceCombat = 0;
  }

  /** Etapa 22: enganche — acerca al caster a rango de ataque del objetivo (clamp a bounds). */
  private dashToTarget(p: PlayerState, tx: number, tz: number): void {
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const stop = Math.max(0, d - ATTACK_RANGE * 0.8);
    const raw = { x: p.x + (dx / d) * stop, z: p.z + (dz / d) * stop };
    const c = clampToBounds(raw.x, raw.z, getZone(p.mapId).bounds);
    p.x = p.targetX = c.x;
    p.z = p.targetZ = c.z;
    p.moving = false;
  }

  /** Etapa 22: escape — aleja al caster de su objetivo (o hacia atrás si no hay), clamp a bounds. */
  private dashAway(p: PlayerState, range = 8): void {
    let dirX = 0, dirZ = -1;
    const t = p.targetId ? this.resolveTarget(p.targetId, p.mapId) : null;
    if (t) {
      const dx = p.x - t.entity.x, dz = p.z - t.entity.z;
      const d = Math.hypot(dx, dz) || 1;
      dirX = dx / d; dirZ = dz / d;
    }
    const c = clampToBounds(p.x + dirX * range, p.z + dirZ * range, getZone(p.mapId).bounds);
    p.x = p.targetX = c.x;
    p.z = p.targetZ = c.z;
    p.moving = false;
  }

  /** Anciano Rowan: campaña principal (asignar / entregar / avanzar). */
  private serveElder(p: PlayerState, client: Client): void {
    if (p.questId === "") {
      p.questId = firstQuestId();
      p.questProgress = 0;
      return;
    }
    try {
      const q = getQuest(p.questId);
      if (p.questProgress >= q.amount) {
        this.grantExp(p, client, q.rewardExp);
        p.gold += q.rewardGold;
        // Etapa 21: la misión puede entregar una pieza de equipo.
        if (q.rewardItemId) {
          this.addToInventory(p, q.rewardItemId, 1);
          this.checkAchievements(p, client.sessionId);
        }
        p.questId = nextQuestId(p.questId);
        p.questProgress = 0;
      }
    } catch { /* quest desconocida: ignorar */ }
  }

  /** Sanadora: restaura HP y MP a full por oro (no-op si ya está full o falta oro). */
  private serveHealer(p: PlayerState): void {
    if (p.hp >= p.maxHp && p.mp >= p.maxMp) return;
    if (p.gold < HEAL_COST_GOLD) return;
    p.gold -= HEAL_COST_GOLD;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }

  /** Capitán de la Guardia: contratos repetibles (asignar / entregar / rotar). */
  private serveCaptain(p: PlayerState, client: Client): void {
    if (p.bountyId === "") {
      p.bountyId = firstBountyId();
      p.bountyProgress = 0;
      return;
    }
    try {
      const b = getBounty(p.bountyId);
      if (p.bountyProgress >= b.amount) {
        this.grantExp(p, client, b.rewardExp);
        p.gold += b.rewardGold;
        p.bountyId = nextBountyId(p.bountyId);
        p.bountyProgress = 0;
      }
    } catch { /* contrato desconocido: ignorar */ }
  }

  /** Otorga EXP a un jugador y envía LevelUp si sube de nivel (Etapa 4b-1: reutilizable en quests). */
  private grantExp(player: PlayerState, client: Client, amount: number) {
    const before = player.level;
    const lvls = gainExp(player, amount, player.className);
    if (lvls > 0) {
      // Etapa 21: cada nivel otorga puntos de atributo para repartir.
      player.statPoints += lvls * POINTS_PER_LEVEL;
      // gainExp resetea los stats a la base de clase/nivel; re-aplicar equipo + atributos
      // y rellenar HP/MP al nuevo máximo (que incluye equipo y atributos).
      this.recomputeStats(player);
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      // Etapa 22: skills recién aprendidos entre el nivel anterior y el nuevo.
      const learned: string[] = [];
      for (let lv = before + 1; lv <= player.level; lv++) learned.push(...newSkillsAtLevel(player.className, lv));
      client.send(MessageType.LevelUp, { level: player.level, learned });
    }
  }

  /** Crea (o resetea al respawnear) un mob con posición/home/target y stats de combate. */
  spawnMob(id: string, templateId: string, x: number, z: number, mapId: string): MobState {
    const mob = this.state.mobs.get(id) ?? new MobState();
    mob.templateId = templateId;
    mob.mapId = mapId;
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
    mob.windupMs = 0;
    mob.windupTargetId = "";
    mob.stunMs = 0;
    mob.rootMs = 0;
    mob.dotMs = 0;

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

      // Etapa 20: progreso del contrato del Capitán (se entrega hablando con él).
      if (killer.bountyId !== "") {
        try {
          const b = getBounty(killer.bountyId);
          if ((b.mobTemplateId === "" || b.mobTemplateId === mob.templateId) && killer.bountyProgress < b.amount) {
            killer.bountyProgress++;
          }
        } catch {
          // Contrato desconocido, ignorar
        }
      }

      // Etapa 9c: crédito de guild por matar al jefe (last-hit)
      if (isBoss(mob.templateId) && killer.guildId !== "") {
        const g = this.state.guilds.get(killer.guildId);
        if (g) {
          g.bossKills += 1;
          this.persistence
            .saveGuild({ id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills })
            .catch((e) => console.error("[aden] saveGuild fail", g.id, e));
          this.broadcast(MessageType.BossKilled, {
            bossName: getTemplate(mob.templateId).name,
            guildTag: g.tag,
            guildName: g.name,
          });
        }
      }

      // Etapa 13: retención — kills totales, jefes abatidos, progreso de la diaria y logros.
      killer.totalKills += 1;
      if (isBoss(mob.templateId)) killer.bossKills += 1;
      if (killer.dailyQuestId !== "" && !killer.dailyDone) {
        try {
          const dq = getDailyQuest(killer.dailyQuestId);
          if (dq.mobTemplateId === "" || dq.mobTemplateId === mob.templateId) {
            killer.dailyProgress++;
            if (killer.dailyProgress >= dq.amount) {
              killer.dailyDone = true;
              killer.gold += dq.rewardGold;
              const client = this.clients.find((c) => c.sessionId === killerId);
              if (client) {
                this.grantExp(killer, client, dq.rewardExp);
                client.send(MessageType.DailyComplete, { rewardGold: dq.rewardGold, rewardExp: dq.rewardExp });
              }
            }
          }
        } catch { /* diaria desconocida: ignorar */ }
      }
      if (killerId) this.checkAchievements(killer, killerId);
    }

    // Etapa 14: evento de mundo — el jefe cae (anuncio server-wide, cualquiera lo haya matado).
    if (isBoss(mob.templateId)) {
      this.broadcast(MessageType.WorldAnnounce, { text: "💀 ¡El Rey Nihil ha caído!" });
    }

    // Loot (R-E3b-2): rodar drop table del mob y crear ítems en el piso con scatter.
    this.dropLoot(mob.templateId, mob.x, mob.z, mob.mapId);
  }

  /** Rueda una tabla de loot y deja los ítems en el piso (mobs y objetos de mundo). */
  private dropLoot(lootId: string, x: number, z: number, mapId: string): void {
    for (const d of rollDrops(lootId, Math.random)) {
      const item = new DroppedItemState();
      item.itemTemplateId = d.itemTemplateId;
      item.qty = d.qty;
      item.mapId = mapId;
      item.x = x + (Math.random() - 0.5) * 1.5;
      item.z = z + (Math.random() - 0.5) * 1.5;
      item.despawnMs = DROP_DESPAWN_MS;
      item.pickDelayMs = PICKUP_DELAY_MS; // visible al caer, no pickable hasta que expire
      this.state.droppedItems.set(`${lootId}_${d.itemTemplateId}_${this.dropSeq++}`, item);
    }
  }

  tick(dt: number) {
    this.state.players.forEach((p) => {
      if (p.dead) return; // un jugador muerto no se mueve
      if (p.stunMs > 0 || p.rootMs > 0) { p.moving = false; return; } // Etapa 22: aturdido/enraizado no se mueve
      advanceMovable(p, dt);
    });

    // Etapa 15: aggro por MAPA — un mob sólo persigue jugadores vivos de su mismo mapa.
    // Se agrupan los jugadores vivos por mapId una vez por tick.
    const playersByMap = new Map<string, { id: string; x: number; z: number }[]>();
    this.state.players.forEach((p, id) => {
      if (p.dead) return;
      const arr = playersByMap.get(p.mapId) ?? [];
      arr.push({ id, x: p.x, z: p.z });
      playersByMap.set(p.mapId, arr);
    });
    const dtMs = dt * 1000;
    this.state.mobs.forEach((mob) => {
      if (mob.dead) return; // R-E2b1-3: un mob muerto no deambula ni persigue
      if (mob.windupMs > 0) {
        mob.moving = false;
        return; // Plantado mientras carga el ataque
      }
      if (mob.stunMs > 0) { mob.moving = false; return; } // Etapa 22: aturdido no actúa
      stepMobAI(mob, playersByMap.get(mob.mapId) ?? [], AI_CONFIG, Math.random, dtMs);
      if (mob.rootMs > 0) mob.moving = false; else advanceMovable(mob, dt, MOB_MOVE_SPEED); // enraizado no se mueve
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

      // Etapa 22: decremento de control (stun/root).
      if (p.stunMs > 0) p.stunMs = Math.max(0, p.stunMs - dtMs);
      if (p.rootMs > 0) p.rootMs = Math.max(0, p.rootMs - dtMs);

      // Etapa 22: regeneración de recursos (mantiene HP/MP enteros con acumuladores).
      p.msSinceCombat += dtMs;
      if (!p.dead) {
        if (p.mp < p.maxMp) {
          p.mpRegenAcc += Math.max(2, p.maxMp * 0.04) * dt;
          const add = Math.floor(p.mpRegenAcc);
          if (add > 0) { p.mp = Math.min(p.maxMp, p.mp + add); p.mpRegenAcc -= add; }
        } else {
          p.mpRegenAcc = 0;
        }
        // HP regenera sólo fuera de combate reciente (5 s sin dar/recibir daño).
        if (p.hp < p.maxHp && p.msSinceCombat >= 5000) {
          p.hpRegenAcc += Math.max(1, p.maxHp * 0.015) * dt;
          const add = Math.floor(p.hpRegenAcc);
          if (add > 0) { p.hp = Math.min(p.maxHp, p.hp + add); p.hpRegenAcc -= add; }
        } else {
          p.hpRegenAcc = 0;
        }
      }
    });

    // auto-attack del jugador sobre su target
    this.state.players.forEach((p, sessionId) => {
      if (p.dead || !p.targetId) return;
      const t = this.resolveTarget(p.targetId, p.mapId);
      if (!t) { p.targetId = ""; return; }
      if (t.kind === "mob") {
        const mob = t.entity;
        if (canAttack(p, mob, ATTACK_RANGE)) {
          const variance = 0.9 + Math.random() * 0.2;
          const dmg = resolveAttack(p, mob, 1, variance, getClass(p.className).base.attackCooldownMs);
          this.markCombat(p);
          this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
          if (mob.hp <= 0) this.killMob(mob, p.targetId, sessionId);
        }
      } else {
        // PvP: ambos fuera del pueblo
        const victim = t.entity;
        if (p.guildId !== "" && p.guildId === victim.guildId) return; // aliados no se pegan
        if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
        if (canAttack(p, victim, ATTACK_RANGE)) {
          const variance = 0.9 + Math.random() * 0.2;
          const dmg = resolveAttack(p, victim, 1, variance, getClass(p.className).base.attackCooldownMs);
          this.markCombat(p);
          this.markCombat(victim);
          this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: victim.hp });
          if (victim.hp <= 0) this.killPlayer(victim, p.targetId, sessionId);
        }
      }
    });

    // ataque de mobs sobre el jugador que persiguen — dos fases: wind-up + impacto
    this.state.mobs.forEach((mob, mobId) => {
      if (mob.dead) return;
      // Etapa 22: un mob aturdido no ataca y se le cancela el wind-up en curso.
      if (mob.stunMs > 0) { mob.windupMs = 0; mob.windupTargetId = ""; return; }

      // Fase 2: resolver un wind-up en curso
      if (mob.windupMs > 0) {
        mob.windupMs = Math.max(0, mob.windupMs - dtMs);
        if (mob.windupMs > 0) return; // sigue cargando
        const targetId = mob.windupTargetId;
        mob.windupTargetId = "";
        mob.attackCooldownMs = getMobCombat(mob.templateId).attackCooldownMs; // cooldown tras el swing
        const target = this.state.players.get(targetId);
        if (!target || target.dead || target.mapId !== mob.mapId) return; // se fue del mapa (warp) o murió
        if (distance2D(mob.x, mob.z, target.x, target.z) > ATTACK_RANGE) {
          // esquivado: fuera de rango al impacto
          this.broadcast(MessageType.Damage, { attackerId: mobId, targetId, amount: 0, hp: target.hp, dodged: true });
          return;
        }
        const variance = 0.9 + Math.random() * 0.2;
        // daño con def efectiva del jugador (buff): reusar computeDamage
        const defMult = (target.defBuffMs > 0) ? target.defBuffMult : 1;
        const dmg = computeDamage(mob.pAtk, target.pDef * defMult, 1, variance);
        target.hp = Math.max(0, target.hp - dmg);
        this.markCombat(target);
        this.broadcast(MessageType.Damage, { attackerId: mobId, targetId, amount: dmg, hp: target.hp });
        if (target.hp <= 0) {
          target.dead = true;
          target.moving = false;
          target.respawnMs = PLAYER_RESPAWN_MS;
          target.targetId = "";
          this.broadcast(MessageType.Death, { entityId: targetId });
        }
        return;
      }

      // Fase 1: iniciar wind-up
      if (!mob.aggroTargetId) return;
      const player = this.state.players.get(mob.aggroTargetId);
      if (!player || player.dead) return;
      if (mob.attackCooldownMs > 0) return;
      if (distance2D(mob.x, mob.z, player.x, player.z) > ATTACK_RANGE) return;
      mob.windupMs = ATTACK_WINDUP_MS;
      mob.windupTargetId = mob.aggroTargetId;
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
    this.state.players.forEach((p, sessionId) => {
      if (p.dead) return; // un jugador muerto no recoge ítems
      const pickupIds: string[] = [];
      this.state.droppedItems.forEach((it, id) => {
        // sólo pickable si ya pasó el delay, es del mismo mapa y está en rango
        if (it.pickDelayMs <= 0 && it.mapId === p.mapId && distance2D(p.x, p.z, it.x, it.z) <= PICKUP_RANGE) pickupIds.push(id);
      });
      let pickedItem = false;
      for (const id of pickupIds) {
        const it = this.state.droppedItems.get(id);
        if (!it) continue; // ya recogido/despawneado en este mismo tick

        // Etapa 4b-1: oro como moneda (currency → gold, no al inventario)
        const itemDef = getItem(it.itemTemplateId);
        if (itemDef.type === "currency") {
          p.gold += it.qty;
        } else {
          this.addToInventory(p, it.itemTemplateId, it.qty);
          pickedItem = true;
        }
        this.state.droppedItems.delete(id);
      }
      // Etapa 13: recoger un ítem (p.ej. un legendario) puede desbloquear un logro.
      if (pickedItem) this.checkAchievements(p, sessionId);
    });

    // cooldowns/respawn de mobs
    this.state.mobs.forEach((mob, id) => {
      tickCooldown(mob, dtMs);
      // Etapa 22: decremento de control del mob.
      if (mob.stunMs > 0) mob.stunMs = Math.max(0, mob.stunMs - dtMs);
      if (mob.rootMs > 0) mob.rootMs = Math.max(0, mob.rootMs - dtMs);
      if (mob.dead) {
        mob.respawnMs -= dtMs;
        if (mob.respawnMs <= 0) {
          const wasBoss = isBoss(mob.templateId);
          this.spawnMob(id, mob.templateId, mob.homeX, mob.homeZ, mob.mapId);
          // Etapa 14: evento de mundo — el jefe reaparece (carrera al Trono).
          if (wasBoss) this.broadcast(MessageType.WorldAnnounce, { text: "⚔ ¡El Rey Nihil ha despertado en su Trono!" });
        }
      }
    });

    // Etapa 16: reactivar objetos de mundo usados (cofre reaparece, barril se regenera,
    // santuario sale de cooldown).
    this.state.worldObjects.forEach((o) => {
      if (o.active) return;
      o.respawnMs -= dtMs;
      if (o.respawnMs <= 0) o.active = true;
    });

    // respawn del jugador en el pueblo
    this.state.players.forEach((p) => {
      if (!p.dead) return;
      p.respawnMs -= dtMs;
      if (p.respawnMs <= 0) {
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        p.dead = false;
        p.stunMs = 0; // Etapa 22: respawn limpio de control
        p.rootMs = 0;
        p.msSinceCombat = 100000;
        // Etapa 15: respawnea en el punto de spawn de su mapa actual.
        const sp = getZone(p.mapId).spawn;
        p.x = p.targetX = sp.x;
        p.z = p.targetZ = sp.z;
        p.moving = false;
        p.targetId = "";
      }
    });
  }

  /**
   * Etapa 21: autenticación. El nombre ES la cuenta. El cliente indica el `mode`:
   *  - "login": la cuenta DEBE existir y la contraseña coincidir → cargás tu personaje.
   *  - "create": el nombre NO debe estar tomado → registra la cuenta nueva.
   * Sin `mode` (compat/tests): comportamiento tolerante (verifica si existe, registra
   * si no). Devuelve truthy para permitir el join; lanzar rechaza con el mensaje.
   */
  async onAuth(_client: Client, options: { name?: string; password?: string; className?: string; mode?: string }) {
    const name = (options?.name ?? "").trim();
    const password = options?.password ?? "";
    const mode = options?.mode ?? "";
    if (name.length < 1 || name.length > 16) throw new Error("Nombre inválido (1-16 caracteres).");
    const acct = await this.persistence.loadAccount(name);
    const hasAccount = !!(acct && acct.passwordHash);

    if (mode === "login") {
      // Volver a entrar: la cuenta tiene que existir y la contraseña coincidir.
      if (!hasAccount || !verifyPassword(password, acct!.passwordHash, acct!.passwordSalt)) {
        throw new Error("No existe esa cuenta o la contraseña es incorrecta.");
      }
    } else if (mode === "create") {
      // Crear personaje: el nombre no puede estar tomado.
      if (hasAccount) throw new Error("Ese nombre ya está en uso. Usá «Entrar».");
      if (password.length < 4) throw new Error("La contraseña necesita al menos 4 caracteres.");
      const { hash, salt } = hashPassword(password);
      await this.persistence.saveAccount({ name, passwordHash: hash, passwordSalt: salt });
    } else {
      // Sin modo explícito (compat/tests): verifica si existe, registra si no.
      if (hasAccount) {
        if (!verifyPassword(password, acct!.passwordHash, acct!.passwordSalt)) {
          throw new Error("Contraseña incorrecta.");
        }
      } else if (password.length >= 4) {
        const { hash, salt } = hashPassword(password);
        await this.persistence.saveAccount({ name, passwordHash: hash, passwordSalt: salt });
      }
    }
    // Precargar el personaje guardado (si existe) para que onJoin lo aplique de forma
    // SÍNCRONA antes de insertar al jugador → el primer snapshot ya trae la clase/stats
    // correctas (sin el parpadeo "knight" del load async) y sin la race save-before-load.
    const save = await this.persistence.load(name);
    return { name, save };
  }

  async onJoin(client: Client, options: { name?: string; className?: string }) {
    // Save precargado por onAuth (síncrono acá). En login trae la clase real del
    // personaje; en create es null y se usa la clase elegida.
    const preSave = (client.auth as { save?: CharacterSave | null } | undefined)?.save ?? null;
    const player = new PlayerState();
    player.name = options?.name ?? "Adventurer";
    const className = preSave?.className && isValidClass(preSave.className)
      ? preSave.className
      : (isValidClass(options?.className) ? options.className! : "knight");
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
    player.pvpKills = 0;
    player.guildId = "";
    player.guildTag = "";
    player.guildName = "";
    // Etapa 15: arranca en el pueblo, en su punto de spawn.
    player.mapId = TOWN_ZONE_ID;
    const townSpawn = getZone(TOWN_ZONE_ID).spawn;
    player.x = player.targetX = townSpawn.x;
    player.z = player.targetZ = townSpawn.z;
    this.state.players.set(client.sessionId, player);

    // Etapa 3c/21: el save ya viene precargado por onAuth (client.auth) → se aplica de
    // forma síncrona, sin segunda lectura ni race save-before-load.
    const save = preSave;
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
      // Etapa 15: restaurar el mapa (si es válido) y aterrizar en su punto de spawn.
      let loadedMap = save.mapId ?? TOWN_ZONE_ID;
      try { getZone(loadedMap); } catch { loadedMap = TOWN_ZONE_ID; }
      player.mapId = loadedMap;
      const sp = getZone(loadedMap).spawn;
      player.x = player.targetX = sp.x;
      player.z = player.targetZ = sp.z;
      player.gold = save.gold ?? 0;
      player.questId = save.questId ?? firstQuestId();
      player.questProgress = save.questProgress ?? 0;
      player.pvpKills = save.pvpKills ?? 0;
      player.guildId = save.guildId ?? "";
      player.guildName = save.guildName ?? "";
      player.guildTag = save.guildTag ?? "";
      for (const [id, qty] of inventoryRecordToEntries(save.inventory)) {
        const it = new InventoryItemState();
        it.itemTemplateId = id;
        it.qty = qty;
        player.inventory.set(id, it);
      }
      // Etapa 12: restaurar el equipo.
      for (const [slot, itemId] of Object.entries(save.equipment ?? {})) {
        if (itemId) player.equipment.set(slot, itemId);
      }
      // Etapa 13: restaurar el estado de retención (racha/diaria/logros/título).
      const pr = save.progress;
      if (pr) {
        player.loginStreak = pr.loginStreak ?? 0;
        player.lastLoginDay = pr.lastLoginDay ?? "";
        player.dailyQuestId = pr.dailyQuestId ?? "";
        player.dailyProgress = pr.dailyProgress ?? 0;
        player.dailyDone = pr.dailyDone ?? false;
        player.totalKills = pr.totalKills ?? 0;
        player.bossKills = pr.bossKills ?? 0;
        player.title = pr.title ?? "";
        for (const id of pr.achievements ?? []) player.achievements.push(id);
        // Etapa 20: contrato activo del Capitán.
        player.bountyId = pr.bountyId ?? "";
        player.bountyProgress = pr.bountyProgress ?? 0;
        // Etapa 21: atributos asignados. statPoints se DERIVA del nivel (invariante:
        // total por nivel − gastados), así los personajes viejos reciben sus puntos
        // retroactivamente y nunca queda desincronizado.
        player.str = pr.str ?? 0;
        player.agi = pr.agi ?? 0;
        player.vit = pr.vit ?? 0;
        player.ene = pr.ene ?? 0;
      }
      player.statPoints = Math.max(0, pointsForLevel(player.level) - (player.str + player.agi + player.vit + player.ene));
      // Recalcular stats con clase/nivel + equipo + atributos, y rellenar HP/MP.
      this.recomputeStats(player);
      player.hp = player.maxHp;
      player.mp = player.maxMp;
    }

    // Etapa 3c (fix race save-before-load): recién ahora, con el save (si existía) ya
    // aplicado por completo, el jugador es seguro de persistir. Antes de esta línea,
    // saveAll()/onLeave() deben ignorarlo para no pisar el registro real con defaults
    // de nivel 1 (ver guardas en saveAll y onLeave).
    player.loaded = true;

    // Etapa 9b: si el jugador tiene guild pero no hay ninguna instancia online (todos los
    // demás miembros están desconectados), reconstruir la GuildState viva desde el save.
    if (player.guildId !== "" && !this.state.guilds.has(player.guildId)) {
      const row = await this.persistence.loadGuild(player.guildId);
      const g = new GuildState();
      g.id = player.guildId;
      g.name = row?.name ?? player.guildName;
      g.tag = row?.tag ?? player.guildTag;
      g.leaderName = row?.leaderName ?? player.name;
      g.bossKills = row?.bossKills ?? 0;
      this.state.guilds.set(player.guildId, g);
    }

    // Etapa 13: rollover diario (racha + diaria + recompensa) y chequeo de logros
    // ya cargados. Corre para personajes nuevos (lastLoginDay "") y existentes.
    this.handleDailyRollover(player, client);
    this.checkAchievements(player, client.sessionId);
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
    const gid = player?.guildId ?? "";
    this.state.players.delete(client.sessionId);
    if (gid !== "") this.pruneGuildIfEmpty(gid);
  }
}
