import { Client, Room } from "colyseus.js";
import { MessageType, type MoveToMessage } from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean) => void;
  onChange: (id: string, x: number, z: number) => void;
  onRemove: (id: string) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name });
    const selfId = this.room.sessionId;

    this.room.state.players.onAdd((player: any, id: string) => {
      cb.onAdd(id, id === selfId);
      cb.onChange(id, player.x, player.z);
      player.onChange(() => cb.onChange(id, player.x, player.z));
    });
    this.room.state.players.onRemove((_player: any, id: string) => cb.onRemove(id));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }
}
