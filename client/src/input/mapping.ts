import type { MoveToMessage } from "@aden/shared";

export function groundPointToMove(point: { x: number; y: number; z: number }): MoveToMessage {
  return { x: point.x, z: point.z };
}
