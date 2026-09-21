import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@aden/shared";

const transport = vi.hoisted(() => ({
  joinOrCreate: vi.fn(),
}));

vi.mock("colyseus.js", () => ({
  Client: class {
    joinOrCreate = transport.joinOrCreate;
  },
  Room: class {},
}));

import { NetworkClient, type RoomCallbacks } from "./NetworkClient.js";

class FakeCollection<T> extends Map<string, T> {
  onAdd(_callback: (value: T, key: string) => void): void {}
  onRemove(_callback: (value: T, key: string) => void): void {}
}

class FakeRoom {
  readonly sessionId: string;
  readonly sent: Array<[string, unknown]> = [];
  readonly state = {
    players: new FakeCollection<any>(),
    mobs: new FakeCollection<any>(),
    droppedItems: new FakeCollection<any>(),
    worldObjects: new FakeCollection<any>(),
    parties: new FakeCollection<any>(),
  };
  failSend = false;
  private leaveHandlers: Array<() => void> = [];
  private messageHandlers = new Map<string, Array<(data: unknown) => void>>();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.state.players.set(sessionId, { partyId: "", mapId: "pueblo" });
  }

  onLeave(callback: () => void): void {
    this.leaveHandlers.push(callback);
  }

  onMessage(type: string, callback: (data: unknown) => void): void {
    const callbacks = this.messageHandlers.get(type) ?? [];
    callbacks.push(callback);
    this.messageHandlers.set(type, callbacks);
  }

  send(type: string, payload?: unknown): void {
    if (this.failSend) throw new Error("transport closed");
    this.sent.push([type, payload]);
  }

  emitLeave(): void {
    for (const callback of this.leaveHandlers) callback();
  }

  emitMessage(type: string, data: unknown): void {
    for (const callback of this.messageHandlers.get(type) ?? []) callback(data);
  }
}

function callbacks(onConnectionChange = vi.fn()): RoomCallbacks {
  return {
    onConnectionChange,
    onAdd: vi.fn(),
    onChange: vi.fn(),
    onRemove: vi.fn(),
    onMobAdd: vi.fn(),
    onMobChange: vi.fn(),
    onMobRemove: vi.fn(),
    onItemAdd: vi.fn(),
    onItemRemove: vi.fn(),
    onDamage: vi.fn(),
    onDeath: vi.fn(),
    onLevelUp: vi.fn(),
    onBossKilled: vi.fn(),
    onDailyReset: vi.fn(),
    onDailyComplete: vi.fn(),
    onAchievement: vi.fn(),
    onWorldAnnounce: vi.fn(),
    onObjectAdd: vi.fn(),
    onObjectChange: vi.fn(),
    onObjectRemove: vi.fn(),
    onSkillCast: vi.fn(),
  };
}

function commandCases(net: NetworkClient): Array<[() => boolean, string, unknown]> {
  return [
    [() => net.sendChat({ channel: "local", text: "hola" }), MessageType.ChatSend, { channel: "local", text: "hola" }],
    [() => net.sendMove({ x: 3, z: 8 }), MessageType.MoveTo, { x: 3, z: 8 }],
    [() => net.sendPickup("drop-1"), MessageType.PickupItem, { dropId: "drop-1" }],
    [() => net.sendSetTarget("mob-1"), MessageType.SetTarget, { targetId: "mob-1" }],
    [() => net.sendUseSkill("power_strike"), MessageType.UseSkill, { skillId: "power_strike" }],
    [() => net.sendInteractNpc("merchant"), MessageType.InteractNpc, { npcId: "merchant" }],
    [() => net.sendAllocateStat("str"), MessageType.AllocateStat, { attr: "str" }],
    [() => net.sendBuyItem("health_potion", 2), MessageType.BuyItem, { itemTemplateId: "health_potion", qty: 2 }],
    [() => net.sendUseItem("aden_gema_del_pacto", "weapon-instance"), MessageType.UseItem, { itemTemplateId: "aden_gema_del_pacto", targetItemId: "weapon-instance" }],
    [() => net.sendPartyInvite("ally"), MessageType.PartyInvite, { targetId: "ally" }],
    [() => net.sendPartyRespond("leader", true), MessageType.PartyRespond, { inviterId: "leader", accept: true }],
    [() => net.sendPartyLeave(), MessageType.PartyLeave, undefined],
    [() => net.sendPartyKick("member"), MessageType.PartyKick, { targetId: "member" }],
    [() => net.sendCreateGuild("Guardianes", "GUA"), MessageType.CreateGuild, { name: "Guardianes", tag: "GUA" }],
    [() => net.sendJoinGuild("guild-1"), MessageType.JoinGuild, { guildId: "guild-1" }],
    [() => net.sendLeaveGuild(), MessageType.LeaveGuild, {}],
    [() => net.sendEquipItem("iron_sword"), MessageType.EquipItem, { itemTemplateId: "iron_sword" }],
    [() => net.sendUnequipItem("weapon"), MessageType.UnequipItem, { slot: "weapon" }],
    [() => net.sendSetTitle("Defensor"), MessageType.SetTitle, { title: "Defensor" }],
    [() => net.sendWarpTo("bosque"), MessageType.WarpTo, { mapId: "bosque" }],
    [() => net.sendInteractObject("chest-1"), MessageType.InteractObject, { objectId: "chest-1" }],
  ];
}

beforeEach(() => {
  transport.joinOrCreate.mockReset();
});

describe("NetworkClient connection safety", () => {
  it("blocks every command before connect and after leave without replaying it on reconnect", async () => {
    const first = new FakeRoom("first");
    const second = new FakeRoom("second");
    transport.joinOrCreate.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const net = new NetworkClient();

    expect(net.isConnected).toBe(false);
    for (const [send] of commandCases(net)) expect(send()).toBe(false);
    await net.connect("Temporal", "clave-temporal", "", callbacks(), "login");
    first.sent.length = 0;
    first.emitLeave();

    expect(net.isConnected).toBe(false);
    for (const [send] of commandCases(net)) expect(send()).toBe(false);
    expect(first.sent).toEqual([]);

    await net.connect("Temporal", "clave-temporal", "", callbacks(), "login");
    expect(net.isConnected).toBe(true);
    expect(second.sent).toEqual([]);
  });

  it("returns true and preserves every command payload while connected", async () => {
    const room = new FakeRoom("self");
    transport.joinOrCreate.mockResolvedValue(room);
    const net = new NetworkClient();
    await net.connect("Temporal", "clave-temporal", "knight", callbacks(), "login");

    for (const [send, type, payload] of commandCases(net)) {
      expect(send()).toBe(true);
      expect(room.sent.at(-1)).toEqual([type, payload]);
    }
  });

  it("marks the active room disconnected once when its transport throws", async () => {
    const room = new FakeRoom("self");
    const onConnectionChange = vi.fn();
    transport.joinOrCreate.mockResolvedValue(room);
    const net = new NetworkClient();
    await net.connect("Temporal", "clave-temporal", "knight", callbacks(onConnectionChange), "login");
    room.emitMessage(MessageType.PartyInvitation, { inviterId: "ally", inviterName: "Aliada" });
    room.failSend = true;

    expect(net.sendMove({ x: 1, z: 2 })).toBe(false);
    expect(net.sendBuyItem("health_potion")).toBe(false);
    room.emitLeave();
    room.emitMessage(MessageType.PartyInvitation, { inviterId: "late", inviterName: "Tardía" });

    expect(net.isConnected).toBe(false);
    expect(onConnectionChange.mock.calls).toEqual([[true], [false]]);
    expect(net.getPartyPanelData().invitation).toBeNull();
  });

  it("ignores a leave callback from a room replaced by a newer connection", async () => {
    const first = new FakeRoom("first");
    const second = new FakeRoom("second");
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    transport.joinOrCreate.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const net = new NetworkClient();

    await net.connect("Temporal", "clave-temporal", "knight", callbacks(firstChange), "login");
    await net.connect("Temporal", "clave-temporal", "knight", callbacks(secondChange), "login");
    first.emitLeave();

    expect(net.isConnected).toBe(true);
    expect(firstChange).toHaveBeenCalledTimes(1);
    expect(secondChange.mock.calls).toEqual([[true]]);
    expect(net.sendMove({ x: 4, z: 5 })).toBe(true);
    expect(second.sent).toEqual([[MessageType.MoveTo, { x: 4, z: 5 }]]);
  });

  it("keeps a failed initial join disconnected and allows a later retry", async () => {
    const room = new FakeRoom("retry");
    transport.joinOrCreate.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(room);
    const net = new NetworkClient();

    await expect(net.connect("Temporal", "clave-temporal", "knight", callbacks(), "login")).rejects.toThrow("offline");
    expect(net.isConnected).toBe(false);
    expect(net.sendMove({ x: 1, z: 1 })).toBe(false);

    await expect(net.connect("Temporal", "clave-temporal", "knight", callbacks(), "login")).resolves.toBeUndefined();
    expect(net.isConnected).toBe(true);
  });
});
