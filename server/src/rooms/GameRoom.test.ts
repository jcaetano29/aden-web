import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { MessageType, MAP_BOUNDS, getQuest, firstQuestId, getShopPrice, getItem, statsForClass, getClass, getMobCombat } from "@aden/shared";
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

  // Helper: arma un mob con aggro sobre el jugador, pegado a él y fuera del pueblo.
  function setupMeleeMob(room: any, sessionId: string, p: any) {
    p.x = p.targetX = 20; p.z = p.targetZ = 20; // fuera de la zona segura (SAFE_RADIUS 8)
    const mob = new MobState();
    mob.templateId = "skeleton_minion";
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

  it("el Rey Esqueleto spawnea con 600 HP", async () => {
    const room = await colyseus.createRoom("game", {});
    await room.waitForNextPatch();
    let boss: any;
    room.state.mobs.forEach((m: any) => {
      if (m.templateId === "skeleton_king") boss = m;
    });
    expect(boss).toBeDefined();
    expect(boss.hp).toBe(600);
  });

  it("matar al Rey Esqueleto dropea la corona, da exp y completa la q4", async () => {
    const room = await colyseus.createRoom("game", {});
    const c = await colyseus.connectTo(room, { name: "Heroe", className: "barbarian" });
    await room.waitForNextPatch();
    const p = room.state.players.get(c.sessionId)!;
    let bossId = ""; let boss: any;
    room.state.mobs.forEach((m: any, id: string) => {
      if (m.templateId === "skeleton_king") { bossId = id; boss = m; }
    });
    // Preparar: jugador con la q4 activa, pegado al jefe, jefe casi muerto.
    p.questId = "q4"; p.questProgress = 0;
    p.x = boss.x; p.z = boss.z;
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
    // 300 exp mata seguro sube al menos un nivel desde nv1.
    expect(p.level).toBeGreaterThan(1);
    // q4 (amount 1) queda completa.
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
      // ambos fuera del pueblo, pegados
      const pa = room.state.players.get(a.sessionId)!;
      const pb = room.state.players.get(b.sessionId)!;
      pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0; pa.moving = false;
      pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0; pb.moving = false;
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
      pa.x = 7; pa.z = 0; pa.targetX = 7; pa.targetZ = 0;   // atacante fuera del radio? no: dentro
      pb.x = 0; pb.z = 0; pb.targetX = 0; pb.targetZ = 0;   // víctima en el centro del pueblo
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
      pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0;
      pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0;
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
      pa.x = 30; pa.z = 0; pa.targetX = 30; pa.targetZ = 0;
      pb.x = 31; pb.z = 0; pb.targetX = 31; pb.targetZ = 0;
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
      pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
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
      pa.x = boss.x; pa.z = boss.z + 1; pa.targetX = pa.x; pa.targetZ = pa.z; pa.hp = 500;
      a.send("setTarget", { targetId: bossId });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();
      expect(boss.dead).toBe(true); // no crash, muere normal
    });
  });
});
