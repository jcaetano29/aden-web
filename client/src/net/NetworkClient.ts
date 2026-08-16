import { Client, Room } from "colyseus.js";
import { MessageType, type MoveToMessage } from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface PlayerSnapshot {
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name });
    const selfId = this.room.sessionId;

    const snap = (p: any): PlayerSnapshot => ({
      x: p.x,
      z: p.z,
      targetX: p.targetX,
      targetZ: p.targetZ,
      moving: p.moving,
    });

    this.room.state.players.onAdd((player: any, id: string) => {
      cb.onAdd(id, id === selfId, snap(player));
      player.onChange(() => cb.onChange(id, snap(player)));
    });
    this.room.state.players.onRemove((_player: any, id: string) => cb.onRemove(id));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }

  get sessionId(): string {
    return this.room.sessionId;
  }
}
