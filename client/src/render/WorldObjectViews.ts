import * as THREE from "three";

export interface WorldObjectSnapshot {
  id: string;
  kind: string; // "chest" | "breakable" | "shrine"
  mapId: string;
  x: number;
  z: number;
  active: boolean;
}

interface OView {
  root: THREE.Object3D;
  kind: string;
  mapId: string;
  /** partes que reaccionan al estado (tapa del cofre, orbe del santuario, cuerpo del barril). */
  lid?: THREE.Object3D;
  glow?: THREE.Mesh;
  light?: THREE.PointLight;
  active: boolean;
  pulse: number;
}

/**
 * Objetos de mundo interactivos (Etapa 16): cofres, barriles rompibles y santuarios.
 * Renderiza sólo los del mapa actual (como los mobs) y refleja su estado (cofre
 * abierto/cerrado, barril intacto/roto, santuario listo/en cooldown). Expone objetivos
 * de raycast para clickearlos. Sólo presentación; el server es autoritativo.
 */
export class WorldObjectViews {
  private readonly views = new Map<string, OView>();
  private readonly rootToId = new Map<THREE.Object3D, string>();
  private currentMapId = "pueblo";

  constructor(private readonly scene: THREE.Scene) {}

  add(id: string, snap: WorldObjectSnapshot): void {
    if (this.views.has(id)) return;
    const v = this.build(snap);
    v.root.position.set(snap.x, 0, snap.z);
    v.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    v.root.visible = snap.mapId === this.currentMapId;
    this.scene.add(v.root);
    this.views.set(id, v);
    this.rootToId.set(v.root, id);
    this.applyState(v, snap.active);
  }

  update(id: string, snap: WorldObjectSnapshot): void {
    const v = this.views.get(id);
    if (!v) return;
    v.root.visible = snap.mapId === this.currentMapId;
    if (snap.active !== v.active) this.applyState(v, snap.active);
  }

  remove(id: string): void {
    const v = this.views.get(id);
    if (!v) return;
    this.scene.remove(v.root);
    this.rootToId.delete(v.root);
    this.views.delete(id);
  }

  setCurrentMap(mapId: string): void {
    if (mapId === this.currentMapId) return;
    this.currentMapId = mapId;
    this.views.forEach((v) => { v.root.visible = v.mapId === mapId; });
  }

  /** Animación sutil (orbe del santuario que flota/pulsa). Llamar cada frame. */
  update3d(dt: number): void {
    this.views.forEach((v) => {
      if (v.kind === "shrine" && v.glow && v.active) {
        v.pulse += dt * 2;
        v.glow.position.y = 1.7 + Math.sin(v.pulse) * 0.12;
        v.glow.scale.setScalar(1 + Math.sin(v.pulse) * 0.08);
      }
    });
  }

  /** Objetivos de raycast: sólo objetos ACTIVOS del mapa actual (los usados no se clickean). */
  raycastTargets(): { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null } {
    const objects: THREE.Object3D[] = [];
    this.views.forEach((v, id) => {
      if (v.active && v.mapId === this.currentMapId) objects.push(v.root);
      void id;
    });
    const idOf = (o: THREE.Object3D): string | null => {
      let cur: THREE.Object3D | null = o;
      while (cur) {
        const id = this.rootToId.get(cur);
        if (id) {
          const v = this.views.get(id);
          return v && v.active && v.mapId === this.currentMapId ? id : null;
        }
        cur = cur.parent;
      }
      return null;
    };
    return { objects, idOf };
  }

  // ── Construcción de meshes por tipo ────────────────────────────────────────
  private build(snap: WorldObjectSnapshot): OView {
    switch (snap.kind) {
      case "chest": return this.buildChest(snap.mapId);
      case "shrine": return this.buildShrine(snap.mapId);
      default: return this.buildBarrel(snap.mapId);
    }
  }

  private buildChest(mapId: string): OView {
    const root = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a1e, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, emissive: 0x5a3d00, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), wood);
    base.position.y = 0.45;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.35, 1.05), gold);
    lid.position.set(0, 1.0, 0);
    root.add(base, lid);
    const light = new THREE.PointLight(0xffd54f, 0.5, 6, 2);
    light.position.set(0, 1.2, 0);
    root.add(light);
    return { root, kind: "chest", mapId, lid, light, active: true, pulse: 0 };
  }

  private buildBarrel(mapId: string): OView {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.1, 10), mat);
    body.position.y = 0.55;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 6, 12), new THREE.MeshStandardMaterial({ color: 0x3a2a18 }));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = 0.55;
    root.add(body, hoop);
    return { root, kind: "breakable", mapId, lid: body, active: true, pulse: 0 };
  }

  private buildShrine(mapId: string): OView {
    const root = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x8a8497, flatShading: true });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 8), stone);
    pillar.position.y = 0.7;
    const glow = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x2aa0d0, emissiveIntensity: 1.1 }),
    );
    glow.position.y = 1.7;
    const light = new THREE.PointLight(0x66e0ff, 0.8, 8, 2);
    light.position.set(0, 1.7, 0);
    root.add(pillar, glow, light);
    return { root, kind: "shrine", mapId, glow, light, active: true, pulse: 0 };
  }

  /** Refleja el estado activo/usado en el mesh. */
  private applyState(v: OView, active: boolean): void {
    v.active = active;
    if (v.kind === "chest" && v.lid) {
      v.lid.rotation.x = active ? 0 : -1.1; // tapa abierta
      if (v.light) v.light.intensity = active ? 0.5 : 0;
    } else if (v.kind === "breakable") {
      v.root.visible = v.root.visible && active; // roto → oculto (hasta reaparecer)
      if (v.mapId === this.currentMapId) v.root.visible = active;
    } else if (v.kind === "shrine") {
      if (v.glow) (v.glow.material as THREE.MeshStandardMaterial).emissiveIntensity = active ? 1.1 : 0.15;
      if (v.light) v.light.intensity = active ? 0.8 : 0.1;
    }
  }
}
