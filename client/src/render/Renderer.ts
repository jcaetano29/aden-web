import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

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

    this.scene.background = new THREE.Color(0x1a1a2a);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x33443a }),
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

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Cámara en tercera persona que sigue al self con offset fijo (isométrica-ish). */
  followTarget(x: number, z: number): void {
    const offset = new THREE.Vector3(0, 22, 22);
    this.camera.position.set(x + offset.x, offset.y, z + offset.z);
    this.camera.lookAt(x, 1, z);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
  }
}
