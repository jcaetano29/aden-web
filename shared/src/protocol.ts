export const MessageType = {
  MoveTo: "moveTo",
  SetTarget: "setTarget",
  Damage: "damage",
  Death: "death",
  UseSkill: "useSkill",
  LevelUp: "levelUp",
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
}

export interface DeathEvent {
  entityId: string;
}

export interface LevelUpEvent {
  level: number;
}
