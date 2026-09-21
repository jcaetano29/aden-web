import * as THREE from "three";

export interface StatusSnapshot {
  dead?: boolean;
  stunMs?: number;
  rootMs?: number;
  poisonMs?: number;
  atkBuffMs?: number;
  defBuffMs?: number;
}
type Status = "stunMs" | "rootMs" | "poisonMs" | "atkBuffMs" | "defBuffMs";
const COLORS: Record<Status, number> = {
  stunMs: 0xffdb54, rootMs: 0x77dfff, poisonMs: 0x95dc49,
  atkBuffMs: 0xff694d, defBuffMs: 0x73baff,
};
interface ActiveStatus {
  group: THREE.Group;
  kind: Status;
  locate: () => THREE.Vector3 | null;
}

/** Persistent indicators follow authoritative snapshots, including cleanses and late joins. */
export class StatusEffects {
  private readonly entities = new Map<string, Map<Status, ActiveStatus>>();
  private time = 0;
  constructor(private readonly scene: THREE.Scene) {}

  sync(id: string, state: StatusSnapshot, locate: () => THREE.Vector3 | null): void {
    if (state.dead) { this.remove(id); return; }
    const active = this.entities.get(id) ?? new Map<Status, ActiveStatus>();
    for (const kind of Object.keys(COLORS) as Status[]) {
      const old = active.get(kind);
      if ((state[kind] ?? 0) <= 0) {
        if (old) { this.dispose(old); active.delete(kind); }
      } else if (old) old.locate = locate;
      else active.set(kind, { group: this.create(kind), kind, locate });
    }
    if (active.size) this.entities.set(id, active);
    else this.entities.delete(id);
  }

  update(dt: number): void {
    this.time += dt;
    for (const active of this.entities.values()) for (const effect of active.values()) {
      const pos = effect.locate();
      effect.group.visible = pos !== null;
      if (!pos) continue;
      effect.group.position.set(pos.x, effect.kind === "stunMs" ? pos.y + .45 : .08, pos.z);
      effect.group.rotation.y = this.time * (effect.kind === "rootMs" ? .25 : 2);
      const pulse = 1 + Math.sin(this.time * 5) * .08;
      effect.group.scale.setScalar(pulse);
    }
  }

  remove(id: string): void {
    this.entities.get(id)?.forEach(effect => this.dispose(effect));
    this.entities.delete(id);
  }

  private create(kind: Status): THREE.Group {
    const group = new THREE.Group();
    group.name = kind;
    group.visible = false;
    const material = new THREE.MeshBasicMaterial({ color: COLORS[kind], transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(kind === "stunMs" ? .65 : .85, .035, 6, 32), material);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      let geometry: THREE.BufferGeometry;
      if (kind === "stunMs") {
        const star = new THREE.Shape();
        for (let j = 0; j < 10; j++) {
          const a = j * Math.PI / 5, r = j % 2 ? .09 : .22;
          if (j === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        star.closePath(); geometry = new THREE.ShapeGeometry(star);
      } else if (kind === "rootMs") geometry = new THREE.ConeGeometry(.2, 1.2, 4);
      else if (kind === "defBuffMs") geometry = new THREE.SphereGeometry(.9, 12, 8, angle, .35, .4, 1.8);
      else geometry = new THREE.OctahedronGeometry(.13);
      const mesh = new THREE.Mesh(geometry, material);
      const r = kind === "stunMs" ? .65 : .8;
      mesh.position.set(Math.cos(angle) * r, kind === "stunMs" ? 0 : .6, Math.sin(angle) * r);
      if (kind === "stunMs") mesh.rotation.x = -.5;
      group.add(mesh);
    }
    this.scene.add(group);
    return group;
  }

  private dispose(effect: ActiveStatus): void {
    this.scene.remove(effect.group);
    const materials = new Set<THREE.Material>();
    effect.group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach(m => materials.add(m));
      }
    });
    materials.forEach(m => m.dispose());
  }
}
