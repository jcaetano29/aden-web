import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { Nameplates } from "./render/Nameplates.js";
import { DamageNumbers } from "./render/DamageNumbers.js";
import { Hud } from "./render/Hud.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { MODEL_NAMES, MOB_MODEL_NAMES, pickModelForSession, modelForTemplate } from "./assets/manifest.js";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);

  const factory = new CharacterFactory();
  await factory.preload([...MODEL_NAMES, ...MOB_MODEL_NAMES]);

  const nameplates = new Nameplates();
  const views = new EntityViews(renderer.scene, factory, nameplates);
  const damageNumbers = new DamageNumbers(renderer.scene);
  const hud = new Hud();
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
      views.onMobDamage(ev.targetId);
      const pos = views.mobWorldPosition(ev.targetId);
      if (pos) damageNumbers.spawn(pos, ev.amount);
    },
    onDeath: (entityId) => {
      views.onMobDeath(entityId);
      if (entityId === currentTargetId) {
        currentTargetId = null;
        views.setTargetHighlight(null);
      }
    },
  });

  const input = new InputController(
    renderer,
    views,
    (msg) => net.sendMove(msg),
    (id) => {
      currentTargetId = id;
      net.sendSetTarget(id);
      views.setTargetHighlight(id);
    },
  );
  input.attach(document.body);

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    damageNumbers.update(dt);
    const self = views.selfPosition();
    if (self) renderer.followTarget(self.x, self.z);
    const selfCombat = net.getSelf();
    if (selfCombat) {
      hud.update(selfCombat.hp, selfCombat.maxHp, selfCombat.mp, selfCombat.maxMp, selfCombat.dead);
    }
    renderer.render();
    renderer.css2d.render(renderer.scene, renderer.camera);
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
