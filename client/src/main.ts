import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { Environment } from "./render/Environment.js";
import { EntityViews } from "./render/EntityViews.js";
import { GroundItems } from "./render/GroundItems.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { Nameplates } from "./render/Nameplates.js";
import { DamageNumbers } from "./render/DamageNumbers.js";
import { Hud } from "./render/Hud.js";
import { InventoryPanel } from "./render/InventoryPanel.js";
import { Npc } from "./render/Npc.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { SkillInput } from "./input/SkillInput.js";
import { MODEL_NAMES, MOB_MODEL_NAMES, pickModelForSession, modelForTemplate } from "./assets/manifest.js";
import { getItem, getQuest, TOWN, distance2D } from "@aden/shared";

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
  const inventoryPanel = new InventoryPanel();
  const npc = new Npc(renderer.scene, renderer.css2d);
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

  await net.connect(name, {
    onAdd: (id, isSelf, snap) =>
      views.add(id, isSelf, pickModelForSession(id, MODEL_NAMES), snap),
    onChange: (id, snap) => views.update(id, snap),
    onRemove: (id) => views.remove(id),
    onMobAdd: (id, templateId, snap) => views.addMob(id, modelForTemplate(templateId), snap),
    onMobChange: (id, snap) => views.updateMob(id, snap),
    onMobRemove: (id) => {
      views.removeMob(id);
      if (id === currentTargetId) currentTargetId = null;
    },
    onDamage: (ev) => {
      // Feedback en el objetivo: puede ser un mob (auto-attack/Power Strike
      // del jugador) o un jugador (contraataque de un mob) — nunca ambos.
      if (views.hasMob(ev.targetId)) {
        views.onMobDamage(ev.targetId);
        const pos = views.mobWorldPosition(ev.targetId);
        if (pos) damageNumbers.spawn(pos, ev.amount);
      } else if (views.hasPlayer(ev.targetId)) {
        views.onPlayerDamage(ev.targetId);
        const pos = views.playerWorldPosition(ev.targetId);
        if (pos) damageNumbers.spawn(pos, ev.amount);
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

  // Interacción con el NPC de misiones: da feedback claro (el server es
  // autoritativo y silencioso si no corresponde, así que el cliente explica
  // qué pasó). Espeja el gate de cercanía del server (radio ~4 del pueblo).
  function interactNpc() {
    const self = net.getSelf();
    const pos = views.selfPosition();
    if (!self || !pos) return;
    if (distance2D(pos.x, pos.z, TOWN.x, TOWN.z) > 4) {
      hud.toast("Acercate al Anciano del Pueblo para hablarle", "#ffe066");
      return; // el server lo rechazaría igual; guiamos al jugador
    }
    net.sendInteractNpc();
    if (self.questId === "") {
      hud.toast("¡Nueva misión asignada!", "#2ecc40");
      return;
    }
    try {
      const q = getQuest(self.questId);
      if (self.questProgress >= q.amount) {
        hud.toast(`¡Misión completada!  +${q.rewardExp} EXP   +${q.rewardGold} oro`, "#2ecc40");
      } else {
        const faltan = q.amount - self.questProgress;
        hud.toast(`«${q.title}» — te faltan ${faltan} (${self.questProgress}/${q.amount})`, "#fff");
      }
    } catch {
      /* questId desconocido: ignorar el feedback, el server ya recibió el intent */
    }
  }

  const input = new InputController(
    renderer,
    views,
    (msg) => net.sendMove(msg),
    (id) => {
      currentTargetId = id;
      net.sendSetTarget(id);
      views.setTargetHighlight(id);
    },
    () => interactNpc(),
    npc.object,
  );
  input.attach(document.body);

  const skillInput = new SkillInput((id) => net.sendUseSkill(id));
  skillInput.attach(document.body);

  // Tecla "i" → alterna el panel de inventario. No conflictúa con "1"/Space
  // (Power Strike) ni con el resto de InputController (movimiento/click).
  document.body.addEventListener("keydown", (e) => {
    if (e.key === "i" || e.key === "I" || e.code === "KeyI") {
      inventoryPanel.toggle();
    }
  });

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    damageNumbers.update(dt);
    groundItems.update(dt);
    const self = views.selfPosition();
    if (self) renderer.followTarget(self.x, self.z, dt);
    const selfCombat = net.getSelf();
    npc.update(dt);
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
