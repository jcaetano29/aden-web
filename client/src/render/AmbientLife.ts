import * as THREE from "three";
import { TOWN, getZone } from "@aden/shared";

/**
 * Vida ambiental PURAMENTE DECORATIVA: aldeanos y guardias que deambulan por el
 * pueblo + fauna por los mapas (gallinas en el pueblo, ciervos en el bosque,
 * cuervos en ruinas/yermo). No hay red ni colisión: cada criatura elige un punto
 * cercano, camina hacia él con un balanceo de piernas/brazos, y al llegar elige
 * otro. Se ocultan cuando el jugador no está en su mapa (perf + coherencia).
 *
 * Figuras low-poly (cajas + esferas), sin cargar modelos, para no pesar.
 */

interface Critter {
  root: THREE.Group;
  mapId: string;
  homeX: number;
  homeZ: number;
  radius: number;
  speed: number;
  tx: number;
  tz: number;
  phase: number;
  idle: number;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  pecker?: THREE.Object3D; // cabeza/pico que picotea (fauna)
  peckBaseY: number;
  bob: number; // amplitud de bob vertical al caminar
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SKIN = [0xe0b48c, 0xc9925f, 0xffcfa3, 0xa9714b, 0xf1c27d];
const SHIRT = [0x8a4b3b, 0x3b5f8a, 0x4f7a4a, 0x8a7a3b, 0x6a4a7a, 0x7a3b3b, 0x3b7a7a];
const PANTS = [0x4a3a2a, 0x33404a, 0x3a3a3a, 0x5a4a2a];
const HAIR = [0x2a1a0a, 0x4a3018, 0x6a5030, 0x111111, 0x8a6a3a];

export class AmbientLife {
  private readonly critters: Critter[] = [];
  private currentMap = "pueblo";

  constructor(private readonly scene: THREE.Scene) {
    this.populateTown();
    this.populateWild();
  }

  private add(c: Critter): void {
    // AmbientLife se crea después de Environment.enableShadows() → activamos sombras aquí.
    c.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    this.scene.add(c.root);
    this.critters.push(c);
  }

  // ── Pueblo: aldeanos, guardias, gallinas ───────────────────────────────────
  private populateTown(): void {
    // Aldeanos deambulando por la ciudad.
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(6, 34);
      const x = TOWN.x + Math.cos(a) * r;
      const z = TOWN.z + Math.sin(a) * r;
      this.add(this.villager(x, z));
    }
    // Guardias cerca del portón y patrullando.
    this.add(this.guard(TOWN.x - 7, TOWN.z + 40));
    this.add(this.guard(TOWN.x + 7, TOWN.z + 40));
    this.add(this.guard(TOWN.x, TOWN.z - 20));
    // Gallinas picoteando en la plaza.
    for (let i = 0; i < 8; i++) {
      const x = TOWN.x + rand(-14, 14);
      const z = TOWN.z + rand(-14, 16);
      this.add(this.chicken(x, z));
    }
  }

  // ── Mapas salvajes: ciervos en el bosque, cuervos en ruinas/yermo ──────────
  private populateWild(): void {
    for (const zoneId of ["bosque", "ruinas", "yermo"]) {
      const z = getZone(zoneId);
      const n = zoneId === "bosque" ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const x = z.center.x + rand(-45, 45);
        const zz = z.center.z + rand(-45, 45);
        if (zoneId === "bosque") this.add(this.deer(x, zz));
        else this.add(this.crow(x, zz, zoneId));
      }
    }
  }

  // ── Constructores de figuras ───────────────────────────────────────────────

  /** Humanoide low-poly base: piernas, torso, brazos, cabeza. Devuelve refs animables. */
  private humanoid(x: number, z: number, opts: { shirt: number; pants: number; skin: number; hair: number; scale?: number }): {
    root: THREE.Group; legs: THREE.Object3D[]; arms: THREE.Object3D[];
  } {
    const s = opts.scale ?? 1;
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    root.scale.setScalar(s);
    const flat = (color: number, rough = 0.9) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: rough });
    const legMat = flat(opts.pants);
    const legs: THREE.Object3D[] = [];
    for (const lx of [-0.13, 0.13]) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.55, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.24), legMat);
      leg.position.y = -0.27;
      pivot.add(leg);
      root.add(pivot);
      legs.push(pivot);
    }
    // Torso.
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), flat(opts.shirt));
    torso.position.y = 0.9;
    root.add(torso);
    // Cinto.
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.32), flat(0x3a2a18));
    belt.position.y = 0.62; root.add(belt);
    // Brazos.
    const arms: THREE.Object3D[] = [];
    for (const ax of [-0.33, 0.33]) {
      const pivot = new THREE.Group();
      pivot.position.set(ax, 1.14, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.52, 0.17), flat(opts.shirt));
      arm.position.y = -0.26;
      pivot.add(arm);
      root.add(pivot);
      arms.push(pivot);
    }
    // Cabeza + pelo.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), flat(opts.skin, 0.7));
    head.position.y = 1.4; root.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.7), flat(opts.hair));
    hair.position.y = 1.44; root.add(hair);
    return { root, legs, arms };
  }

  private villager(x: number, z: number): Critter {
    const h = this.humanoid(x, z, { shirt: pick(SHIRT), pants: pick(PANTS), skin: pick(SKIN), hair: pick(HAIR), scale: rand(0.9, 1.08) });
    // A veces una capa/túnica sobre los hombros.
    if (Math.random() < 0.4) {
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 6, 1, true), new THREE.MeshStandardMaterial({ color: pick(SHIRT), flatShading: true, side: THREE.DoubleSide }));
      cloak.position.y = 0.95; h.root.add(cloak);
    }
    return this.critter(h.root, "pueblo", x, z, rand(10, 30), rand(1.1, 1.8), h.legs, h.arms, 0.03);
  }

  private guard(x: number, z: number): Critter {
    const h = this.humanoid(x, z, { shirt: 0x555a66, pants: 0x33363d, skin: pick(SKIN), hair: pick(HAIR), scale: 1.08 });
    // Casco.
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x9aa0ad, metalness: 0.5, roughness: 0.5, flatShading: true }));
    helmet.position.y = 1.4; h.root.add(helmet);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xb23b3b, flatShading: true }));
    crest.position.y = 1.62; h.root.add(crest);
    // Lanza en la mano derecha.
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x5a3f24 }));
    spear.position.set(0.4, 1.0, 0.1); h.root.add(spear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 0.6, roughness: 0.4 }));
    tip.position.set(0.4, 2.2, 0.1); h.root.add(tip);
    // Los guardias patrullan más lento y en un radio menor.
    return this.critter(h.root, "pueblo", x, z, rand(6, 12), rand(0.8, 1.1), h.legs, [h.arms[0]], 0.02);
  }

  private chicken(x: number, z: number): Critter {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const flat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), flat(0xf2efe6));
    body.scale.set(1, 0.9, 1.2); body.position.y = 0.22; root.add(body);
    const headPivot = new THREE.Group(); headPivot.position.set(0, 0.34, 0.12); root.add(headPivot);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), flat(0xf2efe6)); headPivot.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 5), flat(0xe0a020)); beak.rotation.x = Math.PI / 2; beak.position.z = 0.1; headPivot.add(beak);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.1), flat(0xc0392b)); comb.position.y = 0.09; headPivot.add(comb);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 5), flat(0xe8e2d0)); tail.rotation.x = -Math.PI / 3; tail.position.set(0, 0.28, -0.16); root.add(tail);
    const legs: THREE.Object3D[] = [];
    for (const lx of [-0.05, 0.05]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), flat(0xe0a020));
      leg.position.set(lx, 0.07, 0); root.add(leg); legs.push(leg);
    }
    const c = this.critter(root, "pueblo", x, z, rand(3, 7), rand(0.5, 0.9), legs, [], 0.0);
    c.pecker = headPivot; c.peckBaseY = 0.34;
    return c;
  }

  private deer(x: number, z: number): Critter {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const flat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
    const hide = flat(0x8a5a34);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.1), hide); body.position.y = 0.85; root.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), hide); neck.position.set(0, 1.15, 0.5); neck.rotation.x = -0.5; root.add(neck);
    const headPivot = new THREE.Group(); headPivot.position.set(0, 1.4, 0.7); root.add(headPivot);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.4), hide); head.position.z = 0.12; headPivot.add(head);
    // Astas.
    for (const sx of [-0.09, 0.09]) {
      const antler = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.4, 4), flat(0xdcc7a0)); antler.position.set(sx, 0.22, 0); antler.rotation.z = sx > 0 ? -0.4 : 0.4; headPivot.add(antler);
    }
    const legs: THREE.Object3D[] = [];
    for (const lx of [-0.18, 0.18]) for (const lz of [-0.4, 0.4]) {
      const pivot = new THREE.Group(); pivot.position.set(lx, 0.6, lz);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), hide); leg.position.y = -0.3; pivot.add(leg);
      root.add(pivot); legs.push(pivot);
    }
    const c = this.critter(root, "bosque", x, z, rand(14, 40), rand(1.2, 2.2), legs, [], 0.02);
    c.pecker = headPivot; c.peckBaseY = 1.4; // baja la cabeza a pastar
    return c;
  }

  private crow(x: number, z: number, mapId: string): Critter {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const flat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
    const black = flat(0x1a1a20);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), black); body.scale.set(1, 0.9, 1.4); body.position.y = 0.2; root.add(body);
    const headPivot = new THREE.Group(); headPivot.position.set(0, 0.3, 0.12); root.add(headPivot);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), black); headPivot.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), flat(0x8a6a20)); beak.rotation.x = Math.PI / 2; beak.position.z = 0.1; headPivot.add(beak);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 4), black); tail.rotation.x = -Math.PI / 2.4; tail.position.set(0, 0.22, -0.18); root.add(tail);
    const legs: THREE.Object3D[] = [];
    for (const lx of [-0.04, 0.04]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4), flat(0x2a2a2a));
      leg.position.set(lx, 0.05, 0); root.add(leg); legs.push(leg);
    }
    const c = this.critter(root, mapId, x, z, rand(6, 16), rand(0.6, 1.2), legs, [], 0.0);
    c.pecker = headPivot; c.peckBaseY = 0.3;
    return c;
  }

  private critter(root: THREE.Group, mapId: string, x: number, z: number, radius: number, speed: number, legs: THREE.Object3D[], arms: THREE.Object3D[], bob: number): Critter {
    return {
      root, mapId, homeX: x, homeZ: z, radius, speed,
      tx: x, tz: z, phase: Math.random() * Math.PI * 2, idle: rand(0, 2),
      legs, arms, peckBaseY: 0, bob,
    };
  }

  private newTarget(c: Critter): void {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * c.radius;
    c.tx = c.homeX + Math.cos(a) * r;
    c.tz = c.homeZ + Math.sin(a) * r;
  }

  /** Actualiza movimiento y animación. Llamar cada frame con el mapa actual del jugador. */
  update(dt: number, currentMapId: string): void {
    if (currentMapId !== this.currentMap) this.currentMap = currentMapId;
    for (const c of this.critters) {
      // Sólo animar/mostrar criaturas del mapa actual.
      const visible = c.mapId === this.currentMap;
      if (c.root.visible !== visible) c.root.visible = visible;
      if (!visible) continue;

      const dx = c.tx - c.root.position.x;
      const dz = c.tz - c.root.position.z;
      const dist = Math.hypot(dx, dz);
      let moving = false;
      if (c.idle > 0) {
        c.idle -= dt;
      } else if (dist > 0.4) {
        moving = true;
        const vx = (dx / dist) * c.speed;
        const vz = (dz / dist) * c.speed;
        c.root.position.x += vx * dt;
        c.root.position.z += vz * dt;
        // Encarar la dirección de movimiento (suave).
        const targetYaw = Math.atan2(vx, vz);
        let dyaw = targetYaw - c.root.rotation.y;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        c.root.rotation.y += dyaw * Math.min(1, dt * 8);
      } else {
        c.idle = rand(0.8, 3.5);
        this.newTarget(c);
      }

      if (moving) {
        c.phase += dt * c.speed * 5;
        const swing = Math.sin(c.phase) * 0.5;
        if (c.legs.length >= 2) {
          c.legs[0].rotation.x = swing;
          c.legs[1].rotation.x = -swing;
          for (let i = 2; i < c.legs.length; i++) c.legs[i].rotation.x = i % 2 === 0 ? -swing : swing;
        }
        if (c.arms.length >= 1) c.arms[0].rotation.x = -swing * 0.8;
        if (c.arms.length >= 2) c.arms[1].rotation.x = swing * 0.8;
        if (c.bob > 0) c.root.position.y = Math.abs(Math.sin(c.phase)) * c.bob;
      } else {
        // Idle: piernas neutras; fauna picotea.
        for (const l of c.legs) l.rotation.x *= 1 - Math.min(1, dt * 6);
        for (const a of c.arms) a.rotation.x *= 1 - Math.min(1, dt * 6);
        if (c.bob > 0) c.root.position.y *= 1 - Math.min(1, dt * 6);
        if (c.pecker) {
          const t = Date.now() * 0.004 + c.phase;
          const peck = Math.max(0, Math.sin(t)) * (c.mapId === "bosque" ? 0.18 : 0.1);
          c.pecker.position.y = c.peckBaseY - peck;
          c.pecker.rotation.x = peck * 2.5;
        }
      }
    }
  }
}
