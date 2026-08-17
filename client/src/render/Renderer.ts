import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { smoothTowards } from "./motion.js";

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly raycaster = new THREE.Raycaster();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly ground: THREE.Mesh;
  private readonly css2dRenderer: CSS2DRenderer;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3a }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

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
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Cámara en tercera persona que sigue al self con offset fijo, suavizada:
   * en vez de teletransportarse cada frame, converge hacia (target+offset) con
   * `smoothTowards` (independiente del framerate) → seguimiento fluido.
   */
  followTarget(x: number, z: number, dt: number): void {
    const K = 6; // rapidez de convergencia
    this.camera.position.x = smoothTowards(this.camera.position.x, x, K, dt);
    this.camera.position.y = smoothTowards(this.camera.position.y, 22, K, dt);
    this.camera.position.z = smoothTowards(this.camera.position.z, z + 22, K, dt);
    this.camera.lookAt(x, 1, z);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
  }
}
