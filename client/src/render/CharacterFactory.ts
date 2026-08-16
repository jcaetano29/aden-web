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
}

export class CharacterFactory {
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, LoadedModel>();

  async preload(names: readonly string[]): Promise<void> {
    await Promise.all(
      names.map(async (name) => {
        const gltf = await this.loader.loadAsync(modelUrl(name));
        this.loaded.set(name, { scene: gltf.scene, animations: gltf.animations });
        // R-E1-2: log clip names para verificar que selectClip elige bien.
        console.log(
          `[aden] modelo "${name}" clips:`,
          gltf.animations.map((c) => c.name),
        );
      }),
    );
  }

  create(modelName: string): Character {
    const model = this.loaded.get(modelName);
    if (!model) throw new Error(`CharacterFactory: modelo no precargado: ${modelName}`);
    const root = cloneSkeleton(model.scene);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of model.animations) {
      actions.set(clip.name, mixer.clipAction(clip));
    }
    let current: THREE.AnimationAction | null = null;
    return {
      root,
      mixer,
      clipNames: model.animations.map((c) => c.name),
      play(name: string) {
        const next = actions.get(name);
        if (!next || next === current) return;
        next.reset().fadeIn(0.2).play();
        if (current) current.fadeOut(0.2);
        current = next;
      },
    };
  }
}
