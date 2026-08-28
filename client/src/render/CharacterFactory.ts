import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelUrl } from "../assets/manifest.js";

interface LoadedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export interface Character {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clipNames: string[];
  play(name: string): void;
  /**
   * Reproduce `name` una sola vez (LoopOnce + clampWhenFinished, queda clavado
   * en el último frame) y llama a `onFinished` cuando termina. Si se llama de
   * nuevo (once u otro `play`) antes de terminar, el callback pendiente se
   * descarta silenciosamente (no se acumulan).
   */
  playOnce(name: string, onFinished: () => void): void;
}

export class CharacterFactory {
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, LoadedModel>();

  async preload(names: readonly string[]): Promise<void> {
    await Promise.all(
      names.map(async (name) => {
        const gltf = await this.loader.loadAsync(modelUrl(name));
        this.loaded.set(name, { scene: gltf.scene, animations: gltf.animations });
      }),
    );
  }

  create(modelName: string): Character {
    const model = this.loaded.get(modelName);
    if (!model) throw new Error(`CharacterFactory: modelo no precargado: ${modelName}`);
    const root = cloneSkeleton(model.scene);
    // Etapa 18: los personajes proyectan sombra (no la reciben — son delgados).
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of model.animations) {
      actions.set(clip.name, mixer.clipAction(clip));
    }
    let current: THREE.AnimationAction | null = null;
    // Estado del one-shot activo (si hay uno), para saber a cuál corresponde
    // el evento "finished" del mixer (que se dispara para CUALQUIER acción).
    let onceAction: THREE.AnimationAction | null = null;
    let onceCallback: (() => void) | null = null;

    mixer.addEventListener("finished", (e: { action: THREE.AnimationAction }) => {
      if (e.action !== onceAction) return;
      const cb = onceCallback;
      onceAction = null;
      onceCallback = null;
      cb?.();
    });

    return {
      root,
      mixer,
      clipNames: model.animations.map((c) => c.name),
      play(name: string) {
        const next = actions.get(name);
        if (!next || next === current) return;
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.reset().fadeIn(0.2).play();
        if (current) current.fadeOut(0.2);
        current = next;
        onceAction = null;
        onceCallback = null;
      },
      playOnce(name: string, onFinished: () => void) {
        const next = actions.get(name);
        if (!next) {
          onFinished();
          return;
        }
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        next.reset().fadeIn(0.1).play();
        if (current && current !== next) current.fadeOut(0.1);
        current = next;
        onceAction = next;
        onceCallback = onFinished;
      },
    };
  }
}
