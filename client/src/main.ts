import { AdventureTracker } from "./render/AdventureTracker.js";
import { HazardViews } from "./render/HazardViews.js";
import * as THREE from "three";
import { preloadMaterialAtlas } from "./render/materialAtlas.js";
import { Renderer } from "./render/Renderer.js";
import { Environment } from "./render/Environment.js";
import { AmbientLife } from "./render/AmbientLife.js";
import { EntityViews } from "./render/EntityViews.js";
import { GroundItems } from "./render/GroundItems.js";
import { disposeItemModels } from './render/ItemModels.js';
import { CharacterFactory } from "./render/CharacterFactory.js";
import { Nameplates } from "./render/Nameplates.js";
import { DamageNumbers } from "./render/DamageNumbers.js";
import { Hud } from "./render/Hud.js";
import { SkillBar } from "./render/SkillBar.js";
import { InventoryPanel } from "./render/InventoryPanel.js";
import { GuildPanel } from "./render/GuildPanel.js";
import { PartyPanel } from './render/PartyPanel.js';
import { LeaderboardPanel } from "./render/LeaderboardPanel.js";
import { ProgressPanel } from "./render/ProgressPanel.js";
import { BossBar } from "./render/BossBar.js";
import { MapPanel } from "./render/MapPanel.js";
import { WorldObjectViews } from "./render/WorldObjectViews.js";
import { SkillEffects } from "./render/SkillEffects.js";
import { StatusEffects } from "./render/StatusEffects.js";
import { skillRange } from "@aden/shared";
import { Npc } from "./render/Npc.js";
import { Merchant } from "./render/Merchant.js";
import { ServiceNpc } from "./render/ServiceNpc.js";
import { ShopPanel } from "./render/ShopPanel.js";
import { ClassSelect } from "./render/ClassSelect.js";
import { Minimap } from "./render/Minimap.js";
import { StoryCard } from "./render/StoryCard.js";
import { classAdvice, npcStory, questTurnInText } from "@aden/shared";
import { DialogPanel } from "./render/DialogPanel.js";
import { ZoneIndicator } from "./render/ZoneIndicator.js";
import { ZoneBanner } from "./render/ZoneBanner.js";
import { injectTheme } from "./render/theme.js";
import { NetworkClient, isAuthError, type RoomCallbacks } from "./net/NetworkClient.js";
import { StatsPanel } from "./render/StatsPanel.js";
import { InputController } from "./input/InputController.js";
import { SkillInput } from "./input/SkillInput.js";
import { AudioEngine } from "./audio/AudioEngine.js";
import { attachAudioLifecycle } from './audio/lifecycle.js';
import { AudioPanel } from './render/AudioPanel.js';
import { ScreenShake } from "./render/ScreenShake.js";
import { MODEL_NAMES, MOB_MODEL_NAMES, modelForClass, modelForTemplate } from "./assets/manifest.js";
import { availableSkills, getItem, getQuest, TOWN, distance2D, getClass, getSkill, ELDER_NAME, firstQuestId, zoneAt, getZone, respawnForTemplate, getWorldObject, OBJECT_INTERACT_RANGE, SMITH_STOCK, getNpc, TOWN_SERVICE_RADIUS, HEAL_COST_GOLD, getBounty, firstBountyId, type Attribute } from "@aden/shared";

async function main() {
  injectTheme(); // sistema de diseño (fuentes, tokens, clases) — antes de crear cualquier panel
  await preloadMaterialAtlas();
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);
  const environment = new Environment(renderer.scene); // biomas por zona, niebla dinámica, props

  const factory = new CharacterFactory();
  await factory.preload([...MODEL_NAMES, ...MOB_MODEL_NAMES]);
  const ambient = new AmbientLife(renderer.scene, factory);

  const nameplates = new Nameplates();
  const views = new EntityViews(renderer.scene, factory, nameplates);
  const damageNumbers = new DamageNumbers(renderer.scene);
  const groundItems = new GroundItems(renderer.scene);
  window.addEventListener('pagehide',()=>{groundItems.dispose();disposeItemModels();},{once:true});
  const worldObjects = new WorldObjectViews(renderer.scene);
  const skillEffects = new SkillEffects(renderer.scene);
  const statusEffects = new StatusEffects(renderer.scene);
  const audio = new AudioEngine();
  attachAudioLifecycle(audio);
  const audioPanel = new AudioPanel(audio);
  window.addEventListener('pagehide', event => { if (!event.persisted) audioPanel.dispose(); });
  const screenShake = new ScreenShake();
  const hud = new Hud();
  const adventure = new AdventureTracker();
  const hazards = new HazardViews(renderer.scene);
  const skillBar = new SkillBar();
  const npc = new Npc(renderer.scene, renderer.css2d, factory);
  const merchant = new Merchant(renderer.scene, renderer.css2d, factory);
  // Etapa 20: NPCs de servicio nuevos (Sanadora / Herrero / Capitán).
  const healer = new ServiceNpc(renderer.scene, renderer.css2d, "healer", factory);
  const smith = new ServiceNpc(renderer.scene, renderer.css2d, "smith", factory);
  const captain = new ServiceNpc(renderer.scene, renderer.css2d, "captain", factory);
  const shopPanel = new ShopPanel((itemId) => {
    net.sendBuyItem(itemId);
  });
  // Herrero: mismo panel de tienda pero con el stock de equipo.
  const smithPanel = new ShopPanel((itemId) => {
    net.sendBuyItem(itemId);
  }, { stock: SMITH_STOCK, title: "⚔ Fragua de Dorne" });
  const inventoryPanel = new InventoryPanel(document.body, {
    onUseItem: (itemId, targetItemId) => net.sendUseItem(itemId, targetItemId),
    onEquip: (itemId) => net.sendEquipItem(itemId),
    onUnequip: (slot) => net.sendUnequipItem(slot),
  });
  const guildPanel = new GuildPanel({
    onCreate: (name_, tag) => net.sendCreateGuild(name_, tag),
    onJoin: (guildId) => net.sendJoinGuild(guildId),
    onLeave: () => net.sendLeaveGuild(),
  });
  guildPanel.mount(document.body);
  const partyPanel = new PartyPanel({
    onInvite: id => net.sendPartyInvite(id),
    onRespond: (id, accept) => net.sendPartyRespond(id, accept),
    onKick: id => net.sendPartyKick(id),
    onLeave: () => net.sendPartyLeave(),
  });
  partyPanel.mount(document.body);
  const leaderboardPanel = new LeaderboardPanel();
  leaderboardPanel.mount(document.body);
  const progressPanel = new ProgressPanel((title) => net.sendSetTitle(title));
  progressPanel.mount(document.body);
  // Etapa 21: panel de atributos (tecla C).
  const statsPanel = new StatsPanel((attr: Attribute) => net.sendAllocateStat(attr));
  const bossBar = new BossBar();
  // Tiempo de reaparición del jefe (config compartida) para el contador de la barra.
  const bossRespawnMs = respawnForTemplate("skeleton_king") ?? 60000;
  const classSelect = new ClassSelect();
  const storyCard = new StoryCard();
  const dialog = new DialogPanel();
  const zoneIndicator = new ZoneIndicator();
  zoneIndicator.mount(document.body);
  const zoneBanner = new ZoneBanner();
  zoneBanner.mount(document.body);

  // Minimapa (esquina sup. der.): radar del mapa actual (Etapa 15).
  const minimap = new Minimap();
  const net = new NetworkClient();
  // Menú de mapas (tecla M): viajar entre mapas.
  const mapPanel = new MapPanel((mapId) => net.sendWarpTo(mapId));
  mapPanel.mount(document.body);

  // Objetivo actualmente seleccionado por este cliente (no autoritativo: sólo
  // se usa para saber cuándo limpiar el resaltado visual).
  let currentTargetId: string | null = null;

  // Callbacks de red (se reutilizan si hay que reintentar el login).
  let className = "";
  const netCallbacks: RoomCallbacks = {
    onAdd: (id, isSelf, snap) => {
      views.add(id, isSelf, modelForClass(snap.className ?? "knight"), snap);
      statusEffects.sync(`p:${id}`, snap, () => views.playerWorldPosition(id));
    },
    onChange: (id, snap) => {
      views.update(id, snap);
      statusEffects.sync(`p:${id}`, snap, () => views.playerWorldPosition(id));
    },
    onRemove: (id) => { views.remove(id); statusEffects.remove(`p:${id}`); },
    onMobAdd: (id, templateId, snap) => { views.addMob(id, modelForTemplate(templateId), templateId, snap); hazards.update(id, snap); statusEffects.sync(`m:${id}`, snap, () => views.mobWorldPosition(id)); },
    onMobChange: (id, snap) => { views.updateMob(id, snap); hazards.update(id, snap); statusEffects.sync(`m:${id}`, snap, () => views.mobWorldPosition(id)); },
    onMobRemove: (id) => {
      views.removeMob(id);
      statusEffects.remove(`m:${id}`);
      hazards.remove(id);
      if (id === currentTargetId) currentTargetId = null;
    },
    onDamage: (ev) => {
      // Feedback en el objetivo: puede ser un mob (auto-attack/Power Strike
      // del jugador) o un jugador (contraataque de un mob) — nunca ambos.
      if (views.hasMob(ev.targetId)) {
        // Si es un esquive, no llamar a onMobDamage (no hay animación de daño)
        if (!ev.dodged) {
          views.onMobDamage(ev.targetId);
        }
        const pos = views.mobWorldPosition(ev.targetId);
        if (pos) {
          if (ev.dodged) {
            damageNumbers.spawnText(pos, "¡Esquivado!", "#2ecc40");
          } else {
            damageNumbers.spawn(pos, ev.amount);
          }
        }
      } else if (views.hasPlayer(ev.targetId)) {
        if (!ev.dodged) {
          views.onPlayerDamage(ev.targetId);
        }
        const pos = views.playerWorldPosition(ev.targetId);
        if (pos) {
          if (ev.dodged) {
            damageNumbers.spawnText(pos, "¡Esquivado!", "#2ecc40");
          } else {
            damageNumbers.spawn(pos, ev.amount);
          }
        }
      }
      // Animación de ataque en el ATACANTE (mob o jugador), vía attackerId.
      if (!ev.skillId && !ev.periodic) views.playAttackerAnim(ev.attackerId);
      // Audio + screen shake: esquive silba, te pegan duele más (shake grande),
      // pegar/ver pegar a otro es un impacto chico.
      if (ev.dodged) {
        audio.play("dodge");
      } else if (ev.targetId === net.sessionId) {
        audio.play("hurt");
        screenShake.addTrauma(0.5);
      } else {
        audio.play("hit");
        screenShake.addTrauma(0.18);
      }
    },
    onDeath: (entityId) => {
      if (views.hasMob(entityId)) {
        views.onMobDeath(entityId);
        if (entityId === currentTargetId) {
          currentTargetId = null;
          views.setTargetHighlight(null);
        }
        audio.play("die");
      } else if (views.hasPlayer(entityId)) {
        views.onPlayerDeath(entityId);
        if (entityId === currentTargetId) {
          currentTargetId = null;
          views.setTargetHighlight(null);
        }
      }
    },
    onLevelUp: (level, learned) => {
      hud.flashLevelUp(level);
      audio.play("levelup");
      screenShake.addTrauma(0.5);
      hud.toast("✦ +3 puntos de atributo — repartilos con C", "#ffd54f", 3200);
      // Etapa 22: reconstruir la barra con las skills aprendidas y avisar las nuevas.
      const learnedIds = availableSkills(className, level, net.getLearnedTomes(), net.getEquipment().weapon);
      skillInput.setSkills(learnedIds);
      skillBar.setSkills(learnedIds);
      for (const id of learned) {
        try {
          const slot = learnedIds.indexOf(id);
          const control = slot >= 0 && slot < 6 ? `tecla ${slot + 1}` : "clic en la barra";
          hud.toast(`✨ ¡Aprendiste ${getSkill(id).name}! (${control})`, "#a0e0ff", 4000);
        } catch { /* skill desconocida */ }
      }
    },
    onBossKilled: (ev) => {
      hud.toast(`⚔ ¡La guild [${ev.guildTag}] abatió al ${ev.bossName}!`, "#ff5252");
      audio.play("boss");
      screenShake.addTrauma(0.7);
    },
    onDailyReset: (ev) => {
      hud.toast(`🔥 ¡Día ${ev.streak}! +${ev.reward} oro · Diaria: ${ev.dailyDesc}`, "#ffd54f", 3800);
    },
    onDailyComplete: (ev) => {
      hud.toast(`✅ ¡Misión diaria completada! +${ev.rewardGold} oro`, "#4fd14f", 3200);
      audio.play("levelup");
    },
    onAchievement: (ev) => {
      hud.toast(`🏆 ¡Logro: ${ev.name}!${ev.title ? ` — Título «${ev.title}»` : ""}`, "#ffd54f", 3800);
      audio.play("levelup");
    },
    onWorldAnnounce: (ev) => {
      hud.announce(ev.text);
      audio.play("boss");
      screenShake.addTrauma(0.35);
    },
    onItemResult: (result) => hud.toast(result.text, result.success ? "#2ecc40" : "#ff6b6b", 3000),
    onItemAdd: (id, itemTemplateId, x, z, mapId, qty) => groundItems.add(id, itemTemplateId, x, z, mapId, qty),
    onItemRemove: (id) => groundItems.remove(id),
    onObjectAdd: (id, snap) => worldObjects.add(id, snap),
    onObjectChange: (id, snap) => worldObjects.update(id, snap),
    onObjectRemove: (id) => worldObjects.remove(id),
    onSkillCast: (ev) => {
      if (ev.mapId && ev.mapId !== net.getSelf()?.mapId) return;
      const caster = views.playerWorldPosition(ev.casterId);
      if (!caster) return;
      let target: THREE.Vector3 | null = null;
      if (ev.targetId) {
        target = views.hasMob(ev.targetId) ? views.mobWorldPosition(ev.targetId) : views.playerWorldPosition(ev.targetId);
      }
      skillEffects.cast(ev.skillId, ev.origin ?? caster, ev.targetPosition ?? target, ev.destination);
      views.playAttackerAnim(ev.casterId);
      // Etapa 22: nombre del skill flotante sobre el caster + número de cura.
      try {
        const skill = getSkill(ev.skillId);
        const nameAbove = caster.clone(); nameAbove.y += 2.6;
        damageNumbers.spawnText(nameAbove, skill.name, "#ffe6a8");
        if ((skill.type === "heal" || skill.type === "buff") && ev.amount && ev.amount > 0) {
          const healAt = caster.clone(); healAt.y += 1.4;
          damageNumbers.spawnText(healAt, `+${ev.amount}`, "#5fd06a");
        }
      } catch { /* skill desconocida */ }
    },
  };

  // Pantalla de creación + login con reintento ante contraseña incorrecta.
  let connected = false;
  let loginError = "";
  while (!connected) {
    const creds = await classSelect.create(loginError);
    className = creds.className;
    try {
      await net.connect(creds.name, creds.password, creds.className, netCallbacks, creds.mode);
      connected = true;
    } catch (err) {
      if (isAuthError(err)) {
        loginError = (err as Error)?.message || "No se pudo entrar. Probá de nuevo.";
        continue;
      }
      console.error("[aden] no se pudo conectar al servidor:", err);
      showServerOffline();
      return;
    }
  }

  // En modo "Entrar", la clase la trae el personaje guardado: esperar el estado del
  // self y leer su clase real antes de armar el kit de skills.
  for (let i = 0; i < 120 && !net.getSelf(); i++) await new Promise((r) => setTimeout(r, 16));
  className = net.getSelf()?.className || className || "knight";

  // Mostrar la premisa narrativa una sola vez, ya conectado.
  await storyCard.show();

  // Interacción con el NPC de misiones: diálogo narrativo contextual.
  // El server es autoritativo; el diálogo es presentación.
  function interactNpc() {
    const self = net.getSelf();
    const pos = views.selfPosition();
    if (!self || !pos) return;

    // Gate de cercanía (espeja el del server)
    if (distance2D(pos.x, pos.z, TOWN.x, TOWN.z) > TOWN_SERVICE_RADIUS) {
      hud.toast(`Acercate al ${ELDER_NAME} para hablarle`, "#ffe066");
      return;
    }

    // Si no hay misión asignada: ofrecer la primera
    if (self.questId === "") {
      try {
        const firstQuestId_ = firstQuestId();
        const q = getQuest(firstQuestId_);
        dialog.open({
          speaker: ELDER_NAME,
          text: q.intro,
          actionLabel: "Aceptar",
          onAction: () => net.sendInteractNpc(),
        });
      } catch {
        // No hay quests disponibles (no debería pasar)
        hud.toast("No hay misiones disponibles", "#ff6b6b");
      }
      return;
    }

    if (self.questId === "campaign_complete") {
      dialog.open({ speaker: ELDER_NAME, text: "Bram vuelve a preparar viajes; Elenya puede hablar de recuperación, y no sólo de sobrevivir. Eso es lo que cambiaste al vencer a Nihil. Los ecos de la maldición aún nos obligan a vigilar la Cripta. Hoy, antes de volver al camino, escuchá a quienes ayudaste.", actionLabel: "Volver a la plaza", onAction: () => {} });
      return;
    }

    // Hay una misión activa
    try {
      const q = getQuest(self.questId);

      // Si la misión está completada: mostrar diálogo de entrega
      if (self.questProgress >= q.amount) {
        dialog.open({
          speaker: ELDER_NAME,
          text: questTurnInText(q.id),
          actionLabel: "Recibir recompensa",
          onAction: () => net.sendInteractNpc(),
        });
      } else {
        // Misión en progreso: recordatorio + progreso
        const advice = q.id === "q_alpha" ? classAdvice(self.className, self.level) : "";
        const progressText = `${q.intro}${advice ? `\n\n${advice}` : ""}\n\n(Progreso: ${self.questProgress}/${q.amount})`;
        dialog.open({
          speaker: ELDER_NAME,
          text: progressText,
          actionLabel: "Entendido",
          onAction: () => {},
        });
      }
    } catch {
      // questId desconocido
      hud.toast("Error desconocido en la misión", "#ff6b6b");
    }
  }

  // Gate común: ¿el jugador está cerca de los servicios del pueblo?
  const nearTown = () => {
    const pos = views.selfPosition();
    return !!pos && distance2D(pos.x, pos.z, TOWN.x, TOWN.z) <= TOWN_SERVICE_RADIUS;
  };

  function serviceStory(npcId: string, text: string): string {
    const self = net.getSelf();
    if (!self) return text;
    const story = npcStory(npcId, self.questId, self.className, self.level);
    return story ? `${story}\n\n${text}` : text;
  }

  // Interacción con el Mercader: abre la tienda si estás lo suficientemente cerca.
  function interactMerchant() {
    if (!net.getSelf()) return;
    if (!nearTown()) { hud.toast("Acercate al Mercader para comprar", "#ffe066"); return; }
    smithPanel.close();
    shopPanel.setGreeting(serviceStory("merchant", ""));
    shopPanel.toggle();
  }

  // Herrero: abre la fragua (tienda de equipo).
  function interactSmith() {
    if (!net.getSelf()) return;
    if (!nearTown()) { hud.toast(`Acercate al ${getNpc("smith").name} para forjar`, "#ffe066"); return; }
    shopPanel.close();
    smithPanel.setGreeting(serviceStory("smith", ""));
    smithPanel.toggle();
  }

  // Sanadora: ofrece descanso completo (HP+MP) por oro.
  function interactHealer() {
    const self = net.getSelf();
    if (!self) return;
    if (!nearTown()) { hud.toast(`Acercate a la ${getNpc("healer").name}`, "#ffe066"); return; }
    if (self.hp >= self.maxHp && self.mp >= self.maxMp) {
      dialog.open({ speaker: getNpc("healer").name, text: serviceStory("healer", "Ya estás en plena forma, aventurero. Volvé cuando el camino te haya golpeado."), actionLabel: "Gracias", onAction: () => {} });
      return;
    }
    if (self.gold < HEAL_COST_GOLD) {
      dialog.open({ speaker: getNpc("healer").name, text: serviceStory("healer", `Un descanso completo cuesta ${HEAL_COST_GOLD} de oro, y no te alcanza. Traé más y te dejaré como nuevo.`), actionLabel: "Entendido", onAction: () => {} });
      return;
    }
    dialog.open({
      speaker: getNpc("healer").name,
      text: serviceStory("healer", `Sentate junto al fuego. Por ${HEAL_COST_GOLD} de oro te curo las heridas y te devuelvo el aliento (HP y MP al máximo).`),
      actionLabel: `Descansar (${HEAL_COST_GOLD} oro)`,
      onAction: () => { net.sendInteractNpc("healer"); hud.toast("Descansaste: HP y MP al máximo ✚", "#5effc8"); },
    });
  }

  // Capitán de la Guardia: contratos repetibles (asignar / progreso / entregar).
  function interactCaptain() {
    const self = net.getSelf();
    if (!self) return;
    if (!nearTown()) { hud.toast(`Acercate al ${getNpc("captain").name}`, "#ffe066"); return; }
    const cap = getNpc("captain").name;
    if (self.bountyId === "") {
      const b = getBounty(firstBountyId());
      dialog.open({
        speaker: cap,
        text: serviceStory("captain", `¿Buscás trabajo, mercenario? Tengo un contrato: "${b.title}" — cazá ${b.amount}. Paga ${b.rewardGold} de oro y ${b.rewardExp} de experiencia.`),
        actionLabel: "Aceptar contrato",
        onAction: () => { net.sendInteractNpc("captain"); hud.toast(`Contrato aceptado: ${b.title}`, "#ff8a5a"); },
      });
      return;
    }
    try {
      const b = getBounty(self.bountyId);
      if (self.bountyProgress >= b.amount) {
        dialog.open({
          speaker: cap,
          text: serviceStory("captain", `Contrato cumplido: "${b.title}". Buen trabajo. Tomá tu paga — y si querés, tengo otro esperando.`),
          actionLabel: "Cobrar",
          onAction: () => { net.sendInteractNpc("captain"); hud.toast(`+${b.rewardGold} oro · +${b.rewardExp} exp`, "#ffd54f"); },
        });
      } else {
        dialog.open({
          speaker: cap,
          text: serviceStory("captain", `Contrato en curso: "${b.title}".\n\n(Progreso: ${self.bountyProgress}/${b.amount})`),
          actionLabel: "Sigo en eso",
          onAction: () => {},
        });
      }
    } catch {
      hud.toast("Contrato desconocido", "#ff6b6b");
    }
  }

  // Targetear (mob o jugador, para PvP): misma lógica de picking en ambos
  // casos, sólo cambia qué mesh golpeó el rayo.
  const pickTarget = (id: string) => {
    currentTargetId = id;
    net.sendSetTarget(id);
    views.setTargetHighlight(id);
  };

  // Interacción con un objeto de mundo (cofre/barril/santuario): gate de cercanía + feedback.
  const interactObject = (id: string) => {
    let def;
    try { def = getWorldObject(id); } catch { return; }
    const pos = views.selfPosition();
    if (pos && distance2D(pos.x, pos.z, def.x, def.z) > OBJECT_INTERACT_RANGE) {
      hud.toast("Acercate para interactuar", "#ffe066");
      return;
    }
    net.sendInteractObject(id);
    if (id === "crypt_seal_1" || id === "crypt_seal_2") {
      // The stage tracker reflects acceptance from the server; no optimistic success toast.
      return;
    }
    if (def.kind === "chest") hud.toast("Abriste un cofre 🎁", "#ffd54f");
    else if (def.kind === "shrine") hud.toast("¡Bendición del santuario! ✨", "#66e0ff");
  };

  const input = new InputController(
    renderer,
    views,
    (msg) => net.sendMove(msg),
    pickTarget,
    pickTarget,
    interactObject,
    () => worldObjects.raycastTargets(),
    () => [
      { object: npc.object, onInteract: interactNpc },
      { object: merchant.object, onInteract: interactMerchant },
      { object: healer.object, onInteract: interactHealer },
      { object: smith.object, onInteract: interactSmith },
      { object: captain.object, onInteract: interactCaptain },
    ],
    {targets:()=>groundItems.raycastTargets(),hover:ray=>groundItems.hover(ray),pick:id=>{
      groundItems.select(id);
      currentTargetId=null;net.sendSetTarget('');views.setTargetHighlight(null);
      const pos=groundItems.position(id);
      if(pos)net.sendMove({x:pos.x,z:pos.z});
      net.sendPickup(id);
    }},
  );
  input.attach(document.body);

  // Configurar el kit de skills de la clase (sólo las APRENDIDAS al nivel actual).
  let kit = availableSkills(className, net.getSelf()?.level ?? 1, net.getLearnedTomes(), net.getEquipment().weapon);
  // Cooldowns locales (feedback optimista; el server es la autoridad real).
  const cooldownUntil: Record<string, number> = {};

  // Usa una skill: chequeo local para feedback INSTANTÁNEO, luego envía al server.
  const useSkill = (skillId: string) => {
    let skill;
    try { skill = getSkill(skillId); } catch { return; }
    const self = net.getSelf();
    if (!self) return;
    // Pre-chequeos con feedback claro (el server igual revalida).
    if (self.stunMs > 0) { hud.toast("¡Aturdido! No podés castear", "#ff6b6b"); return; }
    if ((cooldownUntil[skillId] ?? 0) > Date.now()) { hud.toast("En cooldown", "#ffe066"); return; }
    if (self.mp < skill.mpCost) { hud.toast(`Sin maná (necesitás ${skill.mpCost})`, "#6ba6ff"); return; }
    const needsTarget = skill.type === "damage" || skill.type === "dot";
    if (needsTarget && !currentTargetId) { hud.toast("Necesitás un objetivo", "#ffe066"); return; }
    if (needsTarget && currentTargetId) {
      const from = views.selfPosition();
      const to = views.hasMob(currentTargetId) ? views.mobWorldPosition(currentTargetId) : views.playerWorldPosition(currentTargetId);
      if (!from || !to || Math.hypot(from.x - to.x, from.z - to.z) > skillRange(skill)) {
        hud.toast(`Fuera de alcance (${skillRange(skill)} m)`, "#ffe066"); return;
      }
    }

    net.sendUseSkill(skillId);
    // Cooldown local + veil en la barra.
    cooldownUntil[skillId] = Date.now() + skill.cooldownMs;
    const slotIndex = kit.indexOf(skillId);
    if (slotIndex >= 0) skillBar.triggerCooldown(slotIndex, skill.cooldownMs);
  };

  const skillInput = new SkillInput(useSkill);
  skillBar.setOnUseSkill(useSkill);
  skillInput.setSkills(kit);
  skillInput.attach(document.body);
  skillBar.setSkills(kit);
  // Mantener `kit` sincronizado para ubicar el veil de cooldown correcto.
  const origSetSkills = skillInput.setSkills.bind(skillInput);
  skillInput.setSkills = (ids: string[]) => { kit = ids; origSetSkills(ids); };

  // Tecla "i" → alterna el panel de inventario. No conflictúa con "1"/Space
  // (Power Strike) ni con el resto de InputController (movimiento/click).
  // Tecla "q" → usa una Poción de Vida (si la tienes y HP < maxHp).
  let guildPanelVisible = false;
  let leaderboardPanelVisible = false;
  let progressPanelVisible = false;
  let lastMapId = "";
  document.body.addEventListener("keydown", (e) => {
    // No disparar hotkeys de gameplay mientras se está tipeando en un input
    // (p.ej. el form de crear guild): sin esta guarda, escribir "Guerreros"
    // o el tag "GG" cierra el panel o dispara otras acciones por accidente.
    const ae = document.activeElement;
    if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) return;
    if (e.key === "i" || e.key === "I" || e.code === "KeyI") {
      inventoryPanel.toggle();
    }
    if (e.code === 'KeyP' && !e.repeat) { partyPanel.update(net.getPartyPanelData()); partyPanel.toggle(); }
    if (e.key === 'Escape') partyPanel.setVisible(false);
    if (e.key === "g" || e.key === "G" || e.code === "KeyG") {
      guildPanelVisible = !guildPanelVisible;
      if (guildPanelVisible) guildPanel.update(net.getGuildPanelData());
      guildPanel.setVisible(guildPanelVisible);
    }
    if (e.key === "l" || e.key === "L" || e.code === "KeyL") {
      leaderboardPanelVisible = !leaderboardPanelVisible;
      if (leaderboardPanelVisible) leaderboardPanel.update(net.getLeaderboardData());
      leaderboardPanel.setVisible(leaderboardPanelVisible);
    }
    if (e.key === "t" || e.key === "T" || e.code === "KeyT") {
      progressPanelVisible = !progressPanelVisible;
      progressPanel.setVisible(progressPanelVisible);
      if (progressPanelVisible) progressPanel.update(net.getProgress());
    }
    // Tecla C: panel de atributos (Etapa 21).
    if (e.key === "c" || e.key === "C" || e.code === "KeyC") {
      statsPanel.toggle();
      if (statsPanel.isOpen()) { const s = net.getSelf(); if (s) statsPanel.update(s); }
    }
    // Tecla M: menú de mapas (viajar). Etapa 15.
    if (e.key === "m" || e.key === "M" || e.code === "KeyM") {
      const sc = net.getSelf();
      mapPanel.toggle(sc?.level ?? 1, sc?.mapId ?? "pueblo");
      return;
    }
    // Tecla N: silenciar/activar sonido (movido desde M).
    if ((e.key === "n" || e.key === "N") && !e.repeat) {
      const muted = audio.toggleMuted();
      hud.toast(muted ? "🔇 Sonido apagado" : "🔊 Sonido encendido", "#ffd23f");
      return;
    }
    if (e.key === "q" || e.key === "Q" || e.code === "KeyQ") {
      const self = net.getSelf();
      const inv = net.getInventory();
      if (!self) {
        hud.toast("Esperando al servidor...", "#fff");
        return;
      }
      if (self.hp >= self.maxHp) {
        hud.toast("Ya tenés la vida llena", "#ffe066");
        return;
      }
      const potion = inv.find((it) => it.itemTemplateId === "health_potion");
      if (!potion || potion.qty < 1) {
        hud.toast("No tenés pociones de vida", "#ff6b6b");
        return;
      }
      net.sendUseItem("health_potion");
    }
  });

  const skillId = getClass(className).skillId;

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    damageNumbers.update(dt);
    groundItems.update(dt, renderer.camera);
    skillEffects.update(dt);
    statusEffects.update(dt);
    const self = views.selfPosition();
    const shake = screenShake.update(dt);
    const selfCombat = net.getSelf();
    if (selfCombat) {
      const nextKit = availableSkills(className, selfCombat.level, net.getLearnedTomes(), net.getEquipment().weapon);
      if (nextKit.length !== kit.length || nextKit.some((id, index) => id !== kit[index])) {
        skillInput.setSkills(nextKit);
        skillBar.setSkills(nextKit);
      }
    }
    if (self) {
      renderer.followTarget(self.x, self.z, dt, shake.x, shake.y);
      // Bioma/niebla/luz del mapa actual + cartel al entrar a un mapa nuevo.
      environment.updateMood(self.x, self.z, dt);
      const curZone = zoneAt(self.x, self.z);
      zoneIndicator.update(!curZone.safe);
      zoneBanner.setZone(curZone.id);
    }
    // Etapa 15: mapa actual del jugador → filtra el render y el minimapa; cambia al warpear.
    const myMapId = selfCombat?.mapId ?? "pueblo";
    groundItems.setMap(myMapId);
    views.setCurrentMap(myMapId);
    worldObjects.setCurrentMap(myMapId);
    hazards.setCurrentMap(myMapId);
    worldObjects.update3d(dt);
    ambient.update(dt, myMapId); // vida ambiental (decorativa) del mapa actual
    if (myMapId !== lastMapId) {
      lastMapId = myMapId;
      minimap.setMap(getZone(myMapId));
      audio.setMap(myMapId);
    }
    npc.update(dt);
    merchant.update(dt);
    healer.update(dt);
    smith.update(dt);
    captain.update(dt);
    const objective = selfCombat ? adventure.update(selfCombat) : undefined;
    minimap.update(net.getMinimapEntities(), net.getAdventureTarget() ?? objective);
    // Barra del jefe en pantalla + contador de reaparición (Etapa 14).
    bossBar.update(net.getBossState(), bossRespawnMs);
    if (selfCombat) {
      hud.update(
        selfCombat.hp,
        selfCombat.maxHp,
        selfCombat.mp,
        selfCombat.maxMp,
        selfCombat.dead,
        selfCombat.exp,
        selfCombat.level,
        selfCombat.gold,
        selfCombat.questId,
        selfCombat.questProgress,
        className,
        skillId,
      );
      // El "!" del NPC se pone verde ("✓") cuando la misión activa está lista
      // para entregar → confirma visualmente que el server contó el progreso.
      let ready = false;
      if (selfCombat.questId) {
        try {
          ready = selfCombat.questProgress >= getQuest(selfCombat.questId).amount;
        } catch {
          ready = false;
        }
      }
      npc.setReady(ready);
      // Refrescar el oro mostrado en las tiendas si están abiertas
      if (shopPanel.isOpen()) {
        shopPanel.updateGold(selfCombat.gold);
      }
      if (smithPanel.isOpen()) {
        smithPanel.updateGold(selfCombat.gold);
      }
    }
    inventoryPanel.update({
      entries: net.getInventory().map((it) => ({ ...it, name: getItem(it.itemTemplateId).name })),
      equipment: net.getEquipment(),
      stats: { pAtk: selfCombat?.pAtk ?? 0, pDef: selfCombat?.pDef ?? 0 },
      className: selfCombat?.className,
      level: selfCombat?.level,
      attributes: selfCombat ? { str: selfCombat.str, agi: selfCombat.agi, vit: selfCombat.vit, ene: selfCombat.ene } : undefined,
    });
    partyPanel.update(net.getPartyPanelData());
    if (guildPanelVisible) {
      guildPanel.update(net.getGuildPanelData());
    }
    if (leaderboardPanelVisible) {
      leaderboardPanel.update(net.getLeaderboardData());
    }
    if (statsPanel.isOpen()) {
      const s = net.getSelf();
      if (s) statsPanel.update(s);
    }
    if (progressPanelVisible) {
      progressPanel.update(net.getProgress());
    }
    renderer.render();
    renderer.css2d.render(renderer.scene, renderer.camera);
    requestAnimationFrame(loop);
  }
  loop();
}

/**
 * Overlay amigable cuando el cliente no puede conectar al game server (p.ej. el
 * cliente está desplegado pero el server —que va en un host de Node aparte, no en
 * Vercel— todavía no está levantado o la URL no está configurada).
 */
function showServerOffline(): void {
  const url = (import.meta as any).env?.VITE_SERVER_URL ?? "ws://localhost:2567";
  const div = document.createElement("div");
  div.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "background:radial-gradient(120% 90% at 50% -10%, #1a1206 0%, #0c0a07 55%, #050403 100%);" +
    "color:#ddceb0;font-family:'EB Garamond','Georgia',serif;text-align:center;padding:24px;gap:12px;";
  div.innerHTML =
    `<div style="font-family:'Cinzel','Georgia',serif;font-weight:700;font-size:34px;letter-spacing:3px;color:#f2d896;text-shadow:0 0 18px rgba(201,162,75,0.4);">Aden está dormida</div>` +
    `<div style="height:2px;width:160px;background:linear-gradient(90deg,transparent,#c9a24b,transparent);"></div>` +
    `<div style="max-width:520px;opacity:0.92;line-height:1.6;font-size:17px;">No se pudo conectar al servidor del juego.<br>` +
    `El mundo de Aden necesita su servidor en línea para jugar.</div>` +
    `<div style="opacity:0.45;font-size:12px;margin-top:6px;">Servidor: ${url}</div>` +
    `<button onclick="location.reload()" class="aden-btn" style="margin-top:16px;">Reintentar</button>`;
  document.body.appendChild(div);
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
