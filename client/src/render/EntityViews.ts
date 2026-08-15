import * as THREE from "three";

/** Mantiene sincronizados los cubos 3D con el mapa de jugadores del estado. */
export class EntityViews {
  private readonly views = new Map<string, THREE.Mesh>();

  constructor(private readonly scene: THREE.Scene) {}

  add(id: string, isSelf: boolean) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: isSelf ? 0x4fa3ff : 0xff7043 }),
    );
    mesh.position.y = 1;
    this.scene.add(mesh);
    this.views.set(id, mesh);
  }

  update(id: string, x: number, z: number) {
    const mesh = this.views.get(id);
    if (!mesh) return;
    // interpolación suave hacia la posición del servidor
    mesh.position.x += (x - mesh.position.x) * 0.2;
    mesh.position.z += (z - mesh.position.z) * 0.2;
  }

  remove(id: string) {
    const mesh = this.views.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.views.delete(id);
    }
  }
}
