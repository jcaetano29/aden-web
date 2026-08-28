import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { Environment } from "./render/Environment.js";
import { EntityViews } from "./render/EntityViews.js";
import { GroundItems } from "./render/GroundItems.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { Nameplates } from "./render/Nameplates.js";
import { DamageNumbers } from "./render/DamageNumbers.js";
import { Hud } from "./render/Hud.js";
import { SkillBar } from "./render/SkillBar.js";
import { InventoryPanel } from "./render/InventoryPanel.js";
import { GuildPanel } from "./render/GuildPanel.js";
import { LeaderboardPanel } from "./render/LeaderboardPanel.js";
import { ProgressPanel } from "./render/ProgressPanel.js";
import { BossBar } from "./render/BossBar.js";
import { MapPanel } from "./render/MapPanel.js";
import { WorldObjectViews } from "./render/WorldObjectViews.js";
import { SkillEffects } from "./render/SkillEffects.js";
import { Npc } from "./render/Npc.js";
import { Merchant } from "./render/Merchant.js";
import { ShopPanel } from "./render/ShopPanel.js";
import { ClassSelect } from "./render/ClassSelect.js";
import { Minimap } from "./render/Minimap.js";
import { StoryCard } from "./render/StoryCard.js";
import { DialogPanel } from "./render/DialogPanel.js";
import { ZoneIndicator } from "./render/ZoneIndicator.js";
import { ZoneBanner } from "./render/ZoneBanner.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { SkillInput } from "./input/SkillInput.js";
import { AudioEngine } from "./audio/AudioEngine.js";
import { ScreenShake } from "./render/ScreenShake.js";
import { MODEL_NAMES, MOB_MODEL_NAMES, modelForClass, modelForTemplate } from "./assets/manifest.js";
import { getItem, getQuest, TOWN, distance2D, getClass, getClassSkills, getSkill, ELDER_NAME, firstQuestId, zoneAt, getZone, respawnForTemplate, getWorldObject, OBJECT_INTERACT_RANGE } from "@aden/shared";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);
  const environment = new Environment(renderer.scene); // biomas por zona, niebla dinámica, props

  const factory = new CharacterFactory();
  await factory.preload([...MODEL_NAMES, ...MOB_MODEL_NAMES]);

  const nameplates = new Nameplates();
  const views = new EntityViews(renderer.scene, factory, nameplates);
  const damageNumbers = new DamageNumbers(renderer.scene);
  const groundItems = new GroundItems(renderer.scene);
  const worldObjects = new WorldObjectViews(renderer.scene);
  const skillEffects = new SkillEffects(renderer.scene);
  const audio = new AudioEngine();
  const screenShake = new ScreenShake();
  // Autoplay policy: el AudioContext sólo puede arrancar/reanudarse tras un
  // gesto del usuario. Se engancha una vez a pointerdown y a keydown (lo que
  // llegue primero) y se desregistra sola gracias a { once: true }.
  window.addEventListener("pointerdown", () => audio.resume(), { once: true });
  window.addEventListener("keydown", () => audio.resume(), { once: true });
  const hud = new Hud();
  const skillBar = new SkillBar();
  const npc = new Npc(renderer.scene, renderer.css2d);
  const merchant = new Merchant(renderer.scene, renderer.css2d);
  const shopPanel = new ShopPanel((itemId) => {
    net.sendBuyItem(itemId);
    hud.toast(`¡Compraste ${getItem(itemId).name}!`, "#2ecc40");
  });
  const inventoryPanel = new InventoryPanel(document.body, {
    onUseItem: (itemId) => net.sendUseItem(itemId),
    onEquip: (itemId) => {
      net.sendEquipItem(itemId);
      hud.toast(`Equipaste ${getItem(itemId).name}`, "#4da6ff");
    },
    onUnequip: (slot) => net.sendUnequipItem(slot),
  });
  const guildPanel = new GuildPanel({
    onCreate: (name_, tag) => net.sendCreateGuild(name_, tag),
    onJoin: (guildId) => net.sendJoinGuild(guildId),
    onLeave: () => net.sendLeaveGuild(),
  });
  guildPanel.mount(document.body);
  const leaderboardPanel = new LeaderboardPanel();
  leaderboardPanel.mount(document.body);
  const progressPanel = new ProgressPanel((title) => net.sendSetTitle(title));
  progressPanel.mount(document.body);
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

  let name: string;
  try {
    name = prompt("Nombre de tu personaje:") ?? "Adventurer";
  } catch {
    // prompt() puede no estar disponible en algunos contextos (p.ej. embebido); fallback seguro.
    name = "Adventurer";
  }

  // Esperar la selección de clase antes de conectar
  const className = await classSelect.select();

  // Mostrar la premisa narrativa una sola vez
  await storyCard.show();

  try {
   await net.connect(name, className, {
    onAdd: (id, isSelf, snap) =>
      views.add(id, isSelf, modelForClass(snap.className ?? "knight"), snap),
    onChange: (id, snap) => views.update(id, snap),
    onRemove: (id) => views.remove(id),
    onMobAdd: (id, templateId, snap) => views.addMob(id, modelForTemplate(templateId), templateId, snap),
    onMobChange: (id, snap) => views.updateMob(id, snap),
    onMobRemove: (id) => {
      views.removeMob(id);
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
      views.playAttackerAnim(ev.attackerId);
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
    onLevelUp: (level) => {
      hud.flashLevelUp(level);
      audio.play("levelup");
      screenShake.addTrauma(0.5);
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
    onItemAdd: (id, itemTemplateId, x, z) => groundItems.add(id, itemTemplateId, x, z),
    onItemRemove: (id) => groundItems.remove(id),
    onObjectAdd: (id, snap) => worldObjects.add(id, snap),
    onObjectChange: (id, snap) => worldObjects.update(id, snap),
    onObjectRemove: (id) => worldObjects.remove(id),
    onSkillCast: (ev) => {
      const caster = views.playerWorldPosition(ev.casterId);
      if (!caster) return;
      let target: THREE.Vector3 | null = null;
      if (ev.targetId) {
        target = views.hasMob(ev.targetId) ? views.mobWorldPosition(ev.targetId) : views.playerWorldPosition(ev.targetId);
      }
      skillEffects.cast(ev.skillId, { x: caster.x, z: caster.z }, target ? { x: target.x, z: target.z } : null);
    },
   });
  } catch (err) {
    console.error("[aden] no se pudo conectar al servidor:", err);
    showServerOffline();
    return;
  }

  // Interacción con el NPC de misiones: diálogo narrativo contextual.
  // El server es autoritativo; el diálogo es presentación.
  function interactNpc() {
    const self = net.getSelf();
    const pos = views.selfPosition();
    if (!self || !pos) return;

    // Gate de cercanía (espeja el del server)
    if (distance2D(pos.x, pos.z, TOWN.x, TOWN.z) > 4) {
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

    // Hay una misión activa
    try {
      const q = getQuest(self.questId);

      // Si la misión está completada: mostrar diálogo de entrega
      if (self.questProgress >= q.amount) {
        dialog.open({
          speaker: ELDER_NAME,
          text: q.done,
          actionLabel: "Continuar",
          onAction: () => net.sendInteractNpc(),
        });
      } else {
        // Misión en progreso: recordatorio + progreso
        const progressText = `${q.intro}\n\n(Progreso: ${self.questProgress}/${q.amount})`;
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

  // Interacción con el Mercader: abre la tienda si estás lo suficientemente cerca.
  function interactMerchant() {
    const self = net.getSelf();
    const pos = views.selfPosition();
    if (!self || !pos) return;
    if (distance2D(pos.x, pos.z, TOWN.x, TOWN.z) > 4) {
      hud.toast("Acercate al Mercader para comprar", "#ffe066");
      return;
    }
    shopPanel.toggle();
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
    if (def.kind === "chest") hud.toast("Abriste un cofre 🎁", "#ffd54f");
    else if (def.kind === "shrine") hud.toast("¡Bendición del santuario! ✨", "#66e0ff");
  };

  const input = new InputController(
    renderer,
    views,
    (msg) => net.sendMove(msg),
    pickTarget,
    pickTarget,
    () => interactNpc(),
    npc.object,
    () => interactMerchant(),
    merchant.object,
    interactObject,
    () => worldObjects.raycastTargets(),
  );
  input.attach(document.body);

  // Configurar el kit de skills de la clase
  const kit = getClassSkills(className);
  let skillInputCreated = false;

  // Función auxiliar para usar una skill: envía al server, activa cooldown local y feedback
  const useSkill = (skillId: string) => {
    net.sendUseSkill(skillId);

    try {
      const skill = getSkill(skillId);

      // Encontrar el índice del slot en el kit
      const slotIndex = kit.indexOf(skillId);
      if (slotIndex >= 0) {
        skillBar.triggerCooldown(slotIndex, skill.cooldownMs);
      }

      // Feedback por tipo de skill
      if (skill.type === "heal") {
        hud.toast("Te curaste", "#2ecc40");
      } else if (skill.type === "buff") {
        hud.toast(`¡${skill.name}!`, "#ffe066");
      } else if (skill.type === "dot") {
        hud.toast(`${skill.name} aplicado`, "#a0e");
      }
      // Para damage, no mostrar toast (o mensaje muy breve)
    } catch {
      // Skill desconocida, ignorar
    }
  };

  const skillInput = new SkillInput(useSkill);
  skillInput.setSkills(kit);
  skillInput.attach(document.body);
  skillBar.setSkills(kit);

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
    // Tecla M: menú de mapas (viajar). Etapa 15.
    if (e.key === "m" || e.key === "M" || e.code === "KeyM") {
      const sc = net.getSelf();
      mapPanel.toggle(sc?.level ?? 1, sc?.mapId ?? "pueblo");
      return;
    }
    // Tecla N: silenciar/activar sonido (movido desde M).
    if (e.key === "n" || e.key === "N") {
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
      hud.toast("Usaste una Poción de Vida", "#2ecc40");
    }
  });

  const skillId = getClass(className).skillId;

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    damageNumbers.update(dt);
    groundItems.update(dt);
    skillEffects.update(dt);
    const self = views.selfPosition();
    const shake = screenShake.update(dt);
    const selfCombat = net.getSelf();
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
    views.setCurrentMap(myMapId);
    worldObjects.setCurrentMap(myMapId);
    worldObjects.update3d(dt);
    if (myMapId !== lastMapId) {
      lastMapId = myMapId;
      minimap.setMap(getZone(myMapId));
    }
    npc.update(dt);
    merchant.update(dt);
    minimap.update(net.getMinimapEntities());
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
      // Refrescar el oro mostrado en la tienda si está abierta
      if (shopPanel.isOpen()) {
        shopPanel.updateGold(selfCombat.gold);
      }
    }
    inventoryPanel.update({
      entries: net.getInventory().map((it) => ({ ...it, name: getItem(it.itemTemplateId).name })),
      equipment: net.getEquipment(),
      stats: { pAtk: selfCombat?.pAtk ?? 0, pDef: selfCombat?.pDef ?? 0 },
    });
    if (guildPanelVisible) {
      guildPanel.update(net.getGuildPanelData());
    }
    if (leaderboardPanelVisible) {
      leaderboardPanel.update(net.getLeaderboardData());
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
    "background:rgba(8,10,16,0.95);color:#fff;font:16px sans-serif;text-align:center;padding:24px;gap:10px;";
  div.innerHTML =
    `<div style="font:bold 26px 'Georgia',serif;color:#ffd54f;">Aden está dormida</div>` +
    `<div style="max-width:520px;opacity:0.9;line-height:1.5;">No se pudo conectar al servidor del juego.<br>` +
    `El mundo de Aden necesita su servidor en línea para jugar.</div>` +
    `<div style="opacity:0.5;font-size:12px;margin-top:8px;">Servidor: ${url}</div>` +
    `<button onclick="location.reload()" style="margin-top:14px;padding:8px 18px;background:#ffd54f;color:#000;border:none;border-radius:6px;font:bold 14px sans-serif;cursor:pointer;">Reintentar</button>`;
  document.body.appendChild(div);
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
