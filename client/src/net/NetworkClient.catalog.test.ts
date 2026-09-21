import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@aden/shared";

const transport = vi.hoisted(() => ({ joinOrCreate: vi.fn() }));

vi.mock("colyseus.js", () => ({
  Client: class { joinOrCreate = transport.joinOrCreate; },
  Room: class {},
}));

import { NetworkClient } from "./NetworkClient.js";

class FakeCollection<T> extends Map<string, T> {
  onAdd(_callback: (value: T, key: string) => void): void {}
  onRemove(_callback: (value: T, key: string) => void): void {}
}

function connectedRoom() {
  return {
    sessionId: "self",
    sent: [] as Array<[string, unknown]>,
    state: {
      players: new FakeCollection<any>(), mobs: new FakeCollection<any>(),
      droppedItems: new FakeCollection<any>(), worldObjects: new FakeCollection<any>(),
    },
    onLeave: vi.fn(),
    onMessage: vi.fn(),
    send(type: string, payload: unknown) { this.sent.push([type, payload]); },
  };
}

beforeEach(() => transport.joinOrCreate.mockReset());

describe("NetworkClient catalog messages", () => {
  it("envía el objetivo elegido al usar una joya", async () => {
    const room = connectedRoom();
    transport.joinOrCreate.mockResolvedValue(room);
    const net = new NetworkClient();
    await net.connect("Temporal", "clave-temporal", "knight", {} as any, "login");

    expect(net.sendUseItem("aden_gema_del_pacto", "weapon-instance")).toBe(true);
    expect(room.sent).toEqual([[MessageType.UseItem, {
        itemTemplateId: "aden_gema_del_pacto",
        targetItemId: "weapon-instance",
      }]]);
  });

  it("expone los tomos aprendidos del estado sincronizado", () => {
    const net = new NetworkClient();
    (net as any).room = {
      sessionId: "self",
      state: { players: new Map([["self", { learnedTomes: ["tome_fire_ball", "tome_ice"] }]]) },
    };
    expect(net.getLearnedTomes()).toEqual(["tome_fire_ball", "tome_ice"]);
  });

  it("muestra progreso de cripta y marca el enemigo vivo más cercano de la etapa", () => {
    const net = new NetworkClient();
    const player = { x: 900, z: 25, mapId: "cripta", dungeonStage: 0, dungeonKills: 2 };
    (net as any).room = {
      sessionId: "self",
      state: {
        players: new Map([["self", player]]),
        mobs: new Map([
          ["dead", { templateId: "crypt_acolyte", mapId: "cripta", x: 900, z: 25, dead: true }],
          ["other-map", { templateId: "crypt_acolyte", mapId: "bosque", x: 900, z: 25, dead: false }],
          ["far", { templateId: "crypt_acolyte", mapId: "cripta", x: 890, z: 20, dead: false }],
          ["near", { templateId: "crypt_acolyte", mapId: "cripta", x: 902, z: 25, dead: false }],
          ["beast", { templateId: "crypt_stalker", mapId: "cripta", x: 901, z: 25, dead: false }],
          ["future", { templateId: "crypt_emberbeast", mapId: "cripta", x: 900, z: 25, dead: false }],
        ]),
      },
    };
    expect(net.getSelf()).toMatchObject({ dungeonStage: 0, dungeonKills: 2 });
    expect(net.getAdventureTarget()).toMatchObject({ x: 901, z: 25 });
    player.dungeonStage = 1;
    expect(net.getAdventureTarget()).toBeUndefined();
    player.dungeonStage = 2;
    expect(net.getAdventureTarget()).toMatchObject({ x: 900, z: 25 });
    player.dungeonStage = 5;
    expect(net.getAdventureTarget()).toBeUndefined();
  });
});
