import { Client, Room } from "colyseus.js";
import {
  MessageType,
  type ChatSendMessage,
  type ChatMessage,
  type ChatErrorEvent,
  type MoveToMessage,
  type SetTargetMessage,
  type UseSkillMessage,
  type DamageEvent,
  type DeathEvent,
  type LevelUpEvent,
  type BossKilledEvent,
  type DailyResetEvent,
  type DailyCompleteEvent,
  type AchievementEvent,
  type SetTitleMessage,
  type InteractNpcMessage,
  type AllocateStatMessage,
  type BuyItemMessage,
  type UseItemMessage,
  type CreateGuildMessage,
  type JoinGuildMessage,
  type EquipItemMessage,
  type UnequipItemMessage,
  type WorldAnnounceEvent,
  type WarpToMessage,
  type InteractObjectMessage,
  type SkillCastEvent,
  isBoss,
  getTemplate,
  getQuest,
  CRYPT_WAVE_TEMPLATES,
} from "@aden/shared";
import type { WorldObjectSnapshot } from "../render/WorldObjectViews.js";
import type { PartyInvitation } from '@aden/shared';
import type { PartyPanelData, PartyMember } from '../render/PartyPanel.js';

import { characterGender, type CharacterGender } from '@aden/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface PlayerSnapshot {
  stunMs?: number;
  rootMs?: number;
  poisonMs?: number;
  atkBuffMs?: number;
  defBuffMs?: number;
  name: string;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  /** Muerto/respawneando (server-autoritativo); permite animar death/respawn de OTROS jugadores. */
  dead: boolean;
  /** Clase del jugador (knight/mage/barbarian/rogue); se sincroniza desde el server. Solo para jugadores. */
  className?: string;
  gender?: CharacterGender;
  /** Optional visual override supplied by equipment such as transformation rings. */
  appearanceModel?: string;
  equipment?:Record<string,string>;
  /** Tag de guild ("" si no pertenece a ninguna); se sincroniza desde el server. Solo para jugadores. */
  guildTag?: string;
  /** Título lucido (Etapa 13, logros); "" si ninguno. Solo para jugadores. */
  title?: string;
  /** Mapa donde está la entidad (Etapa 15). El cliente sólo renderiza su mapa actual. */
  mapId?: string;
  dungeonStage?: number;
  dungeonKills?: number;
}

/** Snapshot de mob: incluye combate (hp/maxHp/dead) para highlight/HUD. */
export interface MobSnapshot extends PlayerSnapshot {
  hp: number;
  maxHp: number;
  dead: boolean;
  windupMs: number;
  hazardMs?: number;
  hazardX?: number;
  hazardZ?: number;
  hazardRadius?: number;
}

/** Campos de combate del jugador local, leídos directamente del estado sincronizado (HUD). */
export interface SelfCombatSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  dead: boolean;
  /** EXP y nivel sincronizados por el server (autoritativo); el HUD sólo los muestra. */
  exp: number;
  level: number;
  /** Campos de misión y oro, sincronizados por el server. */
  gold: number;
  questId: string;
  questProgress: number;
  /** Contrato del Capitán (Etapa 20). */
  bountyId: string;
  bountyProgress: number;
  /** Atributos primarios + puntos sin gastar (Etapa 21). */
  str: number;
  agi: number;
  vit: number;
  ene: number;
  statPoints: number;
  /** Control activo (Etapa 22): ms de aturdimiento / enraizamiento. */
  stunMs: number;
  rootMs: number;
  /** Clase del jugador local. */
  className: string;
  /** Stats de combate efectivos (base + equipo), para mostrar el impacto del gear. */
  pAtk: number;
  pDef: number;
  /** Mapa actual del jugador local (Etapa 15). */
  mapId: string;
  dungeonStage?: number;
  dungeonKills?: number;
}

export interface RoomCallbacks {
  onChatMessage?: (message: ChatMessage) => void;
  onChatError?: (error: ChatErrorEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
  onMobAdd: (id: string, templateId: string, snap: MobSnapshot) => void;
  onMobChange: (id: string, snap: MobSnapshot) => void;
  onMobRemove: (id: string) => void;
  /** Ítem droppeado en el piso (sincronizado desde `state.droppedItems`). */
  onItemAdd: (id: string, itemTemplateId: string, x: number, z: number, mapId:string, qty:number) => void;
  onItemRemove: (id: string) => void;
  onDamage: (ev: DamageEvent) => void;
  onDeath: (entityId: string) => void;
  /** Disparado cuando el server sube de nivel al jugador local (mensaje dirigido `levelUp`). */
  onLevelUp: (level: number, learned: string[]) => void;
  /** Disparado server-wide cuando una guild abate al jefe (broadcast `bossKilled`). */
  onBossKilled: (ev: BossKilledEvent) => void;
  /** Etapa 13: día nuevo (racha + recompensa + diaria asignada). */
  onDailyReset: (ev: DailyResetEvent) => void;
  /** Etapa 13: misión diaria completada. */
  onDailyComplete: (ev: DailyCompleteEvent) => void;
  /** Etapa 13: logro desbloqueado. */
  onAchievement: (ev: AchievementEvent) => void;
  /** Etapa 14: anuncio de evento de mundo (jefe despierta/cae). */
  onWorldAnnounce: (ev: WorldAnnounceEvent) => void;
  /** Etapa 16: objetos de mundo (cofres/barriles/santuarios). */
  onObjectAdd: (id: string, snap: WorldObjectSnapshot) => void;
  onObjectChange: (id: string, snap: WorldObjectSnapshot) => void;
  onObjectRemove: (id: string) => void;
  /** Etapa 17: un jugador lanzó una skill (para renderizar su VFX). */
  onSkillCast: (ev: SkillCastEvent) => void;
  /** Authoritative result for buy/use/equip/unequip operations. */
  onItemResult?: (result: { success: boolean; text: string }) => void;
}

export class NetworkClient {
  private connected = false;
  private roomActive = false;
  private room!: Room;
  private partyInvitation: PartyInvitation | null = null;
  private connectionCallbacks?: RoomCallbacks;

  get isConnected(): boolean {
    return this.connected;
  }

  private markDisconnected(room: Room, cb: RoomCallbacks): void {
    if (this.room !== room || !this.roomActive) return;
    this.roomActive = false;
    const wasConnected = this.connected;
    this.connected = false;
    this.partyInvitation = null;
    if (wasConnected) cb.onConnectionChange?.(false);
  }

  private send(type: string, payload?: unknown): boolean {
    const room = this.room;
    const cb = this.connectionCallbacks;
    if (!this.connected || !room || !cb) return false;
    try {
      room.send(type, payload);
      return true;
    } catch {
      this.markDisconnected(room, cb);
      return false;
    }
  }

  async connect(name: string, password: string, className: string, cb: RoomCallbacks, mode = "", gender: CharacterGender = 'male'): Promise<void> {
    this.connected = false;
    this.roomActive = false;
    this.partyInvitation = null;
    const client = new Client(SERVER_URL);
    const room = await client.joinOrCreate<any>("game", { name, password, className, mode, gender });
    this.room = room;
    this.roomActive = true;
    this.connectionCallbacks = cb;
    const selfId = room.sessionId;
    const ifCurrent = (callback: () => void): void => {
      if (this.room === room && this.roomActive) callback();
    };
    room.onLeave(() => this.markDisconnected(room, cb));
    room.onMessage(MessageType.ChatMessage, (message: ChatMessage) => ifCurrent(() => cb.onChatMessage?.(message)));
    room.onMessage(MessageType.ChatError, (error: ChatErrorEvent) => ifCurrent(() => cb.onChatError?.(error)));

    const snap = (p: any): PlayerSnapshot => ({
      name: p.name,
      x: p.x,
      z: p.z,
      targetX: p.targetX,
      targetZ: p.targetZ,
      moving: p.moving,
      dead: p.dead,
      stunMs: p.stunMs ?? 0, rootMs: p.rootMs ?? 0, poisonMs: p.poisonMs ?? 0,
      atkBuffMs: p.atkBuffMs ?? 0, defBuffMs: p.defBuffMs ?? 0,
      className: p.className,
      gender: characterGender(p.gender),
      appearanceModel: p.appearanceModel ?? "",
      equipment:Object.fromEntries(p.equipment?.entries()??[]),
      guildTag: p.guildTag ?? "",
      title: p.title ?? "",
      mapId: p.mapId ?? "pueblo",
      dungeonStage: p.dungeonStage ?? 0,
      dungeonKills: p.dungeonKills ?? 0,
    });

    room.state.players.onAdd((player: any, id: string) => {
      if (this.room !== room || !this.roomActive) return;
      cb.onAdd(id, id === selfId, snap(player));
      player.onChange(() => ifCurrent(() => cb.onChange(id, snap(player))));
      player.equipment?.onAdd(() => ifCurrent(() => cb.onChange(id, snap(player))));
      player.equipment?.onRemove(() => ifCurrent(() => cb.onChange(id, snap(player))));
      player.equipment?.onChange(() => ifCurrent(() => cb.onChange(id, snap(player))));
    });
    room.state.players.onRemove((_player: any, id: string) => ifCurrent(() => cb.onRemove(id)));

    const snapMob = (m: any): MobSnapshot => ({
      name: "",
      x: m.x,
      z: m.z,
      targetX: m.targetX,
      targetZ: m.targetZ,
      moving: m.moving,
      hp: m.hp,
      maxHp: m.maxHp,
      dead: m.dead,
      stunMs: m.stunMs ?? 0, rootMs: m.rootMs ?? 0, poisonMs: m.dotMs ?? 0,
      windupMs: m.windupMs ?? 0,
      hazardMs: m.hazardMs ?? 0,
      hazardX: m.hazardX ?? m.x,
      hazardZ: m.hazardZ ?? m.z,
      hazardRadius: m.hazardRadius ?? 0,
      mapId: m.mapId ?? "",
    });

    room.state.mobs.onAdd((mob: any, id: string) => {
      if (this.room !== room || !this.roomActive) return;
      cb.onMobAdd(id, mob.templateId, snapMob(mob));
      mob.onChange(() => ifCurrent(() => cb.onMobChange(id, snapMob(mob))));
    });
    room.state.mobs.onRemove((_m: any, id: string) => ifCurrent(() => cb.onMobRemove(id)));

    room.state.droppedItems.onAdd((it: any, id: string) =>
      ifCurrent(() => cb.onItemAdd(id, it.itemTemplateId, it.x, it.z, it.mapId, it.qty)),
    );
    room.state.droppedItems.onRemove((_it: any, id: string) => ifCurrent(() => cb.onItemRemove(id)));

    room.onMessage(MessageType.Damage, (data: DamageEvent) => ifCurrent(() => cb.onDamage(data)));
    room.onMessage(MessageType.Death, (data: DeathEvent) => ifCurrent(() => cb.onDeath(data.entityId)));
    room.onMessage(MessageType.LevelUp, (data: LevelUpEvent) => ifCurrent(() => cb.onLevelUp(data.level, data.learned ?? [])));
    room.onMessage(MessageType.BossKilled, (data: BossKilledEvent) => ifCurrent(() => cb.onBossKilled(data)));
    room.onMessage(MessageType.DailyReset, (data: DailyResetEvent) => ifCurrent(() => cb.onDailyReset(data)));
    room.onMessage(MessageType.DailyComplete, (data: DailyCompleteEvent) => ifCurrent(() => cb.onDailyComplete(data)));
    room.onMessage(MessageType.Achievement, (data: AchievementEvent) => ifCurrent(() => cb.onAchievement(data)));
    room.onMessage(MessageType.WorldAnnounce, (data: WorldAnnounceEvent) => ifCurrent(() => cb.onWorldAnnounce(data)));
    room.onMessage(MessageType.ItemResult, (data: { success: boolean; text: string }) => ifCurrent(() => cb.onItemResult?.(data)));
    room.onMessage(MessageType.PartyInvitation, (data: PartyInvitation | null) => ifCurrent(() => { this.partyInvitation = data; }));

    // Etapa 16: objetos de mundo.
    const snapObj = (o: any): WorldObjectSnapshot => ({
      id: o.id, kind: o.kind, mapId: o.mapId, x: o.x, z: o.z, active: o.active,
    });
    room.state.worldObjects.onAdd((o: any, id: string) => {
      if (this.room !== room || !this.roomActive) return;
      cb.onObjectAdd(id, snapObj(o));
      o.onChange(() => ifCurrent(() => cb.onObjectChange(id, snapObj(o))));
    });
    room.state.worldObjects.onRemove((_o: any, id: string) => ifCurrent(() => cb.onObjectRemove(id)));

    room.onMessage(MessageType.SkillCast, (data: SkillCastEvent) => ifCurrent(() => cb.onSkillCast(data)));
    if (this.room === room && this.roomActive) {
      this.connected = true;
      cb.onConnectionChange?.(true);
    }
  }

  sendChat(message: ChatSendMessage): boolean {
    return this.send(MessageType.ChatSend, message);
  }

  sendMove(msg: MoveToMessage): boolean {
    return this.send(MessageType.MoveTo, msg);
  }
  sendPickup(dropId:string): boolean { return this.send(MessageType.PickupItem,{dropId}); }

  sendSetTarget(targetId: string): boolean {
    const msg: SetTargetMessage = { targetId };
    return this.send(MessageType.SetTarget, msg);
  }

  /** Envía la intención de usar una skill (p.ej. "power_strike"). El server resuelve target/rango/MP/cooldown. */
  sendUseSkill(skillId: string): boolean {
    const msg: UseSkillMessage = { skillId };
    return this.send(MessageType.UseSkill, msg);
  }

  /** Envía la intención de interactuar con un NPC (npcId ruteado por el server). */
  sendInteractNpc(npcId?: string): boolean {
    const msg: InteractNpcMessage = npcId ? { npcId } : {};
    return this.send(MessageType.InteractNpc, msg);
  }

  /** Etapa 21: gastar un punto de atributo (str|agi|vit|ene). */
  sendAllocateStat(attr: string): boolean {
    const msg: AllocateStatMessage = { attr };
    return this.send(MessageType.AllocateStat, msg);
  }

  /** Envía la intención de comprar un ítem en la tienda. */
  sendBuyItem(itemTemplateId: string, qty = 1): boolean {
    const msg: BuyItemMessage = { itemTemplateId, qty };
    return this.send(MessageType.BuyItem, msg);
  }

  /** Envía la intención de usar un ítem consumible (p.ej. poción). */
  sendUseItem(itemTemplateId: string, targetItemId?: string): boolean {
    const msg: UseItemMessage = targetItemId ? { itemTemplateId, targetItemId } : { itemTemplateId };
    return this.send(MessageType.UseItem, msg);
  }

  sendPartyInvite(targetId: string): boolean { return this.send(MessageType.PartyInvite, { targetId }); }
  sendPartyRespond(inviterId: string, accept: boolean): boolean { return this.send(MessageType.PartyRespond, { inviterId, accept }); }
  sendPartyLeave(): boolean { return this.send(MessageType.PartyLeave); }
  sendPartyKick(targetId: string): boolean { return this.send(MessageType.PartyKick, { targetId }); }

  getPartyPanelData(): PartyPanelData {
    const selfId = this.room.sessionId;
    const self = this.room.state.players.get(selfId);
    const partyId = self?.partyId ?? '';
    const party = this.room.state.parties?.get(partyId);
    const members: PartyMember[] = [];
    for (const id of party?.members ?? []) {
      const p = this.room.state.players.get(id);
      if (p) members.push({ id, name: p.name, level: p.level, mapId: p.mapId, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, dead: p.dead });
    }
    const candidates: PartyPanelData['candidates'] = [];
    this.room.state.players.forEach((p: any, id: string) => {
      if (id !== selfId && !p.partyId && p.mapId === self?.mapId) candidates.push({ id, name: p.name, level: p.level });
    });
    return { selfId, partyId, leaderId: party?.leaderId ?? '', members, candidates, invitation: this.partyInvitation };
  }

  /** Envía la intención de crear una guild nueva (el jugador local pasa a ser el líder). */
  sendCreateGuild(name: string, tag: string): boolean {
    const msg: CreateGuildMessage = { name, tag };
    return this.send(MessageType.CreateGuild, msg);
  }

  /** Envía la intención de unirse a una guild existente. */
  sendJoinGuild(guildId: string): boolean {
    const msg: JoinGuildMessage = { guildId };
    return this.send(MessageType.JoinGuild, msg);
  }

  /** Envía la intención de abandonar la guild actual. */
  sendLeaveGuild(): boolean {
    return this.send(MessageType.LeaveGuild, {});
  }

  /** Envía la intención de equipar un ítem del inventario (el server valida slot/posesión). */
  sendEquipItem(itemTemplateId: string): boolean {
    const msg: EquipItemMessage = { itemTemplateId };
    return this.send(MessageType.EquipItem, msg);
  }

  /** Envía la intención de desequipar el slot dado; el ítem vuelve al inventario. */
  sendUnequipItem(slot: string): boolean {
    const msg: UnequipItemMessage = { slot };
    return this.send(MessageType.UnequipItem, msg);
  }

  /** Envía la intención de lucir un título desbloqueado ("" = ninguno). */
  sendSetTitle(title: string): boolean {
    const msg: SetTitleMessage = { title };
    return this.send(MessageType.SetTitle, msg);
  }

  /** Estado de retención del jugador local (racha, diaria, logros, título). */
  getProgress(): {
    loginStreak: number;
    dailyQuestId: string;
    dailyProgress: number;
    dailyDone: boolean;
    totalKills: number;
    title: string;
    achievements: string[];
  } {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return { loginStreak: 0, dailyQuestId: "", dailyProgress: 0, dailyDone: false, totalKills: 0, title: "", achievements: [] };
    const achievements: string[] = [];
    p.achievements?.forEach((id: string) => achievements.push(id));
    return {
      loginStreak: p.loginStreak ?? 0,
      dailyQuestId: p.dailyQuestId ?? "",
      dailyProgress: p.dailyProgress ?? 0,
      dailyDone: p.dailyDone ?? false,
      totalKills: p.totalKills ?? 0,
      title: p.title ?? "",
      achievements,
    };
  }

  get sessionId(): string {
    return this.room.sessionId;
  }

  /**
   * Estado del jefe del mundo (Etapa 14) para la barra en pantalla: nombre, HP y
   * si está muerto. Escanea los mobs por `isBoss`; null si no hay jefe en el estado.
   */
  getBossState(): { name: string; hp: number; maxHp: number; dead: boolean } | null {
    // Sólo mostrar la barra del jefe si el jugador local está en el mapa del jefe.
    const self: any = this.room.state.players.get(this.room.sessionId);
    const myMap = self?.mapId ?? "pueblo";
    let out: { name: string; hp: number; maxHp: number; dead: boolean } | null = null;
    this.room.state.mobs.forEach((m: any) => {
      if (out) return;
      if (isBoss(m.templateId) && (m.mapId ?? "") === myMap) {
        out = { name: getTemplate(m.templateId).name, hp: m.hp, maxHp: m.maxHp, dead: m.dead };
      }
    });
    return out;
  }

  /** Envía la intención de viajar a un mapa (Etapa 15, menú M). El server valida el gate. */
  sendWarpTo(mapId: string): boolean {
    const msg: WarpToMessage = { mapId };
    return this.send(MessageType.WarpTo, msg);
  }

  /** Envía la intención de interactuar con un objeto de mundo (Etapa 16). */
  sendInteractObject(objectId: string): boolean {
    const msg: InteractObjectMessage = { objectId };
    return this.send(MessageType.InteractObject, msg);
  }

  /**
   * Snapshot de combate del jugador local (HP/MP/dead), leído en vivo del
   * estado sincronizado (`state.players.get(sessionId)`). Sólo lectura — el
   * HUD lo usa cada frame; nunca muta el estado (server autoritativo). Null
   * si el propio jugador todavía no llegó al estado (frame de conexión).
   */
  getAdventureTarget(): { x: number; z: number; label: string } | undefined {
    const p = this.room.state.players.get(this.room.sessionId);
    if (!p) return undefined;
    let targets: readonly string[] = [];
    if (p.mapId === "cripta") {
      targets = p.dungeonStage === 4 ? ["crypt_warden"] : CRYPT_WAVE_TEMPLATES[p.dungeonStage ?? 0] ?? [];
    } else {
      try {
        const q = getQuest(p.questId);
        if (p.questProgress < q.amount && (!q.objective || q.objective === "kill")) targets = [q.mobTemplateId];
      } catch { return undefined; }
    }
    if (!targets.length) return undefined;
    let nearest: { x: number; z: number; label: string } | undefined;
    let distance = Infinity;
    this.room.state.mobs.forEach((m: any) => {
      if (m.dead || m.mapId !== p.mapId || !targets.includes(m.templateId)) return;
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d < distance) { distance = d; nearest = { x: m.x, z: m.z, label: getTemplate(m.templateId).name }; }
    });
    return nearest;
  }

  getSelf(): SelfCombatSnapshot | null {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return null;
    return {
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      dead: p.dead,
      exp: p.exp,
      level: p.level,
      gold: p.gold ?? 0,
      questId: p.questId ?? "",
      questProgress: p.questProgress ?? 0,
      bountyId: p.bountyId ?? "",
      bountyProgress: p.bountyProgress ?? 0,
      str: p.str ?? 0,
      agi: p.agi ?? 0,
      vit: p.vit ?? 0,
      ene: p.ene ?? 0,
      statPoints: p.statPoints ?? 0,
      stunMs: p.stunMs ?? 0,
      rootMs: p.rootMs ?? 0,
      className: p.className ?? "knight",
      pAtk: p.pAtk ?? 0,
      pDef: p.pDef ?? 0,
      mapId: p.mapId ?? "pueblo",
      dungeonStage: p.dungeonStage ?? 0,
      dungeonKills: p.dungeonKills ?? 0,
    };
  }

  /** Equipo del jugador local: slot → itemTemplateId (sólo lectura del estado sincronizado). */
  getEquipment(): Record<string, string> {
    const p: any = this.room.state.players.get(this.room.sessionId);
    const out: Record<string, string> = {};
    if (!p?.equipment) return out;
    p.equipment.forEach((itemId: string, slot: string) => {
      if (itemId) out[slot] = itemId;
    });
    return out;
  }

  /** Permanently learned tome skill ids for the local player. */
  getLearnedTomes(): string[] {
    const p: any = this.room.state.players.get(this.room.sessionId);
    const out: string[] = [];
    p?.learnedTomes?.forEach((id: string) => out.push(id));
    return out;
  }

  /**
   * Inventario del jugador local, leído en vivo del estado sincronizado
   * (`state.players.get(sessionId).inventory`, un MapSchema). Sólo lectura —
   * el panel de inventario lo usa para re-renderizar la lista. Array vacío
   * si el propio jugador todavía no llegó al estado.
   */
  getInventory(): { itemTemplateId: string; qty: number }[] {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return [];
    const out: { itemTemplateId: string; qty: number }[] = [];
    p.inventory.forEach((item: any) => {
      out.push({ itemTemplateId: item.itemTemplateId, qty: item.qty });
    });
    return out;
  }

  /**
   * Posiciones de todas las entidades vivas para el minimapa: el jugador local
   * ("self"), otros jugadores ("player"), mobs comunes ("mob") y jefes ("boss").
   * Sólo lectura del estado sincronizado; los muertos se omiten.
   */
  getMinimapEntities(): { x: number; z: number; kind: "self" | "player" | "mob" | "boss" }[] {
    const self: any = this.room.state.players.get(this.room.sessionId);
    const myMap = self?.mapId ?? "pueblo";
    const out: { x: number; z: number; kind: "self" | "player" | "mob" | "boss" }[] = [];
    this.room.state.players.forEach((p: any, id: string) => {
      if (p.dead || (p.mapId ?? "pueblo") !== myMap) return; // sólo el mapa actual
      out.push({ x: p.x, z: p.z, kind: id === this.room.sessionId ? "self" : "player" });
    });
    this.room.state.mobs.forEach((m: any) => {
      if (m.dead || (m.mapId ?? "") !== myMap) return;
      out.push({ x: m.x, z: m.z, kind: isBoss(m.templateId) ? "boss" : "mob" });
    });
    return out;
  }

  /**
   * Datos para el panel de guild: la guild del jugador local (id vacío si
   * ninguna), todas las guilds vivas (`state.guilds`) y el roster (nombres)
   * de los jugadores que comparten `guildId` con el jugador local. Sólo
   * lectura del estado sincronizado.
   */
  getGuildPanelData(): {
    myGuildId: string;
    guilds: { id: string; name: string; tag: string; leaderName: string; bossKills: number }[];
    roster: string[];
  } {
    const self: any = this.room.state.players.get(this.room.sessionId);
    const myGuildId: string = self?.guildId ?? "";

    const guilds: { id: string; name: string; tag: string; leaderName: string; bossKills: number }[] = [];
    this.room.state.guilds.forEach((g: any) => {
      guilds.push({ id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills });
    });

    const roster: string[] = [];
    if (myGuildId) {
      this.room.state.players.forEach((p: any) => {
        if (p.guildId === myGuildId) roster.push(p.name);
      });
    }

    return { myGuildId, guilds, roster };
  }

  /**
   * Datos para el panel de leaderboard: top jugadores y top guilds tal como
   * los sincroniza el servidor en `state.leaderboard` (refrescado cada ~15s).
   * Sólo lectura del estado sincronizado; `leaderboard` puede no existir
   * todavía antes del primer sync.
   */
  getLeaderboardData(): {
    players: { name: string; level: number; pvpKills: number; className: string }[];
    guilds: { name: string; tag: string; bossKills: number }[];
  } {
    const leaderboard: any = this.room.state.leaderboard;
    if (!leaderboard) return { players: [], guilds: [] };

    const players = [...leaderboard.players].map((e: any) => ({
      name: e.name,
      level: e.level,
      pvpKills: e.pvpKills,
      className: e.className,
    }));
    const guilds = [...leaderboard.guilds].map((e: any) => ({
      name: e.name,
      tag: e.tag,
      bossKills: e.bossKills,
    }));

    return { players, guilds };
  }
}

/**
 * ¿El fallo de connect() es de autenticación (contraseña/nombre) y no de conexión?
 * Colyseus reporta los errores de onAuth con un código en el rango 4xxx; una
 * conexión rechazada (server caído) no trae ese código. Sirve para decidir si
 * re-pedir la contraseña o mostrar "Aden dormida".
 */
export function isAuthError(err: unknown): boolean {
  const e = err as { code?: number } | null;
  return !!e && typeof e.code === "number" && e.code >= 4000 && e.code < 5000;
}
