import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType, MAP_BOUNDS, getQuest, firstQuestId, getShopPrice, getItem, statsForClass, getClass } from "@aden/shared";
import appConfig from "../testServer.js";
import { MobState } from "../state/MobState.js";

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

  it("compra una pocion en el mercader: baja el oro y la agrega al inventario", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Comprador" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0; // en el pueblo
    p.gold = 20;
    const price = getShopPrice("health_potion"); // 15
    client.send(MessageType.BuyItem, { itemTemplateId: "health_potion", qty: 1 });
    await room.waitForNextPatch();
    expect(p.gold).toBe(20 - price);
    expect(p.inventory.get("health_potion")?.qty).toBe(1);
  });

  it("no compra si no alcanza el oro (no-op)", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Comprador" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0;
    p.gold = 5; // < 15
    client.send(MessageType.BuyItem, { itemTemplateId: "health_potion", qty: 1 });
    await room.waitForNextPatch();
    expect(p.gold).toBe(5); // intacto
    expect(p.inventory.get("health_potion")).toBeUndefined();
  });

  it("usa una pocion: sube el HP y descuenta del inventario (borra si queda en 0)", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Herido" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0;
    p.gold = 20;
    client.send(MessageType.BuyItem, { itemTemplateId: "health_potion", qty: 1 });
    await room.waitForNextPatch();
    const heal = getItem("health_potion").heal!;
    p.hp = Math.max(1, p.maxHp - heal - 5); // asegura hp < maxHp con margen
    const hpBefore = p.hp;
    client.send(MessageType.UseItem, { itemTemplateId: "health_potion" });
    await room.waitForNextPatch();
    expect(p.hp).toBe(Math.min(p.maxHp, hpBefore + heal));
    expect(p.inventory.get("health_potion")).toBeUndefined(); // entrada borrada al llegar a 0
  });

  it("no usa la pocion a HP lleno (no-op)", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Sano" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = p.z = 0;
    p.gold = 20;
    client.send(MessageType.BuyItem, { itemTemplateId: "health_potion", qty: 1 });
    await room.waitForNextPatch();
    p.hp = p.maxHp; // lleno
    client.send(MessageType.UseItem, { itemTemplateId: "health_potion" });
    await room.waitForNextPatch();
    expect(p.hp).toBe(p.maxHp);
    expect(p.inventory.get("health_potion")?.qty).toBe(1); // no se gastó
  });

  it("aplica los stats de la clase elegida al entrar (mage vs knight)", async () => {
    const room = await colyseus.createRoom("game", {});
    const knightC = await colyseus.connectTo(room, { name: "Caba", className: "knight" });
    const mageC = await colyseus.connectTo(room, { name: "Mag", className: "mage" });
    await room.waitForNextPatch();
    const knight = room.state.players.get(knightC.sessionId)!;
    const mage = room.state.players.get(mageC.sessionId)!;
    expect(knight.className).toBe("knight");
    expect(mage.className).toBe("mage");
    // El caballero tiene más HP; el mago más MP (stats por clase).
    expect(knight.maxHp).toBeGreaterThan(mage.maxHp);
    expect(mage.maxMp).toBeGreaterThan(knight.maxMp);
    // Coinciden exactamente con statsForClass a nivel 1.
    expect(knight.maxHp).toBe(statsForClass("knight", 1).maxHp);
    expect(mage.maxMp).toBe(statsForClass("mage", 1).maxMp);
  });

  it("className inválido cae a knight por defecto", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Raro", className: "brujo_inexistente" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    expect(p.className).toBe("knight");
    expect(getClass(p.className).skillId).toBe("shield_bash");
  });

  it("skill de curación (second_wind) sube el HP y gasta MP", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Caba", className: "knight" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    p.hp = 10; // herido
    const mpBefore = p.mp;
    c.send(MessageType.UseSkill, { skillId: "second_wind" });
    await room.waitForNextPatch();
    expect(p.hp).toBeGreaterThan(10); // se curó ~40% maxHp
    expect(p.mp).toBeLessThan(mpBefore); // gastó MP
  });

  it("skill de buff (rage) activa el multiplicador de ataque temporal", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Barb", className: "barbarian" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)! as any;
    c.send(MessageType.UseSkill, { skillId: "rage" });
    await room.waitForNextPatch();
    expect(p.atkBuffMs).toBeGreaterThan(0);
    expect(p.atkBuffMult).toBe(1.5);
  });

  it("una skill fuera del kit de la clase es no-op (knight no castea fireball)", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Caba", className: "knight" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    const mpBefore = p.mp;
    c.send(MessageType.UseSkill, { skillId: "fireball" }); // no está en el kit del knight
    await room.waitForNextPatch();
    expect(p.mp).toBe(mpBefore); // no gastó nada
  });

  it("la misma skill en cooldown no se puede recastear inmediatamente", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Caba", className: "knight" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    p.hp = 10;
    c.send(MessageType.UseSkill, { skillId: "second_wind" });
    await room.waitForNextPatch();
    const hpAfterFirst = p.hp;
    p.hp = 10; // volver a herir
    c.send(MessageType.UseSkill, { skillId: "second_wind" }); // en cooldown
    await room.waitForNextPatch();
    expect(p.hp).toBe(10); // no curó de nuevo
    expect(hpAfterFirst).toBeGreaterThan(10); // la primera sí curó
  });

  it("veneno (poison) hace daño por tiempo al mob objetivo", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Pica", className: "rogue" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    // Crear un mob pegado al jugador (dentro de rango)
    const mob = new MobState();
    mob.templateId = "skeleton_minion";
    mob.hp = 100; mob.maxHp = 100; mob.pDef = 5; mob.dead = false;
    mob.x = p.x; mob.z = p.z;
    room.state.mobs.set("mob-test", mob);
    p.targetId = "mob-test";
    c.send(MessageType.UseSkill, { skillId: "poison" });
    await room.waitForNextPatch();
    // Avanzar ~1s de simulación para que el veneno tickee (cada 0.5s)
    for (let i = 0; i < 16; i++) await room.waitForNextSimulationTick();
    expect(mob.hp).toBeLessThan(100); // el veneno bajó su HP sin volver a atacar
  });
});
