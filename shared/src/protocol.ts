export const MessageType = {
  MoveTo: "moveTo",
} as const;

export interface MoveToMessage {
  x: number;
  z: number;
}
