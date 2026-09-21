import * as THREE from "three";
import { getSkill } from "@aden/shared";

interface Vec3 { x: number; y?: number; z: number; }

interface Effect {
  /** avanza el efecto; devuelve false cuando terminó (se limpia). */
  update(dt: number): boolean;
  dispose(): void;
}

/**
 * Efectos visuales de skills (Etapa 17): proyectiles, impactos, chispas de curación,
 * auras de buff y nubes de veneno — procedurales (sin assets). Se disparan por el
 * evento `SkillCast` del server, así se ven en TODOS los clientes. Puramente presentación.
 */
export class SkillEffects {
  private readonly effects: Effect[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  /**
   * Reproduce el VFX de una skill. `caster` = posición del que lanza; `target` =
   * posición del objetivo (o null para heal/buff sobre uno mismo).
   */
  cast(skillId: string, caster: Vec3, target: Vec3 | null, destination?: Vec3): void {
    let skill;
    try { skill = getSkill(skillId); } catch { return; }
    const color = skill.vfxColor ?? 0xffffff;
    const from = new THREE.Vector3(caster.x, 1.2, caster.z);

    // Destello de casteo bajo los pies del lanzador (feedback siempre presente).
    this.push(this.ring(caster, color, 0.4, 1.6, 0.35));

    if (skill.dash && destination) {
      this.push(this.streak(caster, destination, color));
      this.push(this.ring(destination, color, .2, 1.8, .6));
      this.push(this.sparkles(destination, color));
    }
    if (skill.type === "dash") {
      this.push(this.sparkles(caster, color));
      return;
    }

    if (skill.type === "heal") {
      this.push(this.sparkles(destination ?? caster, color));
      return;
    }
    if (skill.type === "buff") {
      this.push(this.ring(destination ?? caster, color, 0.5, 2.4, 0.55, 0.4));
      this.push(this.sparkles(destination ?? caster, color));
      return;
    }
    const to = target ? new THREE.Vector3(target.x, 1.2, target.z) : from;
    if (!target) return;
    if (skillId === "meteor" || skillId === "tome_meteorite") {
      this.push(this.ring(target, color, .4, 1.5, .5));
      this.push(this.projectile(new THREE.Vector3(to.x, 9, to.z), to, color, () => this.hitBurst(target, color), "meteor"));
    } else if (skillId === "tome_lightning") {
      this.push(this.lightning(target, color));
      this.hitBurst(target, color);
    } else if (skillId === "frost_nova" || skillId === "tome_twister" || skillId === "tome_hellfire" || skillId === "tome_flame") {
      this.push(this.elementColumn(target, color, skillId));
      this.hitBurst(target, color);
    } else if (skillId === "tome_power_wave") {
      this.push(this.streak(caster, target, color));
      this.push(this.ring(target, color, .2, 1.8, .5));
    } else if (skill.projectile) {
      const shape = ["aimed_shot", "snaring_shot", "piercing_shot", "item_volley"].includes(skillId) ? "arrow"
        : ["ice_lance", "tome_ice"].includes(skillId) ? "ice"
        : skillId === "tome_evil_spirit" ? "spirit" : "orb";
      this.push(this.projectile(from, to, color, () => this.hitBurst(target, color), shape));
    } else if (skill.type === "dot" && target) {
      this.push(this.impact(target, color, 1.3));
      this.push(this.burst(target, color, 8));
    } else if (target) {
      this.push(this.slash(destination ?? caster, target, color, skillId));
      this.hitBurst(target, color);
    }
  }

  /** Impacto completo de un golpe: destello + onda de choque + chispas hacia afuera. */
  private hitBurst(pos: Vec3, color: number): void {
    this.push(this.impact(pos, color));
    this.push(this.ring(pos, color, 0.3, 2.0, 0.35, 0.7)); // onda de choque
    this.push(this.burst(pos, color, 12));
  }

  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i].update(dt)) {
        this.effects[i].dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  private push(e: Effect): void { this.effects.push(e); }

  // ── Factories ──────────────────────────────────────────────────────────────

  /** Esfera additiva que se expande y se desvanece en el objetivo (impacto). */
  private impact(pos: Vec3, color: number, scaleMax = 1.8): Effect {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), mat);
    mesh.position.set(pos.x, pos.y ?? 1.2, pos.z);
    this.scene.add(mesh);
    const dur = 0.32; let t = 0;
    return {
      update: (dt) => {
        t += dt; const k = Math.min(1, t / dur);
        mesh.scale.setScalar(0.6 + k * scaleMax);
        mat.opacity = 0.95 * (1 - k);
        return t < dur;
      },
      dispose: () => { this.scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); },
    };
  }

  /** Proyectil emissivo (núcleo + halo) que viaja del caster al objetivo; al llegar llama onArrive. */
  private projectile(from: THREE.Vector3, to: THREE.Vector3, color: number, onArrive: () => void, shape = "orb"): Effect {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const geometry = shape === "arrow" ? new THREE.ConeGeometry(.12, 1.2, 5)
      : shape === "ice" ? new THREE.OctahedronGeometry(.4)
      : new THREE.SphereGeometry(shape === "meteor" ? .65 : .28, 12, 12);
    const mesh = new THREE.Mesh(geometry, mat);
    if (shape === "arrow") mesh.rotation.x = Math.PI / 2;
    if (shape === "ice") mesh.scale.z = 2.4;
    // Halo tenue alrededor del núcleo → se siente "energético" con el bloom.
    const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), haloMat);
    group.add(mesh, halo);
    group.position.copy(from);
    group.lookAt(to);
    // A tapered luminous tail keeps the projectile legible at the game camera distance.
    const tail = new THREE.Mesh(new THREE.ConeGeometry(shape === "meteor" ? .5 : .16, 1.8, 8), haloMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -1;
    group.add(tail);
    this.scene.add(group);
    const dist = from.distanceTo(to);
    const dur = Math.max(0.12, dist / 34); let t = 0; let arrived = false;
    let pulse = 0;
    return {
      update: (dt) => {
        t += dt; const k = Math.min(1, t / dur);
        group.position.lerpVectors(from, to, k);
        pulse += dt * 12;
        halo.scale.setScalar(1 + Math.sin(pulse) * 0.15);
        if (shape === "spirit") mesh.position.x = Math.sin(pulse) * .3;
        if (k >= 1 && !arrived) { arrived = true; onArrive(); }
        return t < dur;
      },
      dispose: () => { this.scene.remove(group); mesh.geometry.dispose(); mat.dispose(); halo.geometry.dispose(); tail.geometry.dispose(); haloMat.dispose(); },
    };
  }

  private animateMesh(mesh: THREE.Mesh, duration: number, animate: (k: number) => void): Effect {
    this.scene.add(mesh);
    let age = 0;
    return {
      update: dt => { age += dt; const k = Math.min(1, age / duration); animate(k); return k < 1; },
      dispose: () => { this.scene.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); },
    };
  }

  private material(color: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  private slash(caster: Vec3, target: Vec3, color: number, id: string): Effect {
    const stab = ["backstab", "assassinate", "shadowstep"].includes(id);
    const shield = id === "shield_bash" || id === "shield_charge";
    const mat = this.material(color);
    const mesh = new THREE.Mesh(shield ? new THREE.RingGeometry(.4, .8, 6)
      : stab ? new THREE.ConeGeometry(.18, 1.8, 4)
      : new THREE.RingGeometry(1, 1.35, 32, 1, 0, Math.PI * 1.3), mat);
    mesh.position.set(caster.x, 1.2, caster.z);
    mesh.rotation.set(Math.PI / 2, 0, Math.atan2(target.z - caster.z, target.x - caster.x));
    return this.animateMesh(mesh, .35, k => {
      mesh.position.x = caster.x + (target.x - caster.x) * k;
      mesh.position.z = caster.z + (target.z - caster.z) * k;
      if (!stab) mesh.rotation.z += .12;
      mesh.scale.setScalar(.6 + k * .8); mat.opacity = 1 - k;
    });
  }

  private streak(from: Vec3, to: Vec3, color: number): Effect {
    const a = new THREE.Vector3(from.x, .8, from.z), b = new THREE.Vector3(to.x, .8, to.z);
    const mat = this.material(color);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.08, .3, Math.max(.1, a.distanceTo(b)), 8), mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    const direction = b.clone().sub(a);
    if (direction.lengthSq() > 0) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return this.animateMesh(mesh, .45, k => { mat.opacity = (1 - k) * .8; mesh.scale.x = mesh.scale.z = 1 + k; });
  }

  private lightning(pos: Vec3, color: number): Effect {
    const points = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(i === 8 ? 0 : Math.sin(i * 8) * .45, 7 - i * .75, 0));
    const mat = this.material(color);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .09, 5, false), mat);
    mesh.position.set(pos.x, 0, pos.z);
    return this.animateMesh(mesh, .4, k => { mat.opacity = (1 - k) * (.55 + .45 * Math.abs(Math.sin(k * 40))); });
  }

  private elementColumn(pos: Vec3, color: number, id: string): Effect {
    const mat = this.material(color);
    const ice = id === "frost_nova", wind = id === "tome_twister";
    const points = Array.from({ length: 65 }, (_, i) => {
      const t = i / 64, angle = t * Math.PI * 8, r = .3 + t * .85;
      return new THREE.Vector3(Math.cos(angle) * r, t * 2.8, Math.sin(angle) * r);
    });
    const geometry = wind ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, .09, 5, false)
      : new THREE.ConeGeometry(ice ? 1.1 : .7, ice ? 2 : 3.4, ice ? 6 : 12, 1, true);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(pos.x, wind ? 0 : 1, pos.z);
    return this.animateMesh(mesh, .7, k => {
      mesh.rotation.y = k * Math.PI * 2;
      mesh.scale.setScalar(Math.sin(k * Math.PI) * .8 + .2);
      mat.opacity = (1 - k) * .85;
    });
  }

  /** Chispas que salen disparadas hacia afuera con gravedad (impacto de golpe). */
  private burst(pos: Vec3, color: number, n: number): Effect {
    const positions = new Float32Array(n * 3);
    const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
    const cy = pos.y ?? 1.2;
    for (let i = 0; i < n; i++) {
      positions[i * 3] = pos.x; positions[i * 3 + 1] = cy; positions[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2; const sp = 2.5 + Math.random() * 3;
      vx[i] = Math.cos(a) * sp; vy[i] = 1.5 + Math.random() * 3; vz[i] = Math.sin(a) * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.22, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    const dur = 0.45; let t = 0;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    return {
      update: (dt) => {
        t += dt;
        for (let i = 0; i < n; i++) {
          vy[i] -= 9 * dt; // gravedad
          attr.setX(i, attr.getX(i) + vx[i] * dt);
          attr.setY(i, Math.max(0.05, attr.getY(i) + vy[i] * dt));
          attr.setZ(i, attr.getZ(i) + vz[i] * dt);
        }
        attr.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - t / dur);
        return t < dur;
      },
      dispose: () => { this.scene.remove(pts); geo.dispose(); mat.dispose(); },
    };
  }

  /** Anillo plano que se expande y se desvanece (casteo / aura de buff). */
  private ring(pos: Vec3, color: number, r0: number, r1: number, dur: number, opacity0 = 0.8): Effect {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 28), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.06, pos.z);
    this.scene.add(mesh);
    let t = 0;
    return {
      update: (dt) => {
        t += dt; const k = Math.min(1, t / dur);
        mesh.scale.setScalar(r0 + (r1 - r0) * k);
        mat.opacity = opacity0 * (1 - k);
        return t < dur;
      },
      dispose: () => { this.scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); },
    };
  }

  /** Chispas que ascienden (curación / buff). */
  private sparkles(pos: Vec3, color: number): Effect {
    const N = 14;
    const positions = new Float32Array(N * 3);
    const vel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2; const r = Math.random() * 0.8;
      positions[i * 3] = pos.x + Math.cos(a) * r;
      positions[i * 3 + 1] = 0.3 + Math.random() * 0.5;
      positions[i * 3 + 2] = pos.z + Math.sin(a) * r;
      vel[i] = 1.5 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.28, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    const dur = 0.7; let t = 0;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    return {
      update: (dt) => {
        t += dt;
        for (let i = 0; i < N; i++) attr.setY(i, attr.getY(i) + vel[i] * dt);
        attr.needsUpdate = true;
        mat.opacity = 1 - t / dur;
        return t < dur;
      },
      dispose: () => { this.scene.remove(pts); geo.dispose(); mat.dispose(); },
    };
  }
}
