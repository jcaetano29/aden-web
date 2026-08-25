import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType, getZone, getQuest, firstQuestId, getShopPrice, getItem, statsForClass, getClass, getMobCombat, TOWN, getDailyQuest } from "@aden/shared";
import appConfig from "../testServer.js";
import { MobState } from "../state/MobState.js";
import { InventoryItemState } from "../state/InventoryItemState.js";

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

    // Etapa 15: el movimiento se clampea a los bounds del MAPA ACTUAL (pueblo).
    const puebloMax = getZone("pueblo").bounds.maxX;
    client.send(MessageType.MoveTo, { x: 1000, z: 0 });
    // targetX se fija sincronicamente en el handler de moveTo, antes de cualquier tick
    await room.waitForNextPatch();
    const target = room.state.players.get(client.sessionId)!;
    expect(target.targetX).toBe(puebloMax); // recortado a los bounds del mapa

    // avanzar ~0.5s de simulacion
    await room.waitForNextSimulationTick();
    await room.waitForNextSimulationTick();

    const p = room.state.players.get(client.sessionId)!;
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThanOrEqual(puebloMax); // nunca supera el bound clampeado
  });

  it("asigna la primera mision al unirse", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    expect(p.questId).toBe(firstQuestId());
    expect(p.questProgress).toBe(0);
  });

  it("no entrega la mision si el progreso no esta completo (no-op)", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = TOWN.x; p.z = TOWN.z; // en el pueblo (radio de entrega)
    p.questProgress = 0; // incompleta
    const gold0 = p.gold;
    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();
    expect(p.questId).toBe(firstQuestId()); // no avanzo
    expect(p.gold).toBe(gold0); // sin cambio de oro
  });

  it("entrega la mision completa en el NPC: da exp+oro y encadena la siguiente", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Quester" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = TOWN.x; p.z = TOWN.z; // en el pueblo, dentro del radio de entrega
    const q = getQuest(p.questId);
    const expBefore = p.exp;
    const gold0 = p.gold;
    p.questProgress = q.amount; // simula haber matado los mobs requeridos

    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();

    expect(p.gold).toBe(gold0 + q.rewardGold);
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
    const gold0 = p.gold;
    client.send(MessageType.InteractNpc, {});
    await room.waitForNextPatch();
    expect(p.questId).toBe(q.id); // no entrego
    expect(p.gold).toBe(gold0); // sin cambio de oro
  });

  it("compra una pocion en el mercader: baja el oro y la agrega al inventario", async () => {
    const room = await colyseus.createRoom("game", {});
    const client = await colyseus.connectTo(room, { name: "Comprador" });
    await room.waitForNextPatch();
    const p = room.state.players.get(client.sessionId)!;
    p.x = TOWN.x; p.z = TOWN.z; // en el pueblo
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
    p.x = TOWN.x; p.z = TOWN.z;
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
    p.x = TOWN.x; p.z = TOWN.z;
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
    p.x = TOWN.x; p.z = TOWN.z;
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

  // Helper: arma un mob con aggro sobre el jugador, pegado a él, en un mapa de combate.
  function setupMeleeMob(room: any, sessionId: string, p: any) {
    p.mapId = "bosque"; // mapa de combate (Etapa 15)
    p.x = p.targetX = 300; p.z = p.targetZ = 0;
    const mob = new MobState();
    mob.templateId = "skeleton_minion";
    mob.mapId = "bosque";
    const mc = getMobCombat("skeleton_minion");
    mob.hp = mob.maxHp = mc.maxHp; mob.pAtk = mc.pAtk; mob.pDef = mc.pDef; mob.dead = false;
    mob.x = mob.homeX = p.x; mob.z = mob.homeZ = p.z; // home = su posición → no leashea
    mob.aggroTargetId = sessionId;
    room.state.mobs.set("mob-atk", mob);
    return mob;
  }

  it("el ataque del mob es telegrafiado: hace wind-up y pega si el jugador sigue en rango", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Blanco", className: "knight" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    setupMeleeMob(room, c.sessionId, p);
    const hpBefore = p.hp;
    await room.waitForNextSimulationTick(); // primer tick: inicia el wind-up
    const mob = room.state.mobs.get("mob-atk")!;
    expect(mob.windupMs).toBeGreaterThan(0); // está cargando (avisa)
    // el jugador NO se mueve → sigue en rango; avanzar hasta que resuelva
    for (let i = 0; i < 16; i++) await room.waitForNextSimulationTick();
    expect(p.hp).toBeLessThan(hpBefore); // el golpe conectó
  });

  it("el jugador esquiva si sale del rango durante el wind-up", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Escurridizo", className: "rogue" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    const mob = setupMeleeMob(room, c.sessionId, p);
    const hpBefore = p.hp;
    await room.waitForNextSimulationTick(); // inicia el wind-up (el mob queda plantado)
    expect(mob.windupMs).toBeGreaterThan(0);
    // ESQUIVAR: salir del rango mientras el mob carga (el mob no se mueve)
    p.x = p.targetX = 45; p.z = p.targetZ = 45;
    for (let i = 0; i < 16; i++) await room.waitForNextSimulationTick();
    expect(p.hp).toBe(hpBefore); // no le pegó: lo esquivó
  });

  it("el Rey Nihil spawnea con 1000 HP", async () => {
    const room = await colyseus.createRoom("game", {});
    await room.waitForNextPatch();
    let boss: any;
    room.state.mobs.forEach((m: any) => {
      if (m.templateId === "skeleton_king") boss = m;
    });
    expect(boss).toBeDefined();
    expect(boss.hp).toBe(1000);
  });

  it("matar al Rey Nihil dropea la corona, da exp y completa la q6 (final)", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Heroe", className: "barbarian" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    let bossId = ""; let boss: any;
    room.state.mobs.forEach((m: any, id: string) => {
      if (m.templateId === "skeleton_king") { bossId = id; boss = m; }
    });
    // Preparar: jugador con la q6 (final) activa, en el mapa del jefe, pegado, jefe casi muerto.
    p.questId = "q6"; p.questProgress = 0;
    p.mapId = boss.mapId; p.x = boss.x; p.z = boss.z;
    boss.hp = 1;
    p.targetId = bossId;
    c.send(MessageType.SetTarget, { targetId: bossId });
    // Avanzar la simulación para que el auto-attack lo remate.
    for (let i = 0; i < 6; i++) await room.waitForNextSimulationTick();
    expect(boss.dead).toBe(true);
    // La corona quedó en el suelo.
    let hasCrown = false;
    room.state.droppedItems.forEach((d: any) => {
      if (d.itemTemplateId === "skull_crown") hasCrown = true;
    });
    expect(hasCrown).toBe(true);
    // 900 exp mata seguro sube al menos un nivel desde nv1.
    expect(p.level).toBeGreaterThan(1);
    // q6 (amount 1) queda completa.
    expect(p.questProgress).toBe(1);
  });

  it("veneno (poison) hace daño por tiempo al mob objetivo", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Pica", className: "rogue" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    // Crear un mob pegado al jugador (dentro de rango)
    const mob = new MobState();
    mob.templateId = "skeleton_minion";
    mob.mapId = p.mapId; // mismo mapa que el jugador (Etapa 15)
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

  describe("PvP (Etapa 9a)", () => {
    it("un jugador puede pegarle a otro fuera del pueblo y le baja la HP", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Atacante", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Victima", className: "knight" });
      // ambos en un mapa de combate (bosque), pegados
      const pa = room.state.players.get(a.sessionId)!;
      const pb = room.state.players.get(b.sessionId)!;
      pa.mapId = "bosque"; pb.mapId = "bosque";
      pa.x = 300; pa.z = 0; pa.targetX = 300; pa.targetZ = 0; pa.moving = false;
      pb.x = 301; pb.z = 0; pb.targetX = 301; pb.targetZ = 0; pb.moving = false;
      const hp0 = pb.hp;
      a.send("setTarget", { targetId: b.sessionId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(pb.hp).toBeLessThan(hp0);
    });

    it("no hay daño si la víctima está en el pueblo (zona segura)", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Atk2", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Vic2", className: "knight" });
      const pa = room.state.players.get(a.sessionId)!;
      const pb = room.state.players.get(b.sessionId)!;
      // Ambos DENTRO de la zona segura del pueblo y en rango de ataque:
      // el PvP debe quedar desactivado por estar la víctima en el pueblo.
      pa.x = TOWN.x + 1; pa.z = TOWN.z; pa.targetX = TOWN.x + 1; pa.targetZ = TOWN.z;
      pb.x = TOWN.x; pb.z = TOWN.z; pb.targetX = TOWN.x; pb.targetZ = TOWN.z;   // víctima en el centro del pueblo
      const hp0 = pb.hp;
      a.send("setTarget", { targetId: b.sessionId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(pb.hp).toBe(hp0);
    });

    it("al morir en PvP: víctima muere, pierde oro y el asesino suma pvpKills", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Killer", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Dead", className: "knight" });
      const pa = room.state.players.get(a.sessionId)!;
      const pb = room.state.players.get(b.sessionId)!;
      pa.mapId = "bosque"; pb.mapId = "bosque";
      pa.x = 300; pa.z = 0; pa.targetX = 300; pa.targetZ = 0;
      pb.x = 301; pb.z = 0; pb.targetX = 301; pb.targetZ = 0;
      pb.hp = 1; pb.gold = 100;
      a.send("setTarget", { targetId: b.sessionId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(pb.dead).toBe(true);
      expect(pb.gold).toBe(90);       // floor(100*0.9)
      expect(pa.pvpKills).toBe(1);
    });

    it("no se puede targetear a uno mismo", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Solo", className: "knight" });
      const pa = room.state.players.get(a.sessionId)!;
      a.send("setTarget", { targetId: a.sessionId });
      await room.waitForNextSimulationTick();
      expect(pa.targetId).toBe("");
    });
  });

  describe("Guilds (Etapa 9b)", () => {
    it("crear guild setea id/tag/name en el jugador y la registra viva", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Lider", className: "knight" });
      a.send("createGuild", { name: "Los Lobos", tag: "WOLF" });
      await room.waitForNextSimulationTick();
      const pa = room.state.players.get(a.sessionId)!;
      expect(pa.guildTag).toBe("WOLF");
      expect(pa.guildId).not.toBe("");
      const g = room.state.guilds.get(pa.guildId)!;
      expect(g.name).toBe("Los Lobos");
      expect(g.leaderName).toBe("Lider");
    });

    it("rechaza tag inválido y tag duplicado", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "L1", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "L2", className: "knight" });
      a.send("createGuild", { name: "AAA", tag: "toolong" }); // inválido
      await room.waitForNextSimulationTick();
      expect(room.state.players.get(a.sessionId)!.guildId).toBe("");
      a.send("createGuild", { name: "Uno", tag: "WOLF" });
      await room.waitForNextSimulationTick();
      b.send("createGuild", { name: "Dos", tag: "WOLF" }); // duplicado
      await room.waitForNextSimulationTick();
      expect(room.state.players.get(b.sessionId)!.guildId).toBe("");
    });

    it("unirse copia la identidad de la guild", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Jefe", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Miembro", className: "knight" });
      a.send("createGuild", { name: "Halcones", tag: "HAWK" });
      await room.waitForNextSimulationTick();
      const gid = room.state.players.get(a.sessionId)!.guildId;
      b.send("joinGuild", { guildId: gid });
      await room.waitForNextSimulationTick();
      expect(room.state.players.get(b.sessionId)!.guildId).toBe(gid);
      expect(room.state.players.get(b.sessionId)!.guildTag).toBe("HAWK");
    });

    it("miembros de la misma guild NO se hacen daño (fuego amigo)", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Aliado1", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Aliado2", className: "knight" });
      const pa = room.state.players.get(a.sessionId)!;
      const pb = room.state.players.get(b.sessionId)!;
      pa.mapId = "bosque"; pb.mapId = "bosque";
      pa.x = 300; pa.z = 0; pa.targetX = 300; pa.targetZ = 0;
      pb.x = 301; pb.z = 0; pb.targetX = 301; pb.targetZ = 0;
      a.send("createGuild", { name: "Pactados", tag: "PAX" });
      await room.waitForNextSimulationTick();
      b.send("joinGuild", { guildId: pa.guildId });
      await room.waitForNextSimulationTick();
      const hp0 = pb.hp;
      a.send("setTarget", { targetId: b.sessionId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(pb.hp).toBe(hp0); // sin daño entre aliados
    });

    it("salir limpia la identidad y poda la guild vacía", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Solo", className: "knight" });
      a.send("createGuild", { name: "Efímera", tag: "TMP" });
      await room.waitForNextSimulationTick();
      const gid = room.state.players.get(a.sessionId)!.guildId;
      expect(room.state.guilds.has(gid)).toBe(true);
      a.send("leaveGuild", {});
      await room.waitForNextSimulationTick();
      expect(room.state.players.get(a.sessionId)!.guildId).toBe("");
      expect(room.state.guilds.has(gid)).toBe(false); // podada (sin miembros online)
    });
  });

  describe("Boss contestado (Etapa 9c)", () => {
    function findBoss(room: any): string {
      let id = "";
      room.state.mobs.forEach((m: any, k: string) => { if (m.templateId === "skeleton_king") id = k; });
      return id;
    }

    it("el golpe final al jefe acredita bossKills a la guild del que remata", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Campeon", className: "knight" });
      a.send("createGuild", { name: "Los Reyes", tag: "KING" });
      await room.waitForNextSimulationTick();
      const pa = room.state.players.get(a.sessionId)!;
      const gid = pa.guildId;
      const bossId = findBoss(room);
      const boss = room.state.mobs.get(bossId)!;
      boss.hp = 1;
      pa.mapId = boss.mapId; pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
      a.send("setTarget", { targetId: bossId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(boss.dead).toBe(true);
      expect(room.state.guilds.get(gid)!.bossKills).toBe(1);
    });

    it("si el que remata no tiene guild, no incrementa nada ni crashea", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Solitario", className: "knight" });
      const pa = room.state.players.get(a.sessionId)!;
      const bossId = findBoss(room);
      const boss = room.state.mobs.get(bossId)!;
      boss.hp = 1;
      pa.mapId = boss.mapId; pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
      a.send("setTarget", { targetId: bossId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(boss.dead).toBe(true); // no crash, muere normal
    });
  });

  describe("Leaderboard (Etapa 9d)", () => {
    it("incluye guilds vivas y jugadores online con sus stats actuales", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Campeon", className: "knight" });
      a.send("createGuild", { name: "Los Reyes", tag: "KING" });
      await room.waitForNextSimulationTick();
      const pa = room.state.players.get(a.sessionId)!;
      pa.level = 9;
      room.state.guilds.get(pa.guildId)!.bossKills = 5;
      await (room as any).refreshLeaderboard();
      const guilds = [...room.state.leaderboard.guilds];
      const players = [...room.state.leaderboard.players];
      expect(guilds.some((g: any) => g.tag === "KING" && g.bossKills === 5)).toBe(true);
      expect(players.some((p: any) => p.name === "Campeon" && p.level === 9)).toBe(true);
    });

    it("ordena jugadores por nivel desc y guilds por bossKills desc", async () => {
      const room = await colyseus.createRoom("game", {});
      const a = await colyseus.connectTo(room, { name: "Nivel3", className: "knight" });
      const b = await colyseus.connectTo(room, { name: "Nivel8", className: "mage" });
      room.state.players.get(a.sessionId)!.level = 3;
      room.state.players.get(b.sessionId)!.level = 8;
      await (room as any).refreshLeaderboard();
      const players = [...room.state.leaderboard.players].map((p: any) => p.name);
      expect(players.indexOf("Nivel8")).toBeLessThan(players.indexOf("Nivel3"));
    });
  });

  describe("Equipo (Etapa 12)", () => {
    async function buy(room: any, client: any, p: any, itemId: string): Promise<void> {
      p.x = TOWN.x; p.z = TOWN.z; p.gold = 1000;
      client.send(MessageType.BuyItem, { itemTemplateId: itemId, qty: 1 });
      await room.waitForNextPatch();
    }

    it("equipar un arma sube el pAtk y ocupa el slot (sale del inventario)", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Herrero", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      await buy(room, c, p, "worn_sword");
      const atk0 = p.pAtk;
      c.send(MessageType.EquipItem, { itemTemplateId: "worn_sword" });
      await room.waitForNextPatch();
      expect(p.equipment.get("weapon")).toBe("worn_sword");
      expect(p.pAtk).toBe(atk0 + 4); // bonus de worn_sword
      expect(p.inventory.get("worn_sword")).toBeUndefined();
    });

    it("desequipar devuelve el ítem al inventario y restaura el stat", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Desarmado", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      await buy(room, c, p, "worn_sword");
      const atk0 = p.pAtk;
      c.send(MessageType.EquipItem, { itemTemplateId: "worn_sword" });
      await room.waitForNextPatch();
      c.send(MessageType.UnequipItem, { slot: "weapon" });
      await room.waitForNextPatch();
      expect(p.equipment.get("weapon")).toBeUndefined();
      expect(p.pAtk).toBe(atk0);
      expect(p.inventory.get("worn_sword")?.qty).toBe(1);
    });

    it("equipar en un slot ocupado hace swap (el anterior vuelve al inventario)", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Cambista", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      await buy(room, c, p, "worn_sword");
      // iron_sword no se vende en la tienda → se inyecta directo al inventario (como un drop).
      const iron = new InventoryItemState(); iron.itemTemplateId = "iron_sword"; iron.qty = 1;
      p.inventory.set("iron_sword", iron);
      const atk0 = p.pAtk;
      c.send(MessageType.EquipItem, { itemTemplateId: "worn_sword" });
      await room.waitForNextPatch();
      c.send(MessageType.EquipItem, { itemTemplateId: "iron_sword" });
      await room.waitForNextPatch();
      expect(p.equipment.get("weapon")).toBe("iron_sword");
      expect(p.pAtk).toBe(atk0 + 9); // iron_sword +9 (worn ya no cuenta)
      expect(p.inventory.get("worn_sword")?.qty).toBe(1); // el viejo volvió
    });

    it("subir de nivel conserva el bonus del equipo", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Veterano", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      await buy(room, c, p, "worn_sword");
      c.send(MessageType.EquipItem, { itemTemplateId: "worn_sword" });
      await room.waitForNextPatch();
      // Entregar q5 (900 exp) parado en el pueblo → sube varios niveles.
      p.questId = "q5"; p.questProgress = getQuest("q5").amount;
      p.x = TOWN.x; p.z = TOWN.z;
      c.send(MessageType.InteractNpc, {});
      await room.waitForNextPatch();
      expect(p.level).toBeGreaterThan(1);
      expect(p.pAtk).toBe(statsForClass("knight", p.level).pAtk + 4); // el +4 del arma sobrevive al level-up
    });
  });

  describe("Retención (Etapa 13)", () => {
    // Mata un enemigo cercano al jugador avanzando la simulación (auto-attack).
    async function killOneMob(room: any, client: any, p: any, templateId: string): Promise<void> {
      let mobId = ""; let mob: any;
      room.state.mobs.forEach((m: any, id: string) => {
        if (mobId === "" && m.templateId === templateId && !m.dead) { mobId = id; mob = m; }
      });
      mob.hp = 1;
      p.mapId = mob.mapId; p.x = p.targetX = mob.x; p.z = p.targetZ = mob.z + 1; p.moving = false; p.hp = 500;
      client.send(MessageType.SetTarget, { targetId: mobId });
      for (let i = 0; i < 4; i++) await room.waitForNextSimulationTick();
    }

    it("al entrar arranca la racha en 1 y asigna una misión diaria", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Nuevo", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      expect(p.loginStreak).toBe(1);
      expect(p.dailyQuestId).not.toBe("");
    });

    it("matar un enemigo desbloquea 'Primera Sangre' y otorga el título Novato", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Novicio", className: "barbarian" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      await killOneMob(room, c, p, "skeleton_minion");
      expect(p.totalKills).toBeGreaterThanOrEqual(1);
      expect([...p.achievements]).toContain("first_blood");
      expect(p.title).toBe("Novato");
    });

    it("la misión diaria progresa al matar y se auto-recompensa al completar", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Diario", className: "barbarian" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      // Forzar la diaria "caza cualquiera" (amount 12) a falta de 1.
      const dq = getDailyQuest("d_hunt");
      p.dailyQuestId = "d_hunt"; p.dailyDone = false; p.dailyProgress = dq.amount - 1;
      const gold0 = p.gold;
      await killOneMob(room, c, p, "skeleton_minion");
      expect(p.dailyDone).toBe(true);
      expect(p.gold).toBe(gold0 + dq.rewardGold);
    });

    it("lucir un título rechaza los no ganados y acepta los desbloqueados", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Titular", className: "barbarian" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      // Antes de ganar nada: un título no ganado se rechaza.
      c.send(MessageType.SetTitle, { title: "Matarreyes" });
      await room.waitForNextPatch();
      expect(p.title).not.toBe("Matarreyes");
      // Desbloquear first_blood → título Novato ganado y luego seleccionable.
      await killOneMob(room, c, p, "skeleton_minion");
      c.send(MessageType.SetTitle, { title: "" }); // sacárselo
      await room.waitForNextPatch();
      expect(p.title).toBe("");
      c.send(MessageType.SetTitle, { title: "Novato" });
      await room.waitForNextPatch();
      expect(p.title).toBe("Novato");
    });
  });

  describe("Eventos de mundo (Etapa 14)", () => {
    it("abatir al jefe emite un anuncio de mundo server-wide", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Anunciante", className: "barbarian" });
      await room.waitForNextPatch();
      const announces: string[] = [];
      c.onMessage(MessageType.WorldAnnounce, (ev: any) => announces.push(ev.text));
      const p = room.state.players.get(c.sessionId)!;
      let bossId = ""; let boss: any;
      room.state.mobs.forEach((m: any, id: string) => {
        if (m.templateId === "skeleton_king") { bossId = id; boss = m; }
      });
      boss.hp = 1;
      p.mapId = boss.mapId; p.x = p.targetX = boss.x; p.z = p.targetZ = boss.z + 1; p.moving = false; p.hp = 500;
      c.send(MessageType.SetTarget, { targetId: bossId });
      for (let i = 0; i < 10; i++) await room.waitForNextSimulationTick();
      expect(boss.dead).toBe(true);
      expect(announces.some((t) => t.includes("caído"))).toBe(true);
    });
  });

  describe("Mapas / viaje (Etapa 15)", () => {
    it("arranca en el pueblo y los mobs spawnean con su mapId", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Viajero", className: "knight" });
      await room.waitForNextPatch();
      expect(room.state.players.get(c.sessionId)!.mapId).toBe("pueblo");
      let boss: any;
      room.state.mobs.forEach((m: any) => { if (m.templateId === "skeleton_king") boss = m; });
      expect(boss.mapId).toBe("trono");
    });

    it("warpear a un mapa habilitado mueve al jugador y setea su mapId", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Warp", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      p.level = 1; // habilita bosque (req 1)
      c.send(MessageType.WarpTo, { mapId: "bosque" });
      await room.waitForNextPatch();
      expect(p.mapId).toBe("bosque");
      expect(p.x).toBe(getZone("bosque").spawn.x);
      expect(p.z).toBe(getZone("bosque").spawn.z);
    });

    it("no se puede warpear a un mapa si el nivel es insuficiente", async () => {
      const room = await colyseus.createRoom("game", {});
      const c = await colyseus.connectTo(room, { name: "Novato", className: "knight" });
      await room.waitForNextPatch();
      const p = room.state.players.get(c.sessionId)!;
      p.level = 1; // trono requiere 9
      c.send(MessageType.WarpTo, { mapId: "trono" });
      await room.waitForNextPatch();
      expect(p.mapId).toBe("pueblo"); // no viajó
    });
  });
});
