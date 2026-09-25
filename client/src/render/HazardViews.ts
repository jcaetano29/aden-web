import * as THREE from "three";
import type { MobSnapshot } from "../net/NetworkClient.js";

const FULL_CIRCLE = Math.PI * 2;

/** Fixed world-space warnings. Visibility follows authoritative state, never a guessed local timer. */
export class HazardViews {
  private readonly warnings = new Map<string, { root: THREE.Group; mapId: string; active: boolean; arc: number }>();
  private mapId = "pueblo";
  constructor(private readonly scene: THREE.Scene) {}
  update(id: string, snap: MobSnapshot): void {
    const active = !snap.dead && (snap.hazardMs ?? 0) > 0 && (snap.hazardRadius ?? 0) > 0;
    let warning = this.warnings.get(id);
    if (!warning && !active) return;
    const arc = Math.min(FULL_CIRCLE, snap.hazardArc ?? FULL_CIRCLE);
    if (!warning) {
      const root = new THREE.Group(); root.name = `hazard-${id}`;
      this.scene.add(root); warning = { root, mapId: snap.mapId ?? "", active, arc: -1 }; this.warnings.set(id, warning);
    }
    if (Math.abs(warning.arc - arc) > 1e-6) { this.build(warning.root, arc); warning.arc = arc; }
    warning.active = active; warning.mapId = snap.mapId ?? "";
    warning.root.position.set(snap.hazardX ?? snap.x, .12, snap.hazardZ ?? snap.z);
    warning.root.rotation.y = arc >= FULL_CIRCLE - 1e-6 ? 0 : -(snap.hazardAngle ?? 0);
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
    this.clear(warning.root);
    warning.root.removeFromParent(); this.warnings.delete(id);
  }
  /** Sector centrado en +X (el grupo lo orienta); 2π dibuja el círculo completo. */
  private build(root: THREE.Group, arc: number): void {
    this.clear(root);
    const start = arc >= FULL_CIRCLE - 1e-6 ? 0 : -arc / 2;
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64, start, arc), new THREE.MeshBasicMaterial({ color: 0xeb301e, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
    const edge = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64, 1, start, arc), new THREE.MeshBasicMaterial({ color: 0xff5c38, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
    for (const mesh of [fill, edge]) { mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 3; root.add(mesh); }
  }
  private clear(root: THREE.Group): void {
    for (const child of [...root.children]) {
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); }
      child.removeFromParent();
    }
  }
}
