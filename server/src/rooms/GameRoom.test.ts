import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType, MAP_BOUNDS } from "@aden/shared";
import appConfig from "../testServer.js";

describe("GameRoom", () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => {
    await colyseus.shutdown();
  });
  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("crea un jugador al unirse", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Zeus" });
    await room.waitForNextPatch();
    expect(room.state.players.get(client.sessionId)?.name).toBe("Zeus");
  });

  it("mueve al jugador hacia el target tras recibir moveTo", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Zeus" });
    await room.waitForNextPatch();

    client.send(MessageType.MoveTo, { x: 100, z: 0 });
    // targetX se fija sincronicamente en el handler de moveTo, antes de cualquier tick
    await room.waitForNextPatch();
    const target = room.state.players.get(client.sessionId)!;
    expect(target.targetX).toBe(MAP_BOUNDS.maxX); // recortado a MAP_BOUNDS por clampToBounds

    // avanzar ~0.5s de simulacion
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();

    const p = room.state.players.get(client.sessionId)!;
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThanOrEqual(MAP_BOUNDS.maxX); // nunca supera el bound clampeado
  });
});
