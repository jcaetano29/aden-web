import { Renderer } from "./render/Renderer.js";
import { EntityViews } from "./render/EntityViews.js";
import { NetworkClient } from "./net/NetworkClient.js";
import { InputController } from "./input/InputController.js";

async function main() {
  const app = document.getElementById("app")!;
  const renderer = new Renderer(app);
  const views = new EntityViews(renderer.scene);
  const net = new NetworkClient();

  const name = prompt("Nombre de tu personaje:") ?? "Adventurer";

  await net.connect(name, {
    onAdd: (id, isSelf) => views.add(id, isSelf),
    onChange: (id, x, z) => views.update(id, x, z),
    onRemove: (id) => views.remove(id),
  });

  const input = new InputController(renderer, (msg) => net.sendMove(msg));
  input.attach(document.body);

  function loop() {
    renderer.render();
    requestAnimationFrame(loop);
  }
  loop();
}

main().catch((err) => console.error("[aden] fallo al iniciar:", err));
