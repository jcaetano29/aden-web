import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { Nameplates } from "./render/Nameplates.js";
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
  const net = new NetworkClient();

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
    onMobRemove: (id) => views.removeMob(id),
  });

  const input = new InputController(renderer, (msg) => net.sendMove(msg));
  input.attach(document.body);

  const clock = new THREE.Clock();
  function loop() {
    const dt = clock.getDelta();
    views.updateAll(dt);
    const self = views.selfPosition();
    if (self) renderer.followTarget(self.x, self.z);
    renderer.render();
    renderer.css2d.render(renderer.scene, renderer.camera);
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
