import * as THREE from "three";
import type { MobSnapshot } from "../net/NetworkClient.js";

/** Fixed world-space warnings. Visibility follows authoritative state, never a guessed local timer. */
export class HazardViews {
  private readonly warnings = new Map<string, { root: THREE.Group; mapId: string; active: boolean }>();
  private mapId = "pueblo";
  constructor(private readonly scene: THREE.Scene) {}
  update(id: string, snap: MobSnapshot): void {
    const active = !snap.dead && (snap.hazardMs ?? 0) > 0 && (snap.hazardRadius ?? 0) > 0;
    let warning = this.warnings.get(id);
    if (!warning && !active) return;
    if (!warning) {
      const root = new THREE.Group(); root.name = `hazard-${id}`;
      const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xeb301e, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
      const edge = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff5c38, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
      for (const mesh of [fill, edge]) { mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 3; root.add(mesh); }
      this.scene.add(root); warning = { root, mapId: snap.mapId ?? "", active }; this.warnings.set(id, warning);
    }
    warning.active = active; warning.mapId = snap.mapId ?? "";
    warning.root.position.set(snap.hazardX ?? snap.x, .12, snap.hazardZ ?? snap.z);
    const radius = snap.hazardRadius ?? 0;
    warning.root.scale.set(radius, 1, radius);
    warning.root.visible = active && warning.mapId === this.mapId;
  }
  setCurrentMap(mapId: string): void {
    this.mapId = mapId;
    this.warnings.forEach(w => { w.root.visible = w.active && w.mapId === mapId; });
  }
  remove(id: string): void {
    const warning = this.warnings.get(id); if (!warning) return;
    warning.root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    warning.root.removeFromParent(); this.warnings.delete(id);
  }
}
