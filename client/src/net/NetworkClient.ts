import { Client, Room } from "colyseus.js";
import {
  MessageType,
  type MoveToMessage,
  type SetTargetMessage,
  type UseSkillMessage,
  type DamageEvent,
  type DeathEvent,
  type LevelUpEvent,
  type BossKilledEvent,
  type DailyResetEvent,
  type DailyCompleteEvent,
  type AchievementEvent,
  type SetTitleMessage,
  type InteractNpcMessage,
  type BuyItemMessage,
  type UseItemMessage,
  type CreateGuildMessage,
  type JoinGuildMessage,
  type EquipItemMessage,
  type UnequipItemMessage,
  isBoss,
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
  /** Clase del jugador (knight/mage/barbarian/rogue); se sincroniza desde el server. Solo para jugadores. */
  className?: string;
  /** Tag de guild ("" si no pertenece a ninguna); se sincroniza desde el server. Solo para jugadores. */
  guildTag?: string;
  /** Título lucido (Etapa 13, logros); "" si ninguno. Solo para jugadores. */
  title?: string;
}

/** Snapshot de mob: incluye combate (hp/maxHp/dead) para highlight/HUD. */
export interface MobSnapshot extends PlayerSnapshot {
  hp: number;
  maxHp: number;
  dead: boolean;
  windupMs: number;
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
  /** Campos de misión y oro, sincronizados por el server. */
  gold: number;
  questId: string;
  questProgress: number;
  /** Clase del jugador local. */
  className: string;
  /** Stats de combate efectivos (base + equipo), para mostrar el impacto del gear. */
  pAtk: number;
  pDef: number;
}

export interface RoomCallbacks {
  onAdd: (id: string, isSelf: boolean, snap: PlayerSnapshot) => void;
  onChange: (id: string, snap: PlayerSnapshot) => void;
  onRemove: (id: string) => void;
  onMobAdd: (id: string, templateId: string, snap: MobSnapshot) => void;
  onMobChange: (id: string, snap: MobSnapshot) => void;
  onMobRemove: (id: string) => void;
  /** Ítem droppeado en el piso (sincronizado desde `state.droppedItems`). */
  onItemAdd: (id: string, itemTemplateId: string, x: number, z: number) => void;
  onItemRemove: (id: string) => void;
  onDamage: (ev: DamageEvent) => void;
  onDeath: (entityId: string) => void;
  /** Disparado cuando el server sube de nivel al jugador local (mensaje dirigido `levelUp`). */
  onLevelUp: (level: number) => void;
  /** Disparado server-wide cuando una guild abate al jefe (broadcast `bossKilled`). */
  onBossKilled: (ev: BossKilledEvent) => void;
  /** Etapa 13: día nuevo (racha + recompensa + diaria asignada). */
  onDailyReset: (ev: DailyResetEvent) => void;
  /** Etapa 13: misión diaria completada. */
  onDailyComplete: (ev: DailyCompleteEvent) => void;
  /** Etapa 13: logro desbloqueado. */
  onAchievement: (ev: AchievementEvent) => void;
}

export class NetworkClient {
  private room!: Room;

  async connect(name: string, className: string, cb: RoomCallbacks): Promise<void> {
    const client = new Client(SERVER_URL);
    this.room = await client.joinOrCreate("game", { name, className });
    const selfId = this.room.sessionId;

    const snap = (p: any): PlayerSnapshot => ({
      name: p.name,
      x: p.x,
      z: p.z,
      targetX: p.targetX,
      targetZ: p.targetZ,
      moving: p.moving,
      dead: p.dead,
      className: p.className,
      guildTag: p.guildTag ?? "",
      title: p.title ?? "",
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
      windupMs: m.windupMs ?? 0,
    });

    this.room.state.mobs.onAdd((mob: any, id: string) => {
      cb.onMobAdd(id, mob.templateId, snapMob(mob));
      mob.onChange(() => cb.onMobChange(id, snapMob(mob)));
    });
    this.room.state.mobs.onRemove((_m: any, id: string) => cb.onMobRemove(id));

    this.room.state.droppedItems.onAdd((it: any, id: string) =>
      cb.onItemAdd(id, it.itemTemplateId, it.x, it.z),
    );
    this.room.state.droppedItems.onRemove((_it: any, id: string) => cb.onItemRemove(id));

    this.room.onMessage(MessageType.Damage, (data: DamageEvent) => cb.onDamage(data));
    this.room.onMessage(MessageType.Death, (data: DeathEvent) => cb.onDeath(data.entityId));
    this.room.onMessage(MessageType.LevelUp, (data: LevelUpEvent) => cb.onLevelUp(data.level));
    this.room.onMessage(MessageType.BossKilled, (data: BossKilledEvent) => cb.onBossKilled(data));
    this.room.onMessage(MessageType.DailyReset, (data: DailyResetEvent) => cb.onDailyReset(data));
    this.room.onMessage(MessageType.DailyComplete, (data: DailyCompleteEvent) => cb.onDailyComplete(data));
    this.room.onMessage(MessageType.Achievement, (data: AchievementEvent) => cb.onAchievement(data));
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

  /** Envía la intención de interactuar con el NPC (aceptar/entregar misión). */
  sendInteractNpc() {
    const msg: InteractNpcMessage = {};
    this.room.send(MessageType.InteractNpc, msg);
  }

  /** Envía la intención de comprar un ítem en la tienda. */
  sendBuyItem(itemTemplateId: string, qty = 1) {
    const msg: BuyItemMessage = { itemTemplateId, qty };
    this.room.send(MessageType.BuyItem, msg);
  }

  /** Envía la intención de usar un ítem consumible (p.ej. poción). */
  sendUseItem(itemTemplateId: string) {
    const msg: UseItemMessage = { itemTemplateId };
    this.room.send(MessageType.UseItem, msg);
  }

  /** Envía la intención de crear una guild nueva (el jugador local pasa a ser el líder). */
  sendCreateGuild(name: string, tag: string) {
    const msg: CreateGuildMessage = { name, tag };
    this.room.send(MessageType.CreateGuild, msg);
  }

  /** Envía la intención de unirse a una guild existente. */
  sendJoinGuild(guildId: string) {
    const msg: JoinGuildMessage = { guildId };
    this.room.send(MessageType.JoinGuild, msg);
  }

  /** Envía la intención de abandonar la guild actual. */
  sendLeaveGuild() {
    this.room.send(MessageType.LeaveGuild, {});
  }

  /** Envía la intención de equipar un ítem del inventario (el server valida slot/posesión). */
  sendEquipItem(itemTemplateId: string) {
    const msg: EquipItemMessage = { itemTemplateId };
    this.room.send(MessageType.EquipItem, msg);
  }

  /** Envía la intención de desequipar el slot dado; el ítem vuelve al inventario. */
  sendUnequipItem(slot: string) {
    const msg: UnequipItemMessage = { slot };
    this.room.send(MessageType.UnequipItem, msg);
  }

  /** Envía la intención de lucir un título desbloqueado ("" = ninguno). */
  sendSetTitle(title: string) {
    const msg: SetTitleMessage = { title };
    this.room.send(MessageType.SetTitle, msg);
  }

  /** Estado de retención del jugador local (racha, diaria, logros, título). */
  getProgress(): {
    loginStreak: number;
    dailyQuestId: string;
    dailyProgress: number;
    dailyDone: boolean;
    totalKills: number;
    title: string;
    achievements: string[];
  } {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return { loginStreak: 0, dailyQuestId: "", dailyProgress: 0, dailyDone: false, totalKills: 0, title: "", achievements: [] };
    const achievements: string[] = [];
    p.achievements?.forEach((id: string) => achievements.push(id));
    return {
      loginStreak: p.loginStreak ?? 0,
      dailyQuestId: p.dailyQuestId ?? "",
      dailyProgress: p.dailyProgress ?? 0,
      dailyDone: p.dailyDone ?? false,
      totalKills: p.totalKills ?? 0,
      title: p.title ?? "",
      achievements,
    };
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
      gold: p.gold ?? 0,
      questId: p.questId ?? "",
      questProgress: p.questProgress ?? 0,
      className: p.className ?? "knight",
      pAtk: p.pAtk ?? 0,
      pDef: p.pDef ?? 0,
    };
  }

  /** Equipo del jugador local: slot → itemTemplateId (sólo lectura del estado sincronizado). */
  getEquipment(): Record<string, string> {
    const p: any = this.room.state.players.get(this.room.sessionId);
    const out: Record<string, string> = {};
    if (!p?.equipment) return out;
    p.equipment.forEach((itemId: string, slot: string) => {
      if (itemId) out[slot] = itemId;
    });
    return out;
  }

  /**
   * Inventario del jugador local, leído en vivo del estado sincronizado
   * (`state.players.get(sessionId).inventory`, un MapSchema). Sólo lectura —
   * el panel de inventario lo usa para re-renderizar la lista. Array vacío
   * si el propio jugador todavía no llegó al estado.
   */
  getInventory(): { itemTemplateId: string; qty: number }[] {
    const p: any = this.room.state.players.get(this.room.sessionId);
    if (!p) return [];
    const out: { itemTemplateId: string; qty: number }[] = [];
    p.inventory.forEach((item: any) => {
      out.push({ itemTemplateId: item.itemTemplateId, qty: item.qty });
    });
    return out;
  }

  /**
   * Posiciones de todas las entidades vivas para el minimapa: el jugador local
   * ("self"), otros jugadores ("player"), mobs comunes ("mob") y jefes ("boss").
   * Sólo lectura del estado sincronizado; los muertos se omiten.
   */
  getMinimapEntities(): { x: number; z: number; kind: "self" | "player" | "mob" | "boss" }[] {
    const out: { x: number; z: number; kind: "self" | "player" | "mob" | "boss" }[] = [];
    this.room.state.players.forEach((p: any, id: string) => {
      if (p.dead) return;
      out.push({ x: p.x, z: p.z, kind: id === this.room.sessionId ? "self" : "player" });
    });
    this.room.state.mobs.forEach((m: any) => {
      if (m.dead) return;
      out.push({ x: m.x, z: m.z, kind: isBoss(m.templateId) ? "boss" : "mob" });
    });
    return out;
  }

  /**
   * Datos para el panel de guild: la guild del jugador local (id vacío si
   * ninguna), todas las guilds vivas (`state.guilds`) y el roster (nombres)
   * de los jugadores que comparten `guildId` con el jugador local. Sólo
   * lectura del estado sincronizado.
   */
  getGuildPanelData(): {
    myGuildId: string;
    guilds: { id: string; name: string; tag: string; leaderName: string; bossKills: number }[];
    roster: string[];
  } {
    const self: any = this.room.state.players.get(this.room.sessionId);
    const myGuildId: string = self?.guildId ?? "";

    const guilds: { id: string; name: string; tag: string; leaderName: string; bossKills: number }[] = [];
    this.room.state.guilds.forEach((g: any) => {
      guilds.push({ id: g.id, name: g.name, tag: g.tag, leaderName: g.leaderName, bossKills: g.bossKills });
    });

    const roster: string[] = [];
    if (myGuildId) {
      this.room.state.players.forEach((p: any) => {
        if (p.guildId === myGuildId) roster.push(p.name);
      });
    }

    return { myGuildId, guilds, roster };
  }

  /**
   * Datos para el panel de leaderboard: top jugadores y top guilds tal como
   * los sincroniza el servidor en `state.leaderboard` (refrescado cada ~15s).
   * Sólo lectura del estado sincronizado; `leaderboard` puede no existir
   * todavía antes del primer sync.
   */
  getLeaderboardData(): {
    players: { name: string; level: number; pvpKills: number; className: string }[];
    guilds: { name: string; tag: string; bossKills: number }[];
  } {
    const leaderboard: any = this.room.state.leaderboard;
    if (!leaderboard) return { players: [], guilds: [] };

    const players = [...leaderboard.players].map((e: any) => ({
      name: e.name,
      level: e.level,
      pvpKills: e.pvpKills,
      className: e.className,
    }));
    const guilds = [...leaderboard.guilds].map((e: any) => ({
      name: e.name,
      tag: e.tag,
      bossKills: e.bossKills,
    }));

    return { players, guilds };
  }
}
