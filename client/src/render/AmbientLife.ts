import * as THREE from "three";
import { TOWN, getZone, nearestWalkable, findPath, clipMovement, type Point2 } from "@aden/shared";
import type { CharacterFactory, Character } from "./CharacterFactory.js";
import { selectClip } from "./animation.js";

/**
 * Vida ambiental PURAMENTE DECORATIVA: aldeanos y guardias que deambulan por el
 * pueblo + fauna por los mapas (gallinas en el pueblo, ciervos en el bosque,
 * cuervos en ruinas/yermo). Sin red; cada criatura consulta las colisiones compartidas y elige un punto
 * cercano, camina hacia él con un balanceo de piernas/brazos, y al llegar elige
 * otro. Se ocultan cuando el jugador no está en su mapa (perf + coherencia).
 *
 * Aldeanos y guardias articulados reutilizan los modelos locales; fauna procedural.
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
  path: Point2[];
  character?: Character;
  bob: number; // amplitud de bob vertical al caminar
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SHIRT = [0x8a4b3b, 0x3b5f8a, 0x4f7a4a, 0x8a7a3b, 0x6a4a7a, 0x7a3b3b, 0x3b7a7a];

export class AmbientLife {
  private readonly critters: Critter[] = [];
  private currentMap = "pueblo";

  constructor(private readonly scene: THREE.Scene, private readonly factory: Pick<CharacterFactory, "create">) {
    this.populateTown();
    this.populateWild();
  }

  private add(c: Critter): void {
    // AmbientLife se crea después de Environment.enableShadows() → activamos sombras aquí.
    c.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    this.scene.add(c.root);
    const safe = nearestWalkable(c.mapId, c.root.position);
    c.root.position.x = c.homeX = c.tx = safe.x;
    c.root.position.z = c.homeZ = c.tz = safe.z;
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

  /** Townsfolk share articulated rigs with heroes, with isolated materials. */
  private townsperson(x: number, z: number, guard: boolean): Critter {
    const character = this.factory.create(guard ? "Knight" : "Rogue");
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    character.root.scale.setScalar(guard ? 0.94 : rand(0.82, 0.92));
    root.add(character.root);
    const tint = new THREE.Color(guard ? 0x9aadc1 : pick(SHIRT));
    character.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const finish = (source: THREE.Material) => {
        const mat = source.clone();
        if (mat instanceof THREE.MeshStandardMaterial && !object.name.startsWith("hero_")) {
          mat.color.lerp(tint, guard ? 0.12 : 0.28);
        }
        return mat;
      };
      object.material = Array.isArray(object.material) ? object.material.map(finish) : finish(object.material);
    });
    if (!guard) {
      const dagger = character.root.getObjectByName("Rogue_Dagger");
      if (dagger) dagger.visible = false;
    }
    const idle = selectClip(character.clipNames, "idle");
    if (idle) character.play(idle, true);
    const c = this.critter(root, "pueblo", x, z, guard ? rand(6,12) : rand(10,30), guard ? rand(.8,1.1) : rand(1.1,1.8), [], [], 0);
    c.character = character;
    return c;
  }

  private villager(x: number, z: number): Critter { return this.townsperson(x, z, false); }
  private guard(x: number, z: number): Critter { return this.townsperson(x, z, true); }

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
      legs, arms, peckBaseY: 0, bob, path: [],
    };
  }

  private newTarget(c: Critter): void {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * c.radius;
    const target = nearestWalkable(c.mapId, { x: c.homeX + Math.cos(a) * r, z: c.homeZ + Math.sin(a) * r });
    c.path = findPath(c.mapId, c.root.position, target);
    const first = c.path.shift() ?? { x: c.root.position.x, z: c.root.position.z };
    c.tx = first.x; c.tz = first.z;
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
      } else if (dist > 0.01) {
        moving = true;
        const vx = (dx / dist) * c.speed;
        const vz = (dz / dist) * c.speed;
        const travel = Math.min(dist, c.speed * dt);
        const next = clipMovement(c.mapId, c.root.position, { x: c.root.position.x + dx / dist * travel, z: c.root.position.z + dz / dist * travel });
        if (Math.hypot(next.x - c.root.position.x, next.z - c.root.position.z) < 0.0001) {
          c.path = []; c.tx = next.x; c.tz = next.z; moving = false;
        }
        c.root.position.x = next.x; c.root.position.z = next.z;
        // Encarar la dirección de movimiento (suave).
        const targetYaw = Math.atan2(vx, vz);
        let dyaw = targetYaw - c.root.rotation.y;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        c.root.rotation.y += dyaw * Math.min(1, dt * 8);
      } else {
        const next = c.path.shift();
        if (next) { c.tx = next.x; c.tz = next.z; }
        else { c.idle = rand(0.8, 3.5); this.newTarget(c); }
      }

      if (c.character) {
        const clip = selectClip(c.character.clipNames, moving ? "walk" : "idle");
        if (clip) c.character.play(clip);
        c.character.mixer.update(dt);
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
