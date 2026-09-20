import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@aden/shared";
import { NetworkClient } from "./NetworkClient.js";

describe("NetworkClient catalog messages", () => {
  it("envía el objetivo elegido al usar una joya", () => {
    const send = vi.fn();
    const net = new NetworkClient();
    (net as any).room = { send };
    net.sendUseItem("aden_gema_del_pacto", "weapon-instance");
    expect(send).toHaveBeenCalledWith(MessageType.UseItem, {
      itemTemplateId: "aden_gema_del_pacto",
      targetItemId: "weapon-instance",
    });
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
        ]),
      },
    };
    expect(net.getSelf()).toMatchObject({ dungeonStage: 0, dungeonKills: 2 });
    expect(net.getAdventureTarget()).toMatchObject({ x: 902, z: 25 });
    player.dungeonStage = 1;
    expect(net.getAdventureTarget()).toBeUndefined();
  });
});
