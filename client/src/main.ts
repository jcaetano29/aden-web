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
import { Npc } from "./render/Npc.js";
import { Merchant } from "./render/Merchant.js";
import { ShopPanel } from "./render/ShopPanel.js";
import { ClassSelect } from "./render/ClassSelect.js";
import { Minimap } from "./render/Minimap.js";
import { StoryCard } from "./render/StoryCard.js";
import { DialogPanel } from "./render/DialogPanel.js";
import { ZoneIndicator } from "./render/ZoneIndicator.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { SkillInput } from "./input/SkillInput.js";
import { MODEL_NAMES, MOB_MODEL_NAMES, modelForClass, modelForTemplate } from "./assets/manifest.js";
import { getItem, getQuest, TOWN, distance2D, getClass, getClassSkills, getSkill, SPAWN_ZONES, isBoss, ELDER_NAME, firstQuestId, SAFE_RADIUS } from "@aden/shared";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);
  new Environment(renderer.scene); // cielo, niebla, luces y props procedurales

  const factory = new CharacterFactory();
  await factory.preload([...MODEL_NAMES, ...MOB_MODEL_NAMES]);

  const nameplates = new Nameplates();
  const views = new EntityViews(renderer.scene, factory, nameplates);
  const damageNumbers = new DamageNumbers(renderer.scene);
  const groundItems = new GroundItems(renderer.scene);
  const hud = new Hud();
  const skillBar = new SkillBar();
  const npc = new Npc(renderer.scene, renderer.css2d);
  const merchant = new Merchant(renderer.scene, renderer.css2d);
  const shopPanel = new ShopPanel((itemId) => {
    net.sendBuyItem(itemId);
    hud.toast(`¡Compraste ${getItem(itemId).name}!`, "#2ecc40");
  });
  const inventoryPanel = new InventoryPanel(
    document.body,
    (itemId) => net.sendUseItem(itemId),
  );
  const classSelect = new ClassSelect();
  const storyCard = new StoryCard();
  const dialog = new DialogPanel();
  const zoneIndicator = new ZoneIndicator();
  zoneIndicator.mount(document.body);

  // Minimapa (esquina sup. der.) con marcadores fijos: NPCs y la arena del jefe.
  const minimap = new Minimap();
  const bossZone = SPAWN_ZONES.find((z) => isBoss(z.templateId));
  minimap.setMarkers([
    { x: TOWN.x, z: TOWN.z, label: "!", color: "#ffd54f" }, // Anciano (misiones)
    { x: merchant.object.position.x, z: merchant.object.position.z, label: "$", color: "#f4c430" }, // Mercader
    ...(bossZone ? [{ x: bossZone.centerX, z: bossZone.centerZ, label: "♛", color: "#ff5252" }] : []), // arena del jefe (♛)
  ]);
  const net = new NetworkClient();

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
    },
    onDeath: (entityId) => {
      if (views.hasMob(entityId)) {
        views.onMobDeath(entityId);
        if (entityId === currentTargetId) {
          currentTargetId = null;
          views.setTargetHighlight(null);
        }
      } else if (views.hasPlayer(entityId)) {
        views.onPlayerDeath(entityId);
      }
    },
    onLevelUp: (level) => hud.flashLevelUp(level),
    onItemAdd: (id, itemTemplateId, x, z) => groundItems.add(id, itemTemplateId, x, z),
    onItemRemove: (id) => groundItems.remove(id),
  });

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
  document.body.addEventListener("keydown", (e) => {
    if (e.key === "i" || e.key === "I" || e.code === "KeyI") {
      inventoryPanel.toggle();
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
    const self = views.selfPosition();
    if (self) {
      renderer.followTarget(self.x, self.z, dt);
      zoneIndicator.update(distance2D(self.x, self.z, TOWN.x, TOWN.z) > SAFE_RADIUS);
    }
    const selfCombat = net.getSelf();
    npc.update(dt);
    merchant.update(dt);
    // Marcador de objetivo en el minimapa: la zona de spawn del enemigo de la
    // misión activa (dónde ir a cazar). null si no hay misión o zona conocida.
    let objective = null;
    if (selfCombat?.questId) {
      try {
        const mobId = getQuest(selfCombat.questId).mobTemplateId;
        const zone = SPAWN_ZONES.find((z) => z.templateId === mobId);
        if (zone) objective = { x: zone.centerX, z: zone.centerZ, label: "⚔", color: "#ff184c" };
      } catch { /* questId desconocido: sin objetivo */ }
    }
    minimap.setObjective(objective);
    minimap.update(net.getMinimapEntities());
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
    inventoryPanel.update(
      net.getInventory().map((it) => ({ ...it, name: getItem(it.itemTemplateId).name })),
    );
    renderer.render();
    renderer.css2d.render(renderer.scene, renderer.camera);
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
