import * as THREE from "three";
import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { CharacterFactory } from "./render/CharacterFactory.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";
import { MODEL_NAMES, pickModelForSession } from "./assets/manifest.js";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);

  const factory = new CharacterFactory();
  await factory.preload(MODEL_NAMES);

  const views = new EntityViews(renderer.scene, factory);
  const net = new NetworkClient();

  const name = prompt("Nombre de tu personaje:") ?? "Adventurer";

  await net.connect(name, {
    onAdd: (id, isSelf, snap) =>
      views.add(id, isSelf, pickModelForSession(id, MODEL_NAMES), snap.x, snap.z),
    onChange: (id, snap) => views.update(id, snap),
    onRemove: (id) => views.remove(id),
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
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
