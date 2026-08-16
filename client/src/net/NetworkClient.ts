import { Client, Room } from "colyseus.js";
import {
  MessageType,
  type MoveToMessage,
  type SetTargetMessage,
  type UseSkillMessage,
  type DamageEvent,
  type DeathEvent,
  type LevelUpEvent,
} from "@aden/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export interface PlayerSnapshot {
  name: string;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  moving: boolean;
  /** Muerto/respawneando (server-autoritativo); permite animar death/respawn de OTROS jugadores. */
  dead: boolean;
}

/** Snapshot de mob: incluye combate (hp/maxHp/dead) para highlight/HUD. */
export interface MobSnapshot extends PlayerSnapshot {
  hp: number;
  maxHp: number;
  dead: boolean;
}

/** Campos de combate del jugador local, leídos directamente del estado sincronizado (HUD). */
export interface SelfCombatSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  dead: boolean;
  /** EXP y nivel sincronizados por el server (autoritativo); el HUD sólo los muestra. */
  exp: number;
  level: number;
}

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
  onMobAdd: (id: string, templateId: string, snap: MobSnapshot) => void;
  onMobChange: (id: string, snap: MobSnapshot) => void;
  onMobRemove: (id: string) => void;
  onDamage: (ev: DamageEvent) => void;
  onDeath: (entityId: string) => void;
  /** Disparado cuando el server sube de nivel al jugador local (mensaje dirigido `levelUp`). */
  onLevelUp: (level: number) => void;
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
      dead: p.dead,
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

    this.room.onMessage(MessageType.Damage, (data: DamageEvent) => cb.onDamage(data));
    this.room.onMessage(MessageType.Death, (data: DeathEvent) => cb.onDeath(data.entityId));
    this.room.onMessage(MessageType.LevelUp, (data: LevelUpEvent) => cb.onLevelUp(data.level));
  }

  sendMove(msg: MoveToMessage) {
    this.room.send(MessageType.MoveTo, msg);
  }

  sendSetTarget(targetId: string) {
    const msg: SetTargetMessage = { targetId };
    this.room.send(MessageType.SetTarget, msg);
  }

  /** Envía la intención de usar una skill (p.ej. "power_strike"). El server resuelve target/rango/MP/cooldown. */
  sendUseSkill(skillId: string) {
    const msg: UseSkillMessage = { skillId };
    this.room.send(MessageType.UseSkill, msg);
  }

  get sessionId(): string {
    return this.room.sessionId;
  }

  /**
   * Snapshot de combate del jugador local (HP/MP/dead), leído en vivo del
   * estado sincronizado (`state.players.get(sessionId)`). Sólo lectura — el
   * HUD lo usa cada frame; nunca muta el estado (server autoritativo). Null
   * si el propio jugador todavía no llegó al estado (frame de conexión).
   */
  getSelf(): SelfCombatSnapshot | null {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return null;
    return {
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      dead: p.dead,
      exp: p.exp,
      level: p.level,
    };
  }
}
