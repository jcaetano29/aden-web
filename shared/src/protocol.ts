export const MessageType = {
  ChatSend: "chatSend",
  ChatMessage: "chatMessage",
  ChatError: "chatError",
  MoveTo: "moveTo",
  SetTarget: "setTarget",
  Damage: "damage",
  Death: "death",
  UseSkill: "useSkill",
  LevelUp: "levelUp",
  InteractNpc: "interactNpc",
  UseItem: "useItem",
  PickupItem: "pickupItem",
  ItemResult: "itemResult",
  BuyItem: "buyItem",
  CreateGuild: "createGuild",
  JoinGuild: "joinGuild",
  LeaveGuild: "leaveGuild",
  BossKilled: "bossKilled",
  EquipItem: "equipItem",
  UnequipItem: "unequipItem",
  DailyReset: "dailyReset",
  DailyComplete: "dailyComplete",
  Achievement: "achievement",
  SetTitle: "setTitle",
  WorldAnnounce: "worldAnnounce",
  WarpTo: "warpTo",
  InteractObject: "interactObject",
  SkillCast: "skillCast",
  AllocateStat: "allocateStat",
  PartyInvite: "partyInvite",
  PartyRespond: "partyRespond",
  PartyLeave: "partyLeave",
  PartyKick: "partyKick",
  PartyInvitation: "partyInvitation",
} as const;

export const PARTY_MAX_MEMBERS = 10;
export const PARTY_REWARD_RANGE = 25;
export const PARTY_INVITE_MS = 30000;

export interface PartyInvitation {
  inviterId: string;
  inviterName: string;
  expiresAt: number;
}

export interface MoveToMessage {
  x: number;
  z: number;
}

export interface SetTargetMessage {
  targetId: string;
}

export interface UseSkillMessage {
  skillId: string;
}

export interface DamageEvent {
  periodic?: boolean;
  skillId?: string;
  attackerId?: string;
  targetId: string;
  amount: number;
  hp: number;
  /** true = el ataque fue esquivado (el objetivo salió del rango durante el wind-up); amount 0. */
  dodged?: boolean;
}

export interface DeathEvent {
  entityId: string;
}

export interface LevelUpEvent {
  level: number;
  /** Etapa 22: skills recién aprendidos al llegar a este nivel. */
  learned?: string[];
}

export interface InteractNpcMessage {
  npcId?: string;
}

export interface UseItemMessage {
  itemTemplateId: string;
  targetItemId?: string;
}

export interface BuyItemMessage {
  itemTemplateId: string;
  qty?: number;
}

export interface CreateGuildMessage {
  name: string;
  tag: string;
}

export interface JoinGuildMessage {
  guildId: string;
}

export interface BossKilledEvent {
  bossName: string;
  guildTag: string;
  guildName: string;
}

export interface EquipItemMessage {
  itemTemplateId: string;
}

export interface UnequipItemMessage {
  /** slot a vaciar: "weapon" | "armor" | "accessory". */
  slot: string;
}

/** Server→cliente: entraste en un día nuevo (racha + recompensa + diaria asignada). */
export interface DailyResetEvent {
  streak: number;
  reward: number;
  dailyDesc: string;
}

/** Server→cliente: completaste la misión diaria (recompensa otorgada). */
export interface DailyCompleteEvent {
  rewardGold: number;
  rewardExp: number;
}

/** Server→cliente: desbloqueaste un logro. */
export interface AchievementEvent {
  id: string;
  name: string;
  title: string;
}

/** Cliente→server: lucir un título desbloqueado ("" = ninguno). */
export interface SetTitleMessage {
  title: string;
}

/** Server→todos: anuncio de evento de mundo (jefe despierta / cae). */
export interface WorldAnnounceEvent {
  text: string;
}

/** Cliente→server: viajar a un mapa (Etapa 15, menú M). El server valida el gate por nivel. */
export interface WarpToMessage {
  mapId: string;
}

/** Cliente→server: interactuar con un objeto de mundo (Etapa 16): cofre/barril/santuario. */
export interface InteractObjectMessage {
  objectId: string;
}

/** Server→todos: un jugador lanzó una skill (Etapa 17), para renderizar su VFX en todos los clientes. */
export interface SkillCastEvent {
  /** Authoritative positions avoid stale client interpolation during dashes. */
  origin?: { x: number; z: number };
  destination?: { x: number; z: number };
  targetPosition?: { x: number; z: number };
  mapId?: string;
  casterId: string;
  skillId: string;
  /** objetivo del efecto ("" para heal/buff sobre uno mismo). */
  targetId: string;
  /** Etapa 22: monto de cura (o daño) para mostrar un número sobre el caster. */
  amount?: number;
}

/** Cliente→server: gastar un punto de atributo (Etapa 21). attr ∈ str|agi|vit|ene. */
export interface AllocateStatMessage {
  attr: string;
}
