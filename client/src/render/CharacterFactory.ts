import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelUrl, MODEL_HEIGHTS } from "../assets/manifest.js";
import { CharacterMaterial } from "./CharacterMaterial.js";
import { addHeroDetails } from "./HeroDetails.js";
import { addRevenantDetails } from "./RevenantDetails.js";

interface LoadedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export interface Character {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clipNames: string[];
  play(name: string, immediate?: boolean): void;
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
        // Reduce the remaining skeletons' oversized heads, including animated
        // scale keys, so subsequent clips cannot restore the old proportions.
        {
          const headName = name.startsWith("Skeleton_") ? "head" : "Head";
          const headScale = name === "DeathWraith" ? 0.85 : name === "AncientDrake" ? 0.62 : 0.63;
          gltf.scene.getObjectByName(headName)?.scale.multiplyScalar(headScale);
          for (const clip of gltf.animations) for (const track of clip.tracks)
            if (track.name === `${headName}.scale`) for (let i=0;i<track.values.length;i++) track.values[i]*=headScale;
        }
        if (name === "Mage") {
          const spell=gltf.animations.find(clip=>clip.name==="Spell1")?.clone();
          if(spell) { spell.name="Primary_Attack";gltf.animations.push(spell); }
        }
        const materials = new Map<THREE.Material, THREE.Material>();
        const finish = (source: THREE.Material): THREE.Material => {
          if (name.startsWith("Dread") && source instanceof THREE.MeshBasicMaterial) {
            let material=materials.get(source);
            if(!material){material=new THREE.MeshStandardMaterial({name:source.name,map:source.map,color:name==="DreadKnight"?0x858f9c:0x667989,roughness:.7,metalness:.25,side:source.side});materials.set(source,material);}
            return material;
          }
          if (["Knight", "Mage", "Rogue", "Barbarian"].includes(name) && source instanceof THREE.MeshBasicMaterial) {
            let material = materials.get(source);
            if (!material) {
              material = new THREE.MeshStandardMaterial({ name: source.name, color: source.color, map: source.map, side: source.side, transparent: source.transparent, opacity: source.opacity, alphaTest: source.alphaTest, roughness: 0.78, metalness: 0.08 });
              materials.set(source, material);
            }
            return material;
          }
          if (!(source instanceof THREE.MeshStandardMaterial)) return source;
          let material = materials.get(source);
          if (!material) {
            material = new CharacterMaterial().copy(source);
            if (["OrcBrute", "ForestTroll", "BoneWarden", "InfernalDemon", "DeathWraith", "AncientDrake"].includes(name)) {
              material.name = `monster_${name}_${source.name}`;
            }
            materials.set(source, material);
          }
          return material;
        };
        gltf.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(finish) : finish(mesh.material);
        });
        // Keep normalization outside animated nodes: root animation tracks must
        // never overwrite world scale or move the entity away from server coordinates.
        // Fit proportions and accessories in the actual idle pose, not the
        // exporter's rest pose (whose head tilt differs between hero rigs).
        const idle = gltf.animations.find(clip => clip.name === "Idle");
        if (idle) {
          const pose = new THREE.AnimationMixer(gltf.scene);
          pose.clipAction(idle).play(); pose.update(0);
        }
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.update();});
        const box=new THREE.Box3().setFromObject(gltf.scene,true);
        const size=box.getSize(new THREE.Vector3());
        const height=MODEL_HEIGHTS[name] ?? 2.4;
        const scale=height/Math.max(size.y,0.001);
        const normalized=new THREE.Group();
        normalized.name=`${name}_normalized`;
        normalized.scale.setScalar(scale);
        normalized.position.y=-box.min.y*scale;
        normalized.add(gltf.scene);
        const root=new THREE.Group();root.add(normalized);root.userData.visualHeight=height;
        addHeroDetails(root, name);
        addRevenantDetails(root, name);
        this.loaded.set(name, { scene: root, animations: gltf.animations });
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
      play(name: string, immediate = false) {
        const next = actions.get(name);
        if (!next || (next === current && !immediate)) return;
        if (immediate) {
          mixer.stopAllAction();
          current = null;
        }
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
        if (!immediate) next.fadeIn(0.2);
        next.play();
        if (current) current.fadeOut(0.2);
        current = next;
        onceAction = null;
        onceCallback = null;
        if (immediate) mixer.update(0);
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
