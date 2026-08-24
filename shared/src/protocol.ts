export const MessageType = {
  MoveTo: "moveTo",
  SetTarget: "setTarget",
  Damage: "damage",
  Death: "death",
  UseSkill: "useSkill",
  LevelUp: "levelUp",
  InteractNpc: "interactNpc",
  UseItem: "useItem",
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
} as const;

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
}

export interface InteractNpcMessage {
  npcId?: string;
}

export interface UseItemMessage {
  itemTemplateId: string;
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
