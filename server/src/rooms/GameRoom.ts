import { pvePower, getNpc, potionResource, getEncounter, encounterInterruptFor, travelLockRemainingMs, travelLockText, chapterAfter, isChapterComplete, mapGate, questReached } from "@aden/shared";
import { potionRecovery } from '../systems/PotionRecovery.js';
import { getSideChain, sideChainForNpc, sideChainStep, nextSideChainStep, type SideChainDef } from '@aden/shared';
import { tryPickup, dropPosition, tryDropInventory } from '../systems/LootSystem.js';
import { TradeSystem } from '../systems/TradeSystem.js';
import { characterGender, isCharacterGender } from '@aden/shared';
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
import { randomUUID } from 'node:crypto';
import { catalogDropPool, dungeonReward, questReward, createItemInstance } from '@aden/shared';
import { advanceQuest, advanceDungeonKill, activateSeal, canFightDungeonMob, resetDungeon } from '../systems/AdventureSystem.js';
import { stepEncounter } from '../systems/EncounterSystem.js';
const { Room } = colyseusPkg;
import {
  MessageType,
  skillRange,
  type SkillCastEvent,
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
  nearestWalkable,
  clipMovement,
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
  loadoutEffects, availableSkills, weaponRange, CATALOG_ITEMS, MOVE_SPEED, skillElement,
} from "@aden/shared";
import { grantItem, equipItem, useInventoryItem, consumeAmmo, playerLoadout, instantiateItem } from '../systems/ItemSystem.js';
import { GameState } from "../state/GameState.js";
import { PlayerState } from "../state/PlayerState.js";
import { SideChainState } from "../state/SideChainState.js";
import { MobState } from "../state/MobState.js";
import { DroppedItemState } from "../state/DroppedItemState.js";
import { GuildState } from "../state/GuildState.js";
import { PartySystem } from '../systems/PartySystem.js';
import { ChatSystem } from '../systems/ChatSystem.js';
import { CHAT_LOCAL_RANGE, type ChatMessage } from '@aden/shared';
import { PARTY_REWARD_RANGE } from '@aden/shared';
import { WorldObjectState } from "../state/WorldObjectState.js";
import { InventoryItemState } from "../state/InventoryItemState.js";
import { LeaderPlayerEntry, LeaderGuildEntry } from "../state/LeaderboardState.js";
import { advanceMovable } from "@aden/shared";
import { createSpawns } from "../systems/SpawnSystem.js";
import { stepMobAI } from "../systems/MobAISystem.js";
import { canAttack, inSkillRange, resolveAttack, tickCooldown } from "../systems/CombatSystem.js";
import { createPersistence } from "../persistence/createPersistence.js";
import { CharacterSaveQueue } from '../persistence/CharacterSaveQueue.js';
import type { PersistenceService, CharacterRank, GuildRank } from "../persistence/PersistenceService.js";
import { toCharacterSave, inventoryRecordToEntries, sideChainsFromSave, type CharacterSave } from "../persistence/CharacterSave.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

/** Intervalo de guardado periódico de personajes (Etapa 3c). */
const SAVE_INTERVAL_MS = 15000;
const GLOBAL_CHAT_TOPIC = 'aden:chat:global';

export class GameRoom extends Room<GameState> {
  private static readonly activeAccounts=new Map<string,string>();
  private readonly accountNames=new Map<string,string>();
  private readonly departedAccounts=new Map<string,string>();
  private saveQueue!:CharacterSaveQueue;
  private holdingForSave=false;
  private readonly chat = new ChatSystem();
  private readonly deliverGlobalChat = (message: ChatMessage): void => {
    for (const client of this.clients) {
      if (this.state.players.get(client.sessionId)?.loaded) client.send(MessageType.ChatMessage, message);
    }
  };
  private parties!: PartySystem;
  private trades!: TradeSystem;
  /** Contador para generar ids únicos de ítems dropeados (R-E3b-3). */
  private dropSeq = 0;
  /** Contador para ids únicos de invocaciones de encuentros. */
  private summonSeq = 0;
  private dungeonActive = false;
  private readonly dungeonRun = { mapId: 'cripta', dead: false, dungeonStage: 0, dungeonKills: 0 };

  private syncDungeonRun(): void {
    this.state.players.forEach(p => {
      if(p.mapId !== 'cripta')return;
      p.dungeonStage=this.dungeonRun.dungeonStage;
      p.dungeonKills=this.dungeonRun.dungeonKills;
    });
  }

  /** A cleared wing stays cleared until the last participant leaves. */
  private maintainDungeonRun(): void {
    const occupied=[...this.state.players.values()].some(p=>p.mapId==='cripta' && !p.dead);
    if(occupied){this.dungeonActive=true;this.syncDungeonRun();return;}
    if(!this.dungeonActive)return;
    this.dungeonActive=false;
    resetDungeon(this.dungeonRun);
    this.state.mobs.forEach((mob,id)=>{
      if(mob.mapId==='cripta')this.spawnMob(id,mob.templateId,mob.homeX,mob.homeZ,mob.mapId);
    });
    for(const [id,item] of this.state.droppedItems)if(item.mapId==='cripta')this.state.droppedItems.delete(id);
    this.state.worldObjects.forEach(o=>{if(o.mapId==='cripta'){o.active=true;o.respawnMs=0;}});
  }
  /** Servicio de persistencia de personajes (Supabase si hay env, si no in-memory). */
  private persistence!: PersistenceService;

  /** Agrega ítems al inventario del jugador (reutilizable en compra y pickup). */
  private addToInventory(player: PlayerState, itemTemplateId: string, qty: number): void {
    grantItem(player,itemTemplateId,qty);
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
    const effects = loadoutEffects(equipped);
    p.itemEffects = effects;
    p.moveSpeed = MOVE_SPEED * (1 + effects.moveSpeed);
    p.appearanceModel=equipped.ring && getItem(equipped.ring).ref_origen==='transformation_ring'?'DeathWraith':'';
    // Etapa 21: bonus de atributos primarios asignados (str/agi/vit/ene).
    const attr = attributeBonuses({ str: p.attributes.str, agi: p.attributes.agi, vit: p.attributes.vit, ene: p.attributes.ene });
    p.maxHp = Math.round((base.maxHp + bonus.maxHp + attr.maxHp) * (1+effects.hpPct));
    p.maxMp = Math.round((base.maxMp + bonus.maxMp + attr.maxMp) * (1+effects.mpPct));
    p.pAtk = Math.round((base.pAtk + bonus.pAtk + attr.pAtk + p.level*effects.levelAttack)*(1+effects.attackPct));
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
      totalKills: p.retention.totalKills,
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
    p.retention.loginStreak = (p.lastLoginDay === previousDay(today)) ? p.retention.loginStreak + 1 : 1;
    p.lastLoginDay = today;
    const daily = dailyQuestForDay(today);
    p.retention.dailyQuestId = daily.id;
    p.retention.dailyProgress = 0;
    p.retention.dailyDone = false;
    const reward = streakReward(p.retention.loginStreak);
    p.gold += reward;
    client.send(MessageType.DailyReset, { streak: p.retention.loginStreak, reward, dailyDesc: daily.desc });
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
    resetDungeon(victim);
    const leftDungeon=victim.mapId==='cripta';
    victim.dead = true;
    victim.moving = false;
    victim.respawnMs = PLAYER_RESPAWN_MS;
    victim.targetId = "";
    this.broadcast(MessageType.Death, { entityId: victimId });
    if(leftDungeon){
      victim.mapId=TOWN_ZONE_ID;
      const arrival=nearestWalkable(TOWN_ZONE_ID,getZone(TOWN_ZONE_ID).spawn);
      victim.x=victim.targetX=arrival.x;victim.z=victim.targetZ=arrival.z;
      this.maintainDungeonRun();
    }
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

  async onCreate() {
    this.setState(new GameState());
    await this.presence.subscribe(GLOBAL_CHAT_TOPIC, this.deliverGlobalChat);
    this.onMessage(MessageType.ChatSend, async (client, payload: unknown) => {
      const sender = this.state.players.get(client.sessionId);
      const result = this.chat.submit(client.sessionId, sender, payload);
      if ('error' in result) { client.send(MessageType.ChatError, result.error); return; }
      if (result.message.channel === 'global') {
        try { await this.presence.publish(GLOBAL_CHAT_TOPIC, result.message); }
        catch { client.send(MessageType.ChatError, { code: 'unavailable', text: 'No se pudo enviar a Global. Volvé a intentarlo.' }); }
        return;
      }
      for (const recipient of this.clients) {
        const player = this.state.players.get(recipient.sessionId);
        if (player?.loaded && player.mapId === sender!.mapId &&
            distance2D(sender!.x, sender!.z, player.x, player.z) <= CHAT_LOCAL_RANGE) {
          recipient.send(MessageType.ChatMessage, result.message);
        }
      }
    });
    this.parties = new PartySystem(this.state, (id, invitation) => {
      this.clients.find(c => c.sessionId === id)?.send(MessageType.PartyInvitation, invitation);
    });
    this.clock.setInterval(() => this.parties.expire(), 1000);
    this.trades = new TradeSystem(this.state, (id, snapshot, text) => {
      const client = this.clients.find(c => c.sessionId === id);
      client?.send(MessageType.TradeState, snapshot);
      if (text) client?.send(MessageType.ItemResult, { success: true, text });
    }, Date.now, ids => {
      for (const id of ids) this.checkAchievements(this.state.players.get(id)!, id);
      void this.saveAll();
    });
    this.clock.setInterval(() => this.trades.sweep(), 1000);
    this.onMessage(MessageType.TradeInvite, (client, data: unknown) => {
      const msg = data as { targetId?: unknown } | null;
      client.send(MessageType.ItemResult, this.trades.invite(client.sessionId, msg?.targetId));
    });
    this.onMessage(MessageType.TradeRespond, (client, data: unknown) => {
      const msg = data as { tradeId?: unknown; accept?: unknown } | null;
      client.send(MessageType.ItemResult, this.trades.respond(client.sessionId, msg?.tradeId, msg?.accept));
    });
    this.onMessage(MessageType.TradeOffer, (client, data: unknown) => {
      const msg = data as { tradeId?: unknown; revision?: unknown; offer?: unknown } | null;
      client.send(MessageType.ItemResult, this.trades.offer(client.sessionId, msg?.tradeId, msg?.revision, msg?.offer));
    });
    this.onMessage(MessageType.TradeConfirm, (client, data: unknown) => {
      const msg = data as { tradeId?: unknown; revision?: unknown } | null;
      client.send(MessageType.ItemResult, this.trades.confirm(client.sessionId, msg?.tradeId, msg?.revision));
    });
    this.onMessage(MessageType.TradeCancel, (client, data: unknown) => {
      const msg = data as { tradeId?: unknown } | null;
      client.send(MessageType.ItemResult, this.trades.cancel(client.sessionId, msg?.tradeId));
    });
    this.onMessage(MessageType.PartyInvite, (client, msg: unknown) => {
      const targetId = (msg as { targetId?: unknown } | null)?.targetId;
      if (typeof targetId !== 'string' || targetId.length > 128) return;
      client.send(MessageType.ItemResult, this.parties.invite(client.sessionId, targetId));
    });
    this.onMessage(MessageType.PartyRespond, (client, msg: unknown) => {
      const data = msg as { inviterId?: unknown; accept?: unknown } | null;
      if (typeof data?.inviterId !== 'string' || data.inviterId.length > 128 || typeof data.accept !== 'boolean') return;
      client.send(MessageType.ItemResult, this.parties.respond(client.sessionId, data.inviterId, data.accept));
    });
    this.onMessage(MessageType.PartyLeave, client => {
      client.send(MessageType.ItemResult, this.parties.leave(client.sessionId));
    });
    this.onMessage(MessageType.PartyKick, (client, msg: unknown) => {
      const targetId = (msg as { targetId?: unknown } | null)?.targetId;
      if (typeof targetId !== 'string' || targetId.length > 128) return;
      const outcome = this.parties.kick(client.sessionId, targetId);
      client.send(MessageType.ItemResult, outcome);
      if (outcome.success) this.clients.find(c => c.sessionId === targetId)?.send(MessageType.ItemResult, { success: true, text: 'El líder te retiró de la party.' });
    });
    this.persistence = createPersistence();
    this.saveQueue = new CharacterSaveQueue(entries => this.persistence.saveMany(entries), names => {
      for(const name of names) {
        const sessionId=this.departedAccounts.get(name);
        if(sessionId && GameRoom.activeAccounts.get(name)===sessionId)GameRoom.activeAccounts.delete(name);
        this.departedAccounts.delete(name);
      }
      if(this.holdingForSave && this.departedAccounts.size===0) {
        this.holdingForSave=false;this.autoDispose=true;
      }
    });
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

    this.onMessage(MessageType.PickupItem, (client, msg: {dropId?: unknown}) => {
      if (typeof msg?.dropId !== 'string' || msg.dropId.length > 512) return;
      if (tryPickup(this.state, client.sessionId, msg.dropId)) this.checkAchievements(this.state.players.get(client.sessionId)!, client.sessionId);
    });
    this.onMessage(MessageType.DropItem, (client, data: unknown) => {
      const msg = data as { itemTemplateId?: unknown; qty?: unknown } | null;
      const success = tryDropInventory(this.state, client.sessionId, msg?.itemTemplateId, msg?.qty);
      if (success) { this.trades.sweep(); void this.saveAll(); }
      client.send(MessageType.ItemResult, { success, text: success ? 'Objeto tirado al suelo. Cualquier jugador puede recogerlo.' : 'No se pudo tirar: verificá el objeto y la cantidad en tu inventario.' });
    });
    this.onMessage(MessageType.MoveTo, (client, msg: MoveToMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.dead) return;
      if (!msg || !Number.isFinite(msg.x) || !Number.isFinite(msg.z)) return;
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
      if (!msg || !availableSkills(p.className,p.level,[...p.learnedTomes],p.equipment.get('weapon')).includes(msg.skillId)) return;

      let skill;
      try {
        skill = getSkill(msg.skillId);
      } catch {
        return;
      }

      // Check MP and cooldown
      if (p.mp < skill.mpCost) return;
      if ((p.skillCooldowns.get(skill.id) ?? 0) > 0) return;

      const origin = { x: p.x, z: p.z };
      const announceCast = (targetId: string, amount?: number) => {
        const target = targetId ? this.resolveTarget(targetId, p.mapId) : null;
        const event: SkillCastEvent = {
          casterId: client.sessionId, skillId: skill.id, targetId, amount,
          origin, destination: { x: p.x, z: p.z }, mapId: p.mapId,
          targetPosition: target ? { x: target.entity.x, z: target.entity.z } : undefined,
        };
        this.broadcast(MessageType.SkillCast, event);
      };
      const atkCd = getClass(p.className).base.attackCooldownMs / (1+p.itemEffects.attackSpeed);
      const spend = () => { p.mp -= skill.mpCost; p.skillCooldowns.set(skill.id, skill.cooldownMs); };
      const applyCleanse = () => { if (skill.cleanse) { p.stunMs = 0; p.rootMs = 0; } };

      // Branch by skill type
      if (skill.type === "damage") {
        const t = p.targetId ? this.resolveTarget(p.targetId, p.mapId) : null;
        if (!t) return;
        if (t.kind === 'mob' && !canFightDungeonMob(p,t.entity.templateId)) return;
        const power = t.kind === 'mob' ? pvePower(p.level, t.entity.level).outgoing : 1;
        if (power === 0) {
          client.send(MessageType.ItemResult, {success:false,text:'Fuera de tu alcance: necesitás acercarte a su nivel.'});
          return;
        }
        const gapCloser = skill.dash === "toTarget";
        // Las skills no esperan al golpe automático: las limitan su cooldown, su maná y su alcance.
        if (!inSkillRange(p, t.entity, skillRange(skill))) return;
        if (t.kind === "player") {
          const victim = t.entity;
          if (this.areAllies(p, victim)) return;
          if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
        }
        if (gapCloser && !this.dashToTarget(p, t.entity.x, t.entity.z)) return;
        if(['aimed_shot','snaring_shot','piercing_shot','item_volley'].includes(skill.id)) {
          const weapon=p.equipment.get('weapon');if(!weapon || !getItem(weapon).ammo || !consumeAmmo(p))return;
        }
        spend();
        const variance = 0.9 + Math.random() * 0.2;
        const dmg = resolveAttack(p, t.entity, (skill.factor ?? 1) * power, variance, atkCd,Math.random,skillElement(skill.id));
        if (t.kind === 'mob' && dmg > 0) this.engageMob(t.entity, client.sessionId);
        // Modificadores de counterplay sobre el objetivo.
        if (dmg > 0 && skill.stunMs) t.entity.stunMs = Math.max(t.entity.stunMs, skill.stunMs);
        if (dmg > 0 && skill.rootMs) t.entity.rootMs = Math.max(t.entity.rootMs, Math.round(skill.rootMs*(1-(t.kind==='player'&&skillElement(skill.id)==='ice'?t.entity.itemEffects.iceResist:0))));
        if (skill.lifestealPct && p.hp>0) p.hp = Math.min(p.maxHp, p.hp + Math.round(dmg * skill.lifestealPct));
        this.markCombat(p);
        if (t.kind === "player") this.markCombat(t.entity);
        announceCast(p.targetId, dmg);
        this.broadcast(MessageType.Damage, { attackerId: client.sessionId, targetId: p.targetId, amount: dmg, hp: t.entity.hp, skillId: skill.id, dodged: dmg === 0 });
        if (t.entity.hp <= 0) {
          if (t.kind === "mob") this.killMob(t.entity, p.targetId, client.sessionId);
          else this.killPlayer(t.entity, p.targetId, client.sessionId);
        }
        if(p.hp<=0) this.killPlayer(p,client.sessionId,t.kind==='player'?t.sessionId:undefined);
      } else if (skill.type === "heal") {
        spend();
        const healAmount = Math.round(p.maxHp * (skill.healPct ?? 0));
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        applyCleanse();
        announceCast("", healAmount);
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
        announceCast("", healAmount || undefined);
      } else if (skill.type === "dash") {
        // Movilidad pura (blink): escape sin objetivo.
        spend();
        if (skill.dash === "away") this.dashAway(p, skill.dashRange);
        applyCleanse();
        announceCast("");
      } else if (skill.type === "dot") {
        const target=p.targetId?this.resolveTarget(p.targetId,p.mapId):null;
        if(!target || !inSkillRange(p,target.entity,skillRange(skill)))return;
        if(target.kind==='mob' && (!canFightDungeonMob(p,target.entity.templateId) || pvePower(p.level,target.entity.level).outgoing === 0)) { client.send(MessageType.ItemResult,{success:false,text:'Fuera de tu alcance o encuentro todavía bloqueado.'}); return; }
        if(target.kind==='player' && (!this.inPvpZone(p)||!this.inPvpZone(target.entity)||this.areAllies(p, target.entity)))return;
        spend();
        if(target.kind==='mob') { const mob=target.entity; mob.dotMs=skill.dotMs??0;mob.dotDps=skill.dotDps??0;mob.dotAttackerId=client.sessionId;mob.dotAttackerLevel=p.level;mob.dotAccumMs=0; this.engageMob(mob,client.sessionId); }
        else { const victim=target.entity;victim.poisonMs=skill.dotMs??0;victim.poisonDps=skill.dotDps??0;victim.poisonAttackerId=client.sessionId;victim.poisonAccumMs=0; }
        this.markCombat(p);
        announceCast(p.targetId);
      }
    });

    // Etapa 4b-1 / 20: interacción con NPCs, ruteada por npcId. El pueblo es un
    // mapa seguro entero; la cercanía a los servicios se mide contra su centro.
    this.onMessage(MessageType.InteractNpc, (client, msg: InteractNpcMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      const npcId = msg?.npcId ?? "elder";
      let npc;
      try { npc = getNpc(npcId); } catch { return; }
      const regional = npc.mapId !== 'pueblo';
      const center = regional ? npc : TOWN;
      if (p.mapId !== npc.mapId || distance2D(p.x, p.z, center.x, center.z) > (regional ? 5 : TOWN_SERVICE_RADIUS)) {
        client.send(MessageType.ItemResult, {success:false, text:`Acercate a ${npc.name} para hablar.`});
        return;
      }
      if (npcId === "healer") { this.serveHealer(p); return; }
      const chain = sideChainForNpc(npcId);
      if (chain) { this.serveSideChain(p, client, chain); return; }
      if (npc.role === 'elder') this.serveElder(p, client, npcId);
    });

    // Etapa 4b-2: handler de compra en el mercader
    this.onMessage(MessageType.BuyItem, (client, msg: BuyItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;

      // Gate de proximidad al pueblo (igual que interactNpc)
      const boren = getNpc('boren');
      const townShop = p.mapId === 'pueblo' && distance2D(p.x, p.z, TOWN.x, TOWN.z) <= TOWN_SERVICE_RADIUS;
      const fieldShop = p.mapId === boren.mapId && distance2D(p.x, p.z, boren.x, boren.z) <= 5;
      if (!townShop && !fieldShop) return;

      // Validar cantidad
      const qty = msg?.qty ?? 1;
      if(!Number.isSafeInteger(qty)||qty<1||qty>100)return;

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
      client.send(MessageType.ItemResult,{success:true,text:`Compraste ${getItem(msg.itemTemplateId).name}.`});
    });

    // Etapa 4b-2: handler de uso de ítems (pociones)
    this.onMessage(MessageType.UseItem, (client, msg: UseItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
      let used; try { used = getItem(msg?.itemTemplateId ?? ''); } catch { used = undefined; }
      if (used?.useEffect === 'town_portal') {
        const lock = travelLockRemainingMs(p.msSinceCombat);
        if (lock > 0) { client.send(MessageType.ItemResult, { success: false, text: travelLockText(lock) }); return; }
      }
      const resource=potionResource(msg?.itemTemplateId);
      const account=this.accountNames.get(client.sessionId)??p.name;
      const remaining=resource?potionRecovery.remaining(account,resource):0;
      if(remaining>0){client.send(MessageType.ItemResult,{success:false,text:`Poción de ${resource==='hp'?'vida':'maná'} disponible en ${Math.ceil(remaining/1000)} s.`});return;}
      const success=useInventoryItem(p,msg?.itemTemplateId,msg?.targetItemId);
      if(success && resource){
        potionRecovery.start(account,resource);
        p.hpPotionCooldownMs=potionRecovery.remaining(account,'hp');
        p.mpPotionCooldownMs=potionRecovery.remaining(account,'mp');
      }
      if(p.mapId!=='cripta')resetDungeon(p);
      this.maintainDungeonRun();
      if(success)this.recomputeStats(p);
      client.send(MessageType.ItemResult,{success,text:success?'Objeto utilizado.':'No se puede usar: revisá requisitos, recursos y objetivo.'});
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
      if(!equipItem(p,id)){client.send(MessageType.ItemResult,{success:false,text:'No podés equiparlo: verificá clase, nivel y manos libres.'});return;}
      this.recomputeStats(p);
      client.send(MessageType.ItemResult,{success:true,text:`Equipaste ${getItem(id).name}.`});
      this.checkAchievements(p, client.sessionId); // p.ej. equipar un legendario
    });

    // Etapa 12: desequipar el slot dado → el ítem vuelve al inventario.
    this.onMessage(MessageType.UnequipItem, (client, msg: UnequipItemMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.dead) return;
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
      const lock = travelLockRemainingMs(p.msSinceCombat);
      if (lock > 0) { client.send(MessageType.ItemResult, { success: false, text: travelLockText(lock) }); return; }
      if (!canEnterZone(zone, p.level)) return; // nivel insuficiente
      const gate = mapGate(zone.id);
      if (gate && !questReached(p.questId, gate.from)) {
        client.send(MessageType.ItemResult, { success: false, text: gate.text });
        return;
      }
      this.maintainDungeonRun();
      if(zone.id==='cripta' && this.dungeonActive && this.dungeonRun.dungeonStage===5){
        client.send(MessageType.ItemResult,{success:false,text:'Esta expedición terminó. La cripta reabre cuando salga el último aventurero.'});
        return;
      }
      resetDungeon(p);
      p.mapId = zone.id;
      const arrival = nearestWalkable(zone.id, zone.spawn);
      p.x = p.targetX = arrival.x;
      p.z = p.targetZ = arrival.z;
      p.moving = false;
      p.targetId = "";
      advanceQuest(p,'visit',zone.id);
      this.maintainDungeonRun();
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
      if (o.id === 'crypt_seal_1' || o.id === 'crypt_seal_2') {
        const success = activateSeal(this.dungeonRun,o.id);
        this.syncDungeonRun();
        client.send(MessageType.ItemResult,{success,text:success?'Sello roto para la expedición. Seguí hacia la próxima ala.':'Primero despejá el ala: derrotá a sus seis criaturas.'});
        return;
      }
      advanceQuest(p,'interact',o.id);
      this.creditSideChains(p, 'interact', o.id, client);
      const interrupt = encounterInterruptFor(o.id);
      if (interrupt) {
        const texts = interrupt.pattern.interruptTexts;
        const boss = [...this.state.mobs.values()].find(m => m.templateId === interrupt.templateId && !m.dead && m.channeling && m.mapId === p.mapId && distance2D(p.x, p.z, m.x, m.z) <= 25);
        if (boss && canFightDungeonMob(p, boss.templateId) && pvePower(p.level, boss.level).outgoing > 0) {
          boss.channeling = false; boss.hazardMs = 0; boss.hazardCooldownMs = interrupt.pattern.interruptCooldownMs ?? 0;
          boss.stunMs = Math.max(boss.stunMs, interrupt.pattern.interruptStunMs ?? 0);
          client.send(MessageType.ItemResult, { success: true, text: texts?.success ?? '' });
        } else client.send(MessageType.ItemResult, { success: !boss, text: (boss ? texts?.tooWeak : texts?.idle) ?? '' });
        return;
      }
      if (o.kind === "shrine") {
        // Bendición temporal (reusa el sistema de buffs de skills).
        if (def.buff === "atk") { p.atkBuffMs = SHRINE_BUFF_MS; p.atkBuffMult = SHRINE_BUFF_MULT; }
        else { p.defBuffMs = SHRINE_BUFF_MS; p.defBuffMult = SHRINE_BUFF_MULT; }
      } else if (def.lootId) {
        this.dropLoot(def.lootId, o.x, o.z, o.mapId);
      }
      if (def.reusable) return;
      o.active = false;
      o.respawnMs = objectRespawnMs(def.kind);
    });

    // Etapa 21: gastar un punto de atributo (Fuerza/Agilidad/Vitalidad/Energía).
    this.onMessage(MessageType.AllocateStat, (client, msg: AllocateStatMessage) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (p.attributes.statPoints <= 0) return;
      const attr = msg?.attr ?? "";
      if (!isValidAttribute(attr)) return;
      p.attributes[attr as Attribute] += 1;
      p.attributes.statPoints -= 1;
      this.recomputeStats(p);
    });

    const dt = 1 / TICK_RATE;
    this.setSimulationInterval(() => this.tick(dt), 1000 / TICK_RATE);
  }

  /** Etapa 22: marca a un jugador como "en combate" (corta la regen de HP 5 s). */
  private markCombat(p: PlayerState): void {
    p.msSinceCombat = 0;
  }

  /** Being hit provokes pursuit even when the attack began outside passive aggro. */
  private engageMob(mob: MobState, attackerId: string): void {
    if (mob.dead || mob.hp <= 0 || mob.aggroTargetId) return;
    mob.aggroTargetId = attackerId;
    mob.aiState = 'chase';
  }

  /** Etapa 22: enganche — acerca al caster a rango de ataque del objetivo (clamp a bounds). */
  private dashToTarget(p: PlayerState, tx: number, tz: number): boolean {
    // Reject atomically: a blocked charge must neither move for free nor hit
    // through a thin wall merely because the target is within melee range.
    const sight = clipMovement(p.mapId, p, { x: tx, z: tz }, 0);
    if (Math.hypot(sight.x - tx, sight.z - tz) > 0.001) return false;
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const stop = Math.max(0, d - ATTACK_RANGE * 0.8);
    const raw = { x: p.x + (dx / d) * stop, z: p.z + (dz / d) * stop };
    const c = clipMovement(p.mapId, p, raw);
    if (Math.hypot(c.x - raw.x, c.z - raw.z) > 0.001) return false;
    p.x = p.targetX = c.x;
    p.z = p.targetZ = c.z;
    p.moving = false;
    return true;
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
    const c = clipMovement(p.mapId, p, { x: p.x + dirX * range, z: p.z + dirZ * range });
    p.x = p.targetX = c.x;
    p.z = p.targetZ = c.z;
    p.moving = false;
  }

  /** Anciano Rowan: campaña principal (asignar / entregar / avanzar). */
  private serveElder(p: PlayerState, client: Client, npcId = 'elder'): void {
    const next = chapterAfter(p.questId);
    if (next?.start) {
      if (npcId !== next.start.npcId) return;
      if (p.level < next.start.minLevel) { client.send(MessageType.ItemResult, { success: false, text: next.start.lockedText }); return; }
      const first = getQuest(next.questOrder[0]);
      p.questId = first.id;
      p.questProgress = first.objective === 'visit' && p.mapId === first.targetId ? first.amount : 0;
      client.send(MessageType.ItemResult, { success: true, text: next.start.startedText });
      return;
    }
    if (isChapterComplete(p.questId)) return;
    if (p.questId === "") {
      if (npcId !== 'elder') return;
      p.questId = firstQuestId();
      p.questProgress = 0;
      return;
    }
    try {
      const q = getQuest(p.questId);
      if ((q.returnNpcId ?? 'elder') !== npcId) {
        client.send(MessageType.ItemResult, {success:false,text:`Esta misión se entrega con ${getNpc(q.returnNpcId ?? 'elder').name}.`});
        return;
      }
      if (p.questProgress >= q.amount) {
        this.grantExp(p, client, q.rewardExp);
        p.gold += q.rewardGold;
        // Etapa 21: la misión puede entregar una pieza de equipo.
        const reward = questReward(q,p.className);
        if (reward) {
          this.addToInventory(p, reward, q.rewardItemQty ?? 1);
          this.checkAchievements(p, client.sessionId);
        }
        p.questId = nextQuestId(p.questId);
        p.questProgress = 0;
        client.send(MessageType.ItemResult,{success:true,text:`Misión completada: ${q.title}. +${q.rewardExp} EXP, +${q.rewardGold} oro${reward?`, ${getItem(reward).name}`:''}.`});
      }
    } catch { /* quest desconocida: ignorar */ }
  }

  /** Encargos opcionales: aceptar, entregar y avanzar según el registro compartido. */
  private serveSideChain(p: PlayerState, client: Client, chain: SideChainDef): void {
    if (p.level < chain.minLevel) return;
    const entry = p.sideChains.get(chain.id);
    if (entry && entry.id === chain.completeId) return;
    if (!entry || entry.id === '') {
      const first = chain.steps[0];
      const created = new SideChainState();
      created.id = first.id; created.progress = 0;
      p.sideChains.set(chain.id, created);
      if (chain.announce) client.send(MessageType.ItemResult, { success: true, text: `Encargo aceptado: ${first.intro}` });
      return;
    }
    const step = sideChainStep(chain, entry.id);
    if (!step || entry.progress < step.amount) return;
    if (step.rewardExp > 0) this.grantExp(p, client, step.rewardExp);
    p.gold += step.rewardGold;
    if (step.rewardItemId) this.addToInventory(p, step.rewardItemId, step.rewardQty ?? 1);
    entry.id = nextSideChainStep(chain, step.id);
    entry.progress = 0;
    if (chain.announce) {
      const next = sideChainStep(chain, entry.id);
      const item = step.rewardItemId ? `, ${step.rewardQty ?? 1} ${getItem(step.rewardItemId).name}` : '';
      client.send(MessageType.ItemResult, { success: true, text: `${step.done} +${step.rewardGold} oro${item}.${next ? ` Nuevo encargo: ${next.title}.` : ''}` });
    }
  }

  /** Suma progreso a los encargos activos que piden esta baja u objeto. */
  private creditSideChains(p: PlayerState, objective: 'kill' | 'interact', targetId: string, client?: Client): void {
    p.sideChains.forEach((entry, chainId) => {
      const chain = getSideChain(chainId);
      const step = chain ? sideChainStep(chain, entry.id) : undefined;
      if (!chain || !step || step.objective !== objective || entry.progress >= step.amount) return;
      const matches = objective === 'kill'
        ? step.targetId === '' || step.targetId === targetId
        : step.targetId === targetId && (step.mapId === undefined || step.mapId === p.mapId);
      if (!matches) return;
      entry.progress++;
      if (entry.progress >= step.amount && chain.announce && objective === 'interact') {
        client?.send(MessageType.ItemResult, { success: true, text: `Encargo completado: ${step.title}. ${chain.returnHint ?? ''}`.trim() });
      }
    });
  }

  /** Sanadora: restaura HP y MP a full por oro (no-op si ya está full o falta oro). */
  private serveHealer(p: PlayerState): void {
    if (p.hp >= p.maxHp && p.mp >= p.maxMp) return;
    if (p.gold < HEAL_COST_GOLD) return;
    p.gold -= HEAL_COST_GOLD;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }

  /** Otorga EXP a un jugador y envía LevelUp si sube de nivel (Etapa 4b-1: reutilizable en quests). */
  private grantExp(player: PlayerState, client: Client, amount: number) {
    const before = player.level;
    const lvls = gainExp(player, amount, player.className);
    if (lvls > 0) {
      // Etapa 21: cada nivel otorga puntos de atributo para repartir.
      player.attributes.statPoints += lvls * POINTS_PER_LEVEL;
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
    const position = nearestWalkable(mapId, { x, z });
    x = position.x; z = position.z;
    const mob = this.state.mobs.get(id) ?? new MobState();
    mob.templateId = templateId;
    mob.level = getTemplate(templateId).level;
    mob.rank = getTemplate(templateId).rank;
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
    mob.dotDps=0;mob.dotAttackerId='';mob.dotAccumMs=0;
    mob.hazardMs = 0;
    mob.hazardCooldownMs = 0;
    mob.channeling = false; mob.hazardCount = 0;
    mob.hazardArc = Math.PI * 2; mob.hazardAngle = 0; mob.hazardPower = 2.2;
    mob.summonedBy = ''; mob.summonSource = ''; mob.summonTimers.clear(); mob.summonFlags.clear();

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
    if(mob.dead)return;
    if (mob.summonedBy) {
      mob.dead = true; mob.hazardMs = 0; mob.channeling = false; mob.moving = false; mob.respawnMs = 0;
      this.broadcast(MessageType.Death, { entityId: mobId });
      return;
    }
    mob.dead = true;
    mob.hazardMs = 0;
    mob.channeling = false;
    mob.moving = false;
    mob.respawnMs = respawnForTemplate(mob.templateId) ?? MOB_RESPAWN_MS;
    this.broadcast(MessageType.Death, { entityId: mobId });

    const killer = killerId ? this.state.players.get(killerId) : undefined;
    const recipients: [string, PlayerState][] = [];
    if (killer?.partyId) {
      this.state.players.forEach((member, id) => {
        if (member.partyId === killer.partyId && !member.dead && member.loaded &&
          member.mapId === mob.mapId && distance2D(member.x, member.z, mob.x, mob.z) <= PARTY_REWARD_RANGE &&
          this.clients.some(c => c.sessionId === id)) recipients.push([id, member]);
      });
      // Give the rounding remainder to the killer when eligible, otherwise the first eligible member.
      recipients.sort(([a], [b]) => a === killerId ? -1 : b === killerId ? 1 : 0);
    } else if (killer && !killer.dead) {
      recipients.push([killerId!, killer]);
    }
    const awardedExp = new Set<string>();
    const exp = getMobExp(mob.templateId);
    recipients.forEach(([id, member], index) => {
      const client = this.clients.find(c => c.sessionId === id);
      if (client) {
        const amount = mob.mapId === 'cripta' ? exp : Math.floor(exp / recipients.length) + (index === 0 ? exp % recipients.length : 0);
        this.grantExp(member, client, amount);
        awardedExp.add(id);
      }
      this.creditMobKill(member, id, mob);
    });
    if (killer && !killer.dead) {
      killer.hp=Math.min(killer.maxHp,killer.hp+Math.floor(killer.maxHp*killer.itemEffects.hpOnKill));
      killer.mp=Math.min(killer.maxMp,killer.mp+Math.floor(killer.maxMp*killer.itemEffects.mpOnKill));

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

    }

    // Los presentes comparten avance y EXP aunque el autor del veneno haya muerto
    // o salido. No duplicar EXP ya otorgada al atacante o a su party.
    const dungeonCleared=mob.mapId==='cripta' && advanceDungeonKill(this.dungeonRun,mob.templateId);
    if(mob.mapId==='cripta')this.syncDungeonRun();
    if (mob.mapId === 'cripta') this.state.players.forEach((participant, id) => {
      if (participant.dead || participant.mapId !== mob.mapId || distance2D(participant.x, participant.z, mob.x, mob.z) > 25) return;
      const client = this.clients.find(c => c.sessionId === id);
      if (!awardedExp.has(id) && client) this.grantExp(participant, client, getMobExp(mob.templateId));
      if (dungeonCleared) {
        const base = getItem(dungeonReward(participant.className));
        const reward = createItemInstance(base, { quality: 'magic', level: 5, skill: true }, randomUUID());
        this.addToInventory(participant, reward, 1);
        advanceQuest(participant, 'dungeon', 'cripta');
        client?.send(MessageType.ItemResult, { success: true, text: `¡Cripta completada! Recibiste ${getItem(reward).name}. Volvé a Aden con M.` });
      }
    });

    // Etapa 14: evento de mundo — el jefe cae (anuncio server-wide, cualquiera lo haya matado).
    if (isBoss(mob.templateId)) {
      this.broadcast(MessageType.WorldAnnounce, { text: `¡${getTemplate(mob.templateId).name} ha caído!` });
    }

    // Loot (R-E3b-2): rodar drop table del mob y crear ítems en el piso con scatter.
    this.dropLoot(mob.templateId, mob.x, mob.z, mob.mapId, killer?.itemEffects.goldPct ?? 0);
    this.clearSummons(mobId);
  }

  /** Refuerzos de un encuentro: una vez al bajar de cierta vida, o periódicos desde objetos activos. */
  private stepSummons(mob: MobState, mobId: string, dtMs: number): void {
    const def = getEncounter(mob.templateId);
    if (!def?.summons || mob.dead || mob.summonedBy || !mob.aggroTargetId) return;
    def.summons.forEach((s, index) => {
      if (s.atHpPct !== undefined) {
        if (mob.summonFlags.has(index) || mob.hp > mob.maxHp * s.atHpPct) return;
        mob.summonFlags.add(index);
        const count = Math.min(s.count ?? 1, s.maxAlive - this.summonsOf(mobId, s.templateId).length);
        for (let i = 0; i < count; i++) {
          const a = (i / Math.max(1, count)) * Math.PI * 2;
          this.spawnSummon(mobId, s.templateId, mob.x + Math.cos(a) * 3, mob.z + Math.sin(a) * 3, mob.mapId, `hp${index}`);
        }
        return;
      }
      if (!s.everyMs || !s.fromObjects) return;
      for (const objectId of s.fromObjects) {
        const o = this.state.worldObjects.get(objectId);
        if (!o || !o.active || o.mapId !== mob.mapId) continue;
        const key = `${index}:${objectId}`;
        const left = (mob.summonTimers.get(key) ?? s.everyMs) - dtMs;
        if (left > 0) { mob.summonTimers.set(key, left); continue; }
        mob.summonTimers.set(key, s.everyMs);
        if (this.summonsOf(mobId, s.templateId, objectId).length >= s.maxAlive) continue;
        this.spawnSummon(mobId, s.templateId, o.x, o.z, mob.mapId, objectId);
      }
    });
  }

  private summonsOf(ownerId: string, templateId: string, source?: string): MobState[] {
    return [...this.state.mobs.values()].filter(m => m.summonedBy === ownerId && !m.dead && m.templateId === templateId && (source === undefined || m.summonSource === source));
  }

  private spawnSummon(ownerId: string, templateId: string, x: number, z: number, mapId: string, source: string): void {
    const add = this.spawnMob(`${ownerId}_add_${this.summonSeq++}`, templateId, x, z, mapId);
    add.summonedBy = ownerId;
    add.summonSource = source;
    const owner = this.state.mobs.get(ownerId);
    if (owner?.aggroTargetId) { add.aggroTargetId = owner.aggroTargetId; add.aiState = 'chase'; }
  }

  /** Marca muertas las invocaciones de un dueño; el loop de respawn las borra. */
  private clearSummons(ownerId: string): void {
    this.state.mobs.forEach((m, id) => {
      if (m.summonedBy !== ownerId || m.dead) return;
      m.dead = true; m.hp = 0; m.hazardMs = 0; m.channeling = false; m.moving = false; m.respawnMs = 0;
      this.broadcast(MessageType.Death, { entityId: id });
    });
    const owner = this.state.mobs.get(ownerId);
    if (owner) { owner.summonTimers.clear(); owner.summonFlags.clear(); }
  }

  private areAllies(a: PlayerState, b: PlayerState): boolean {
    return (!!a.guildId && a.guildId === b.guildId) || (!!a.partyId && a.partyId === b.partyId);
  }

  private creditMobKill(player: PlayerState, id: string, mob: MobState): void {
    advanceQuest(player, 'kill', mob.templateId);
    this.creditSideChains(player, 'kill', mob.templateId);
    player.retention.totalKills++;
    if (isBoss(mob.templateId)) player.bossKills++;
    if (player.retention.dailyQuestId && !player.retention.dailyDone) {
      try {
        const daily = getDailyQuest(player.retention.dailyQuestId);
        if (!daily.mobTemplateId || daily.mobTemplateId === mob.templateId) {
          player.retention.dailyProgress++;
          if (player.retention.dailyProgress >= daily.amount) {
            player.retention.dailyDone = true;
            player.gold += daily.rewardGold;
            const client = this.clients.find(c => c.sessionId === id);
            if (client) {
              this.grantExp(player, client, daily.rewardExp);
              client.send(MessageType.DailyComplete, { rewardGold: daily.rewardGold, rewardExp: daily.rewardExp });
            }
          }
        }
      } catch { /* Unknown legacy daily. */ }
    }
    this.checkAchievements(player, id);
  }

  /** Rueda una tabla de loot y deja los ítems en el piso (mobs y objetos de mundo). */
  private dropLoot(lootId: string, x: number, z: number, mapId: string, goldBonus=0): void {
    const drops=rollDrops(lootId, Math.random);
    // Un roll adicional por muerte/cofre, acotado a la profundidad del mapa.
    if(lootId!=='breakable' && Math.random() < (lootId==='skeleton_king'?.9:.25)) {
      const pool=catalogDropPool(mapId,lootId);
      const chosen=pool[Math.floor(Math.random()*pool.length)];
      if(chosen)drops.push({itemTemplateId:chosen,qty:getItem(chosen).category==='municion'?30:1});
    }
    for (const [index, d] of drops.entries()) {
      const item = new DroppedItemState();
      item.itemTemplateId = instantiateItem(d.itemTemplateId,true,lootId==='skeleton_king'?6:2);
      item.qty = d.itemTemplateId==='gold'?Math.round(d.qty*(1+goldBonus)):d.qty;
      item.mapId = mapId;
      const position = dropPosition(this.state,mapId,x,z,index);
      item.x = position.x;
      item.z = position.z;
      item.despawnMs = DROP_DESPAWN_MS;
      item.pickDelayMs = PICKUP_DELAY_MS; // visible al caer, no pickable hasta que expire
      this.state.droppedItems.set(`${lootId}_${d.itemTemplateId}_${this.dropSeq++}`, item);
    }
  }

  tick(dt: number) {
    this.maintainDungeonRun();
    this.state.players.forEach((p) => {
      if (p.dead) return; // un jugador muerto no se mueve
      if (p.stunMs > 0 || p.rootMs > 0) { p.moving = false; return; } // Etapa 22: aturdido/enraizado no se mueve
      advanceMovable(p, dt, p.moveSpeed);
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
    this.state.mobs.forEach((mob, mobId) => {
      if (mob.dead) return; // R-E2b1-3: un mob muerto no deambula ni persigue
      if (mob.windupMs > 0 || mob.hazardMs > 0) {
        mob.moving = false;
        return; // Plantado mientras carga el ataque
      }
      if (mob.stunMs > 0) { mob.moving = false; return; } // Etapa 22: aturdido no actúa
      const encounter = getEncounter(mob.templateId);
      const aiConfig = encounter ? { ...AI_CONFIG, aggroRadius: encounter.aggroRadius } : AI_CONFIG;
      const candidates=(playersByMap.get(mob.mapId) ?? []).filter(pos=>{
        const p=this.state.players.get(pos.id);
        return p && canFightDungeonMob(p,mob.templateId);
      });
      const wasEngaged = mob.aiState === 'chase';
      stepMobAI(mob, candidates, aiConfig, Math.random, dtMs);
      if (wasEngaged && !mob.aggroTargetId) {
        mob.hp = mob.maxHp;
        mob.dotMs = 0; mob.dotDps = 0; mob.dotAccumMs = 0; mob.dotAttackerId = '';
        mob.hazardMs = 0; mob.hazardCooldownMs = 0;
        mob.channeling = false; mob.hazardCount = 0;
        mob.rootMs = 0; mob.stunMs = 0;
        this.clearSummons(mobId);
      }
      if (mob.rootMs > 0) mob.moving = false; else advanceMovable(mob, dt, MOB_MOVE_SPEED); // enraizado no se mueve
    });

    // cooldowns de jugadores (ataque + skill) y buffs
    this.state.players.forEach((p) => {
      tickCooldown(p, dtMs);
      p.hpPotionCooldownMs=potionRecovery.remaining(p.name,'hp');
      p.mpPotionCooldownMs=potionRecovery.remaining(p.name,'mp');

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
        if(p.poisonMs>0) {
          const source=this.state.players.get(p.poisonAttackerId);
          if(!source || source.dead || source.mapId!==p.mapId || this.areAllies(p, source) || !this.inPvpZone(p)||!this.inPvpZone(source)) {p.poisonMs=0;p.poisonAccumMs=0;}
          else {
            p.poisonAccumMs+=Math.min(dtMs,p.poisonMs);p.poisonMs=Math.max(0,p.poisonMs-dtMs);
            while (p.poisonAccumMs >= 500 && !p.dead) {
              p.poisonAccumMs -= 500;
              const dmg = Math.max(1, Math.round(p.poisonDps * .5 * (1 - p.itemEffects.reduction) * (1 - p.itemEffects.poisonResist)));
              p.hp = Math.max(0, p.hp - dmg);
              this.markCombat(p);
              const id = [...this.state.players.entries()].find(([, v]) => v === p)?.[0];
              if (id) {
                this.broadcast(MessageType.Damage, { attackerId: p.poisonAttackerId, targetId: id, amount: dmg, hp: p.hp, periodic: true });
                if (p.hp <= 0) this.killPlayer(p, id, p.poisonAttackerId);
              }
            }
          }
        }
        if(p.dead)return;
        if (p.mp < p.maxMp) {
          p.mpRegenAcc += (Math.max(2, p.maxMp * 0.04)+p.maxMp*p.itemEffects.manaRegen) * dt;
          const add = Math.floor(p.mpRegenAcc);
          if (add > 0) { p.mp = Math.min(p.maxMp, p.mp + add); p.mpRegenAcc -= add; }
        } else {
          p.mpRegenAcc = 0;
        }
        // La recuperación natural requiere 5 s sin combate; el guardián cura siempre.
        if (p.hp < p.maxHp && (p.msSinceCombat >= 5000 || p.itemEffects.regen>0)) {
          const natural=p.msSinceCombat>=5000?Math.max(1,p.maxHp*.015):0;
          p.hpRegenAcc += (natural+p.maxHp*p.itemEffects.regen) * dt;
          const add = Math.floor(p.hpRegenAcc+1e-9);
          if (add > 0) { p.hp = Math.min(p.maxHp, p.hp + add); p.hpRegenAcc = Math.max(0,p.hpRegenAcc-add); }
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
        if(!canFightDungeonMob(p,mob.templateId))return;
        const power = pvePower(p.level, mob.level).outgoing;
        if (power === 0) { p.targetId = ''; return; }
        if (canAttack(p, mob, weaponRange(playerLoadout(p)))) {
          if(!consumeAmmo(p))return;
          const variance = 0.9 + Math.random() * 0.2;
          const dmg = resolveAttack(p, mob, power, variance, getClass(p.className).base.attackCooldownMs/(1+p.itemEffects.attackSpeed));
          if (dmg > 0) this.engageMob(mob, sessionId);
          if(getItem(p.equipment.get('weapon')??'worn_sword').ammo)this.broadcast(MessageType.SkillCast,{casterId:sessionId,skillId:'aimed_shot',targetId:p.targetId});
          this.markCombat(p);
          this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: mob.hp });
          if (mob.hp <= 0) this.killMob(mob, p.targetId, sessionId);
        }
      } else {
        // PvP: ambos fuera del pueblo
        const victim = t.entity;
        if (this.areAllies(p, victim)) return;
        if (!this.inPvpZone(p) || !this.inPvpZone(victim)) return;
        if (canAttack(p, victim, weaponRange(playerLoadout(p)))) {
          if(!consumeAmmo(p))return;
          const variance = 0.9 + Math.random() * 0.2;
          const dmg = resolveAttack(p, victim, 1, variance, getClass(p.className).base.attackCooldownMs/(1+p.itemEffects.attackSpeed));
          this.markCombat(p);
          this.markCombat(victim);
          this.broadcast(MessageType.Damage, { attackerId: sessionId, targetId: p.targetId, amount: dmg, hp: victim.hp });
          if (victim.hp <= 0) this.killPlayer(victim, p.targetId, sessionId);
          if(p.hp<=0)this.killPlayer(p,sessionId,t.sessionId);
        }
      }
    });

    // ataque de mobs sobre el jugador que persiguen — dos fases: wind-up + impacto
    this.state.mobs.forEach((mob, mobId) => {
      if (mob.dead) return;
      const impacted=stepEncounter(mob,this.state.players.entries(),dtMs);
      for(const id of impacted) {
        const p=this.state.players.get(id)!;
        const def=p.pDef*(p.defBuffMs>0?p.defBuffMult:1);
        const power = mob.hazardPower;
        const dmg=Math.max(1,Math.round(computeDamage(mob.pAtk,def,power * pvePower(p.level,mob.level).incoming,1)*(1-p.itemEffects.reduction)));
        p.hp=Math.max(0,p.hp-dmg);
        this.markCombat(p);
        this.broadcast(MessageType.Damage,{attackerId:mobId,targetId:id,amount:dmg,hp:p.hp});
        if(p.hp<=0)this.killPlayer(p,id);
      }
      this.stepSummons(mob, mobId, dtMs);
      if(mob.hazardMs>0){mob.windupMs=0;mob.windupTargetId='';return;}
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
        const fireMob=['infernal_demon','ancient_drake'].includes(mob.templateId);
        const dmg = Math.random()<target.itemEffects.dodge?0:Math.max(1,Math.round(computeDamage(mob.pAtk, target.pDef * defMult, pvePower(target.level,mob.level).incoming, variance)*(1-target.itemEffects.reduction)*(1-(fireMob?target.itemEffects.fireResist:0))));
        const reflected=Math.floor(Math.min(target.hp,dmg)*target.itemEffects.reflect*pvePower(target.level,mob.level).outgoing);
        target.hp = Math.max(0, target.hp - dmg);
        this.markCombat(target);
        this.broadcast(MessageType.Damage, { attackerId: mobId, targetId, amount: dmg, hp: target.hp });
        if (target.hp <= 0) this.killPlayer(target,targetId);
        if(reflected && canFightDungeonMob(target,mob.templateId)){mob.hp=Math.max(0,mob.hp-reflected);if(mob.hp<=0)this.killMob(mob,mobId,targetId);}
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
      if(mob.mapId==='cripta' && !canFightDungeonMob(this.dungeonRun,mob.templateId)) {mob.dotMs=0;return;}

      const source = this.state.players.get(mob.dotAttackerId);
      const power = pvePower(source?.level ?? mob.dotAttackerLevel, mob.level).outgoing;
      if (power === 0) { mob.dotMs=0;mob.dotAccumMs=0;return; }
      mob.dotAccumMs += Math.min(dtMs, mob.dotMs);

      // Tick de daño cada 500ms
      while (mob.dotAccumMs >= 500) {
        const dmg = Math.max(1, Math.round(mob.dotDps * 0.5 * power));
        mob.hp = Math.max(0, mob.hp - dmg);

        this.broadcast(MessageType.Damage, {
          attackerId: mob.dotAttackerId,
          periodic: true,
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
        if (tryPickup(this.state, sessionId, id, true)) pickedItem = true;
      }
      // Etapa 13: recoger un ítem (p.ej. un legendario) puede desbloquear un logro.
      if (pickedItem) this.checkAchievements(p, sessionId);
    });

    // cooldowns/respawn de mobs
    const expiredSummons: string[] = [];
    this.state.mobs.forEach((mob, id) => {
      tickCooldown(mob, dtMs);
      // Etapa 22: decremento de control del mob.
      if (mob.stunMs > 0) mob.stunMs = Math.max(0, mob.stunMs - dtMs);
      if (mob.rootMs > 0) mob.rootMs = Math.max(0, mob.rootMs - dtMs);
      if (mob.dead) {
        if (mob.summonedBy) { expiredSummons.push(id); return; }
        if(mob.mapId==='cripta')return;
        mob.respawnMs -= dtMs;
        if (mob.respawnMs <= 0) {
          const wasBoss = isBoss(mob.templateId);
          this.spawnMob(id, mob.templateId, mob.homeX, mob.homeZ, mob.mapId);
          // Etapa 14: evento de mundo — el jefe reaparece (carrera al Trono).
          if (wasBoss) this.broadcast(MessageType.WorldAnnounce, { text: "⚔ ¡El Rey Nihil ha despertado en su Trono!" });
        }
      }
    });
    for (const id of expiredSummons) this.state.mobs.delete(id);

    // Etapa 16: reactivar objetos de mundo usados (cofre reaparece, barril se regenera,
    // santuario sale de cooldown).
    this.state.worldObjects.forEach((o) => {
      if (o.active) return;
      if(o.mapId==='cripta')return;
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
        const sp = nearestWalkable(p.mapId, getZone(p.mapId).spawn);
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
  async onAuth(_client: Client, options: { name?: string; password?: string; className?: string; mode?: string; gender?: unknown }) {
    const name = (options?.name ?? "").trim();
    const password = options?.password ?? "";
    const mode = options?.mode ?? "";
    if (name.length < 1 || name.length > 16) throw new Error("Nombre inválido (1-16 caracteres).");
    if (GameRoom.activeAccounts.has(name)) throw new Error('Esa cuenta ya está conectada o terminando de guardar.');
    if (mode !== 'login' && options.gender !== undefined && !isCharacterGender(options.gender)) {
      throw new Error('Elegí una apariencia masculina o femenina.');
    }
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
    // onJoin claims the canonical account before loading its latest saved state.
    return { name };
  }

  async onJoin(client: Client, options: { name?: string; className?: string; gender?: unknown }) {
    // No other room may load a second writable copy of this account.
    const name=(client.auth as {name?:string}|undefined)?.name ?? options.name?.trim() ?? 'Adventurer';
    if(GameRoom.activeAccounts.has(name))throw new Error('Esa cuenta ya está conectada o terminando de guardar.');
    GameRoom.activeAccounts.set(name,client.sessionId);this.accountNames.set(client.sessionId,name);
    let preSave:CharacterSave|null;
    try {preSave=await this.persistence.load(name);}
    catch(error){GameRoom.activeAccounts.delete(name);this.accountNames.delete(client.sessionId);throw error;}
    if(this.accountNames.get(client.sessionId)!==name)return;
    const player = new PlayerState();
    player.name = name;
    player.hpPotionCooldownMs=potionRecovery.remaining(name,'hp');
    player.mpPotionCooldownMs=potionRecovery.remaining(name,'mp');
    const className = preSave?.className && isValidClass(preSave.className)
      ? preSave.className
      : (isValidClass(options?.className) ? options.className! : "knight");
    player.className = className;
    player.gender = characterGender(preSave ? preSave.progress?.gender : options?.gender);
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
    const townSpawn = nearestWalkable(TOWN_ZONE_ID, getZone(TOWN_ZONE_ID).spawn);
    player.x = player.targetX = townSpawn.x;
    player.z = player.targetZ = townSpawn.z;
    this.state.players.set(client.sessionId, player);

    // Apply the loaded save synchronously before yielding a player snapshot.
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
      if(loadedMap==='cripta' && this.dungeonRun.dungeonStage===5)loadedMap=TOWN_ZONE_ID;
      player.mapId = loadedMap;
      const sp = nearestWalkable(loadedMap, getZone(loadedMap).spawn);
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
        for(const id of availableSkills(player.className,1,pr.learnedTomes??[]).filter(id=>id.startsWith('tome_')))player.learnedTomes.push(id);
        player.retention.loginStreak = pr.loginStreak ?? 0;
        player.lastLoginDay = pr.lastLoginDay ?? "";
        player.retention.dailyQuestId = pr.dailyQuestId ?? "";
        player.retention.dailyProgress = pr.dailyProgress ?? 0;
        player.retention.dailyDone = pr.dailyDone ?? false;
        player.retention.totalKills = pr.totalKills ?? 0;
        player.bossKills = pr.bossKills ?? 0;
        player.title = pr.title ?? "";
        for (const id of pr.achievements ?? []) player.achievements.push(id);
        // Etapa 20: contrato activo del Capitán.
        for (const [chainId, saved] of Object.entries(sideChainsFromSave(pr))) {
          const entry = new SideChainState();
          entry.id = saved.id; entry.progress = saved.progress;
          player.sideChains.set(chainId, entry);
        }
        // Etapa 21: atributos asignados. statPoints se DERIVA del nivel (invariante:
        // total por nivel − gastados), así los personajes viejos reciben sus puntos
        // retroactivamente y nunca queda desincronizado.
        player.attributes.str = pr.str ?? 0;
        player.attributes.agi = pr.agi ?? 0;
        player.attributes.vit = pr.vit ?? 0;
        player.attributes.ene = pr.ene ?? 0;
      }
      player.attributes.statPoints = Math.max(0, pointsForLevel(player.level) - (player.attributes.str + player.attributes.agi + player.attributes.vit + player.attributes.ene));
      // Recalcular stats con clase/nivel + equipo + atributos, y rellenar HP/MP.
      this.recomputeStats(player);
      player.hp = player.maxHp;
      player.mp = player.maxMp;
    }

    // Etapa 3c (fix race save-before-load): recién ahora, con el save (si existía) ya
    // aplicado por completo, el jugador es seguro de persistir. Antes de esta línea,
    // saveAll()/onLeave() deben ignorarlo para no pisar el registro real con defaults
    // de nivel 1 (ver guardas en saveAll y onLeave).
    this.maintainDungeonRun();
    player.loaded = true;
    if(!save && className==='ranger') {
      const bow=Object.values(CATALOG_ITEMS).find(i=>i.category==='arma'&&i.ammo==='arrow'&&i.tier===1);
      const arrows=Object.values(CATALOG_ITEMS).find(i=>i.category==='municion'&&i.ammo==='arrow');
      if(bow){this.addToInventory(player,bow.id,1);const id=[...player.inventory.keys()].find(id=>getItem(id).ref_origen===bow.ref_origen);if(id)equipItem(player,id);}
      if(arrows)this.addToInventory(player,arrows.id,100);
      this.recomputeStats(player);
    }

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

  /** Atomic room snapshot; failed transfer rows remain queued for retry. */
  private async saveAll() {
    const entries=[...this.state.players.values()].filter(p=>p.loaded).map(p=>({name:p.name,data:toCharacterSave(p)}));
    try{await this.saveQueue.save(entries);}catch(e){console.error('[aden] save batch failed; retained for retry',e);}
  }

  async onLeave(client: Client) {
    this.chat.remove(client.sessionId);
    this.trades.remove(client.sessionId);
    this.parties.leave(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    const name=this.accountNames.get(client.sessionId);
    this.accountNames.delete(client.sessionId);
    if(name)this.departedAccounts.set(name,client.sessionId);
    // Keep the retry interval alive when the last player's save fails.
    if(player?.loaded && this.autoDispose){this.holdingForSave=true;this.autoDispose=false;}
    if(!player?.loaded && name && GameRoom.activeAccounts.get(name)===client.sessionId) {
      GameRoom.activeAccounts.delete(name);this.departedAccounts.delete(name);
    }
    // Remove from live systems before the asynchronous save: disconnected players
    // must not accept invitations or earn group rewards while persistence waits.
    const gid = player?.guildId ?? '';
    this.state.players.delete(client.sessionId);
    this.maintainDungeonRun();
    if (gid !== '') this.pruneGuildIfEmpty(gid);
    if (player) {
      // Etapa 3c: si se desconectó antes de que el load resolviera, no hay nada nuevo que
      // valga la pena persistir y guardar pisaría el registro real con defaults.
      if (player.loaded) {
        try {
          const entries=[...this.state.players.values()].filter(p=>p.loaded).map(p=>({name:p.name,data:toCharacterSave(p)}));
          entries.push({name:player.name,data:toCharacterSave(player)});
          await this.saveQueue.save(entries);
        } catch (e) {
          console.error("[aden] save fail on leave", player.name, e);
        }
      }
    }
  }

  async onDispose() {
    await this.saveAll();
    await this.presence.unsubscribe(GLOBAL_CHAT_TOPIC, this.deliverGlobalChat);
  }
}
