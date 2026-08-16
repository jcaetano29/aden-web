export const MessageType = {
  MoveTo: "moveTo",
  SetTarget: "setTarget",
  Damage: "damage",
  Death: "death",
} as const;

export interface MoveToMessage {
  x: number;
  z: number;
}

export interface SetTargetMessage {
  targetId: string;
}

export interface DamageEvent {
  targetId: string;
  amount: number;
  hp: number;
}

export interface DeathEvent {
  entityId: string;
}
