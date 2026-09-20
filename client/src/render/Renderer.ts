import * as THREE from "three";
import { terrainMat } from "./textures.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/** Viñeta sutil + tinte cálido en sombras: encuadra la escena, look cinematográfico. */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: 1.08 },
    darkness: { value: 0.72 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float offset; uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * offset;
      float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0);
      gl_FragColor = vec4(tex.rgb * vig, tex.a);
    }`,
};
import { MAP_BOUNDS } from "@aden/shared";
import { smoothTowards } from "./motion.js";

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly raycaster = new THREE.Raycaster();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly ground: THREE.Mesh;
  private readonly css2dRenderer: CSS2DRenderer;
  private readonly composer: EffectComposer;
  // Base de la cámara (sin shake) que `followTarget` suaviza; el shake se suma
  // encima al final de cada frame para no acumularse sobre sí mismo (drift).
  private camBaseX = 0;
  private camBaseY = 30;
  private camBaseZ = 30;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Etapa 18: sombras suaves + tone mapping cinematográfico (ACES).
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    // CSS2DRenderer para nameplates: capa DOM superpuesta al canvas WebGL,
    // del mismo tamaño, no intercepta clicks (pointer-events:none) para que
    // el raycasting de click-to-move siga funcionando sobre el canvas.
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.domElement.style.position = "absolute";
    this.css2dRenderer.domElement.style.top = "0";
    this.css2dRenderer.domElement.style.left = "0";
    this.css2dRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(this.css2dRenderer.domElement);

    // El cielo, la niebla y las luces los agrega Environment (para no sobre-iluminar).
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    // Suelo base que cubre TODO el mundo (MAP_BOUNDS): es el único objetivo del
    // raycast de click-to-move, así que debe abarcar toda el área caminable. Los
    // biomas por zona (Environment) se pintan como discos ENCIMA de este plano;
    // no interfieren con el picking porque `pickGround` sólo raycastea `this.ground`.

    const worldW = MAP_BOUNDS.maxX - MAP_BOUNDS.minX;
    const worldD = MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ;
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(worldW, worldD),
      terrainMat("pueblo", [worldW / 9, worldD / 9]),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(
      (MAP_BOUNDS.minX + MAP_BOUNDS.maxX) / 2,
      0,
      (MAP_BOUNDS.minZ + MAP_BOUNDS.maxZ) / 2,
    );
    this.ground.receiveShadow = true; // el suelo recibe sombras (no las proyecta)
    this.scene.add(this.ground);

    // Etapa 18: post-proceso — bloom para que emissivos (fuego, santuarios, brasas,
    // VFX de skills) resplandezcan. RenderPass (HDR lineal) → Bloom → OutputPass (tone map + sRGB).
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.38, // strength: brasas, oro, cristales y el sol florecen más
      0.6, // radius
      1.05, // threshold
    );
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
    // Viñeta final (sobre la imagen ya tone-mapeada) → encuadre cinematográfico.
    this.composer.addPass(new ShaderPass(VignetteShader));

    window.addEventListener("resize", () => this.onResize());
  }

  get css2d(): CSS2DRenderer {
    return this.css2dRenderer;
  }

  /** Devuelve el punto del suelo bajo el click en NDC, o null. */
  pickGround(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.intersectObject(this.ground)[0];
    return hit ? hit.point : null;
  }

  /**
   * Raycast contra los mobs bajo el click en NDC; devuelve el mobId del hit más
   * cercano, o null. R-E2b1-5: los mobs son SkinnedMesh dentro del root Object3D,
   * por lo que el raycast contra los roots DEBE ser recursivo (recursive=true) —
   * un intersectObjects no-recursivo no golpea la geometría skinned. Se resuelve
   * el objeto golpeado (hijo) hacia su mob root/id vía `idOf`, subiendo por
   * `.parent` hasta encontrar un id.
   */
  pickMobs(
    ndcX: number,
    ndcY: number,
    targets: { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null },
  ): string | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(targets.objects, true);
    for (const hit of hits) {
      const id = targets.idOf(hit.object);
      if (id) return id;
    }
    return null;
  }

  render() {
    this.composer.render();
  }

  /**
   * Cámara en tercera persona que sigue al self con offset fijo, suavizada:
   * en vez de teletransportarse cada frame, converge hacia (target+offset) con
   * `smoothTowards` (independiente del framerate) → seguimiento fluido.
   *
   * El suavizado se aplica sobre una base interna (`camBase*`), no directamente
   * sobre `camera.position`: el shake (screen shake) se suma encima al final,
   * así el offset de shake nunca "contamina" la base que se está suavizando
   * (evita drift acumulado frame a frame).
   */
  followTarget(x: number, z: number, dt: number, shakeX = 0, shakeY = 0): void {
    // Etapa 15: al warpear (salto grande), teletransportar la cámara en vez de barrer el vacío.
    if (Math.hypot(this.camBaseX - x, this.camBaseZ - (z + 22)) > 60) {
      this.camBaseX = x; this.camBaseZ = z + 22;
    }
    const K = 6; // rapidez de convergencia
    this.camBaseX = smoothTowards(this.camBaseX, x, K, dt);
    this.camBaseY = smoothTowards(this.camBaseY, 22, K, dt);
    this.camBaseZ = smoothTowards(this.camBaseZ, z + 22, K, dt);
    this.camera.position.set(this.camBaseX + shakeX, this.camBaseY + shakeY, this.camBaseZ);
    this.camera.lookAt(x, 1, z);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
  }
}
