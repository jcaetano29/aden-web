import * as THREE from "three";

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly raycaster = new THREE.Raycaster();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly ground: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

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

  /** Devuelve el punto del suelo bajo el click en NDC, o null. */
  pickGround(ndcX: number, ndcY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.intersectObject(this.ground)[0];
    return hit ? hit.point : null;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
