import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType, MAP_BOUNDS, getQuest, firstQuestId } from "@aden/shared";
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

  it("asigna la primera mision al unirse", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    expect(p.questId).toBe(firstQuestId());
    expect(p.questProgress).toBe(0);
    expect(p.gold).toBe(0);
  });

  it("no entrega la mision si el progreso no esta completo (no-op)", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0; // en el pueblo (radio de entrega)
    p.questProgress = 0; // incompleta
    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();
    expect(p.questId).toBe(firstQuestId()); // no avanzo
    expect(p.gold).toBe(0);
  });

  it("entrega la mision completa en el NPC: da exp+oro y encadena la siguiente", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0; // en el pueblo, dentro del radio de entrega
    const q = getQuest(p.questId);
    const expBefore = p.exp;
    p.questProgress = q.amount; // simula haber matado los mobs requeridos

    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();

    expect(p.gold).toBe(q.rewardGold);
    expect(p.exp).toBe(expBefore + q.rewardExp);
    expect(p.questId).not.toBe(q.id); // encadeno a la siguiente
    expect(p.questProgress).toBe(0);
  });

  it("no entrega si el jugador esta lejos del pueblo", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = 50; p.z = 50; // lejos del NPC
    const q = getQuest(p.questId);
    p.questProgress = q.amount;
    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();
    expect(p.questId).toBe(q.id); // no entrego
    expect(p.gold).toBe(0);
  });
});
