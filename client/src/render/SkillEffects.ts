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
  cast(skillId: string, caster: Vec3, target: Vec3 | null): void {
    let skill;
    try { skill = getSkill(skillId); } catch { return; }
    const color = skill.vfxColor ?? 0xffffff;
    const from = new THREE.Vector3(caster.x, 1.2, caster.z);

    // Destello de casteo bajo los pies del lanzador (feedback siempre presente).
    this.push(this.ring(caster, color, 0.4, 1.6, 0.35));

    if (skill.type === "heal") {
      this.push(this.sparkles(caster, color));
      return;
    }
    if (skill.type === "buff") {
      this.push(this.ring(caster, color, 0.5, 2.4, 0.55, 0.4));
      this.push(this.sparkles(caster, color));
      return;
    }
    const to = target ? new THREE.Vector3(target.x, 1.2, target.z) : from;
    if (skill.projectile && target) {
      this.push(this.projectile(from, to, color, () => this.push(this.impact(target, color))));
    } else if (skill.type === "dot" && target) {
      this.push(this.impact(target, color, 1.3));
    } else if (target) {
      this.push(this.impact(target, color));
    }
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

  /** Proyectil emissivo que viaja del caster al objetivo; al llegar llama onArrive. */
  private projectile(from: THREE.Vector3, to: THREE.Vector3, color: number, onArrive: () => void): Effect {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat);
    mesh.position.copy(from);
    this.scene.add(mesh);
    const dist = from.distanceTo(to);
    const dur = Math.max(0.12, dist / 34); let t = 0; let arrived = false;
    return {
      update: (dt) => {
        t += dt; const k = Math.min(1, t / dur);
        mesh.position.lerpVectors(from, to, k);
        if (k >= 1 && !arrived) { arrived = true; onArrive(); }
        return t < dur;
      },
      dispose: () => { this.scene.remove(mesh); mesh.geometry.dispose(); mat.dispose(); },
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
