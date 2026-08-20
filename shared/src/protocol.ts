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
