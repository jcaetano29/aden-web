import { Client, Room } from "colyseus.js";
import { MessageType, type MoveToMessage, type SetTargetMessage, type DeathEvent } from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface PlayerSnapshot {
  name: string;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
}

/** Snapshot de mob: incluye combate (hp/maxHp/dead) para highlight/HUD. */
export interface MobSnapshot extends PlayerSnapshot {
  hp: number;
  maxHp: number;
  dead: boolean;
}

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
  onMobAdd: (id: string, templateId: string, snap: MobSnapshot) => void;
  onMobChange: (id: string, snap: MobSnapshot) => void;
  onMobRemove: (id: string) => void;
  onDeath: (entityId: string) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name });
    const selfId = this.room.sessionId;

    const snap = (p: any): PlayerSnapshot => ({
      name: p.name,
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
    });

    this.room.state.mobs.onAdd((mob: any, id: string) => {
      cb.onMobAdd(id, mob.templateId, snapMob(mob));
      mob.onChange(() => cb.onMobChange(id, snapMob(mob)));
    });
    this.room.state.mobs.onRemove((_m: any, id: string) => cb.onMobRemove(id));

    this.room.onMessage(MessageType.Death, (data: DeathEvent) => cb.onDeath(data.entityId));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }

  sendSetTarget(targetId: string) {
    const msg: SetTargetMessage = { targetId };
    this.room.send(MessageType.SetTarget, msg);
  }

  get sessionId(): string {
    return this.room.sessionId;
  }
}
