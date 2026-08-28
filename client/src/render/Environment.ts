import * as THREE from "three";
import { ZONES, getZone, zoneAt, TOWN, SAFE_RADIUS, type Zone } from "@aden/shared";

/** RNG determinístico (mulberry32) con seed fija → todos los clientes ven el mismo mundo. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY_TOP = 0x4a90d9;

/** Intensidad del sol por zona (más oscuro cuanto más profundo/peligroso). */
const SUN_INTENSITY: Record<string, number> = {
  pueblo: 1.0,
  bosque: 0.8,
  ruinas: 0.55,
  yermo: 0.7,
  trono: 0.38,
};

/**
 * Entorno procedural del Mundo de Aden (Etapa 11). En lugar de un único bioma,
 * pinta CADA zona (ver shared/world.ts) con su propia identidad: suelo de color,
 * props temáticos (bosque denso → columnas rotas → árboles muertos y brasas →
 * pilares de hueso y trono), caminos que las conectan, y una niebla + luz que
 * cambian suavemente al viajar de una zona a otra (updateMood). Puramente visual.
 */
export class Environment {
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly fog: THREE.Fog;
  private readonly bgColor: THREE.Color;
  private embers: THREE.Points | null = null;
  // Objetivos de mood (se interpolan suavemente frame a frame).
  private curFogNear: number;
  private curFogFar: number;
  private curSun: number;

  constructor(private readonly scene: THREE.Scene) {
    const pueblo = getZone("pueblo").biome;
    this.addSky();
    this.hemi = new THREE.HemisphereLight(0x9fc4e8, 0x4a5a3a, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d9, SUN_INTENSITY.pueblo);
    this.sun.position.set(30, 60, 20);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    this.fog = new THREE.Fog(pueblo.fog, pueblo.fogNear, pueblo.fogFar);
    this.scene.fog = this.fog;
    this.bgColor = new THREE.Color(pueblo.fog);
    this.scene.background = this.bgColor;
    this.curFogNear = pueblo.fogNear;
    this.curFogFar = pueblo.fogFar;
    this.curSun = SUN_INTENSITY.pueblo;

    this.paintBiomes();
    this.structures();
    this.populate();
  }

  private addSky() {
    const geo = new THREE.SphereGeometry(400, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(SKY_TOP) },
        bottom: { value: new THREE.Color(0xbcd9f0) },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform float exponent;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld + vec3(0.0, 30.0, 0.0)).y;
          float t = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  /** Suelo coloreado por cada MAPA (Etapa 15): una placa rectangular sobre su región. */
  private paintBiomes() {
    for (const z of ZONES) {
      const w = z.bounds.maxX - z.bounds.minX;
      const d = z.bounds.maxZ - z.bounds.minZ;
      const geo = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({ color: z.biome.ground, flatShading: true });
      const plate = new THREE.Mesh(geo, mat);
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(z.center.x, 0.02, z.center.z);
      this.scene.add(plate);
    }
  }

  // ── Estructuras (Etapa 17): landmarks arquitectónicos colocados a mano por mapa ──
  private structures(): void {
    // Pueblo (0,0): casas alrededor de la plaza + pozo.
    this.house(-24, -6, 0.3, 0xb98a5a);
    this.house(24, -8, -0.5, 0xa87d4e);
    this.house(-20, 18, 2.6, 0xc39866);
    this.house(20, 20, 3.6, 0xb98a5a);
    this.house(0, -28, 0, 0xa87d4e);
    this.well(10, -2);

    // Bosque (300,0): torre de vigía en ruinas + arco de entrada.
    this.tower(340, -30, 9, 0x8a8497);
    this.arch(300, 55, 0, 0x6b6577, 1.2);
    this.tower(262, 30, 6, 0x7a7d80);

    // Ruinas (0,300): gran templo caído — plataforma + columnatas + arco.
    this.templeHall(0, 300);
    this.arch(0, 355, 0, 0x9b7fd4, 1.6);

    // Yermo (300,300): campo de obeliscos de obsidiana + torre quemada.
    this.obeliskField(300, 300);
    this.tower(340, 320, 8, 0x3b322c, true);

    // Trono (600,150): gran pórtico de entrada + escalinata al trono.
    this.arch(600, 200, 0, 0x1e1b26, 2.0);
    this.stairs(600, 130);
  }

  private house(cx: number, cz: number, rot: number, color: number): void {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a3b2b, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4.5), wall);
    body.position.y = 1.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.4, 4), roofMat);
    roof.position.y = 4.2; roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a3018 }));
    door.position.set(0, 0.9, 2.3);
    g.add(body, roof, door);
    g.position.set(cx, 0, cz); g.rotation.y = rot;
    this.scene.add(g);
  }

  private well(cx: number, cz: number): void {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x9a938a, flatShading: true });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.1, 12), stone);
    ring.position.y = 0.55;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
    post1.position.set(-0.9, 1.7, 0);
    const post2 = post1.clone(); post2.position.x = 0.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x7a3b2b, flatShading: true }));
    roof.position.y = 3.2; roof.rotation.y = Math.PI / 4;
    g.add(ring, post1, post2, roof);
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  private tower(cx: number, cz: number, h: number, color: number, broken = false): void {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, h, 10), stone);
    shaft.position.y = h / 2;
    g.add(shaft);
    if (!broken) {
      // almenas
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), stone);
        m.position.set(Math.cos(a) * 2, h + 0.3, Math.sin(a) * 2);
        g.add(m);
      }
    } else {
      // corona rota (bloques desparejos)
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8 + Math.random(), 1.2), stone);
        m.position.set((Math.random() - 0.5) * 3, h + Math.random(), (Math.random() - 0.5) * 3);
        m.rotation.y = Math.random();
        g.add(m);
      }
    }
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  private arch(cx: number, cz: number, rot: number, color: number, scale = 1): void {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1, 7, 1), stone); p1.position.set(-3, 3.5, 0);
    const p2 = p1.clone(); p2.position.x = 3;
    const top = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1.2), stone); top.position.y = 7.2;
    g.add(p1, p2, top);
    g.position.set(cx, 0, cz); g.rotation.y = rot; g.scale.setScalar(scale);
    this.scene.add(g);
  }

  private templeHall(cx: number, cz: number): void {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x8a8497, flatShading: true });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 20), stone);
    platform.position.y = 0.5;
    g.add(platform);
    // dos hileras de columnas (algunas rotas)
    for (let i = 0; i < 6; i++) {
      const z = -8 + i * 3.2;
      for (const sx of [-12, 12]) {
        const h = 6 + (Math.random() < 0.3 ? -3 - Math.random() * 2 : Math.random());
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, h, 10), stone);
        col.position.set(sx, 1 + h / 2, z);
        g.add(col);
      }
    }
    // vigas del techo caídas encima
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 0.9, 1.4), stone);
      beam.position.set((Math.random() - 0.5) * 3, 8 + Math.random(), -6 + i * 4);
      beam.rotation.z = (Math.random() - 0.5) * 0.2;
      g.add(beam);
    }
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  private obeliskField(cx: number, cz: number): void {
    const obs = new THREE.MeshStandardMaterial({ color: 0x241f2e, flatShading: true });
    const pts: Array<[number, number, number]> = [
      [-30, 20, 10], [28, -18, 12], [-10, -30, 8], [18, 26, 9], [-26, -8, 11], [8, 8, 7],
    ];
    for (const [dx, dz, h] of pts) {
      const g = new THREE.Group();
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, h, 4), obs);
      spire.position.y = h / 2; spire.rotation.y = Math.random();
      g.add(spire);
      g.position.set(cx + dx, 0, cz + dz);
      this.scene.add(g);
    }
  }

  private stairs(cx: number, cz: number): void {
    const stone = new THREE.MeshStandardMaterial({ color: 0x2b2733, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(14 - i * 1.5, 0.6, 2.2), stone);
      step.position.set(cx, 0.3 + i * 0.55, cz + i * 2);
      this.scene.add(step);
    }
  }

  /** Puebla cada zona con props temáticos (determinístico por zona). */
  private populate() {
    const rng = mulberry32(20260824);
    for (const z of ZONES) {
      switch (z.id) {
        case "pueblo": this.populatePueblo(z, rng); break;
        case "bosque": this.populateBosque(z, rng); break;
        case "ruinas": this.populateRuinas(z, rng); break;
        case "yermo": this.populateYermo(z, rng); break;
        case "trono": this.populateTrono(z, rng); break;
      }
    }
  }

  /** Punto aleatorio dentro de los bounds del mapa, con un margen desde el borde. */
  private spot(z: Zone, rng: () => number, _innerFrac = 0.15): [number, number] {
    const m = 6; // margen desde el borde
    const x = z.bounds.minX + m + rng() * (z.bounds.maxX - z.bounds.minX - 2 * m);
    const zz = z.bounds.minZ + m + rng() * (z.bounds.maxZ - z.bounds.minZ - 2 * m);
    return [x, zz];
  }

  private rock(x: number, z: number, rng: () => number, color = 0x7a7d80): void {
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color, flatShading: true }),
    );
    const s = 0.5 + rng() * 1.2;
    rock.scale.set(s, s * (0.6 + rng() * 0.5), s);
    rock.position.set(x, s * 0.3, z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    this.scene.add(rock);
  }

  // ── Pueblo: prado luminoso con vallas, cajas y una fogata central ──────────
  private populatePueblo(z: Zone, rng: () => number): void {
    // Empedrado de la plaza (disco de piedra clara sobre el prado).
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(SAFE_RADIUS * 0.85, 32),
      new THREE.MeshStandardMaterial({ color: 0x9a8f6b, flatShading: true }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(TOWN.x, 0.04, TOWN.z);
    this.scene.add(plaza);

    // Fogata (acento cálido) al costado de la plaza.
    this.addGlow(TOWN.x - 5, TOWN.z + 4, 0xff9a3c, 0.5);

    // Postes de valla en anillo alrededor del pueblo.
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x7a5a34 });
    const fenceR = ((z.bounds.maxX - z.bounds.minX) / 2) * 0.85;
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(z.center.x + Math.cos(ang) * fenceR, 0.55, z.center.z + Math.sin(ang) * fenceR);
      this.scene.add(post);
    }
    // Cajas y barriles dispersos.
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const [x, zz] = this.spot(z, rng, 0.3);
      const s = 0.5 + rng() * 0.4;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
      crate.position.set(x, s / 2, zz);
      crate.rotation.y = rng() * Math.PI;
      this.scene.add(crate);
    }
    // Algunos árboles frondosos en el borde del prado.
    for (let i = 0; i < 8; i++) {
      const [x, zz] = this.spot(z, rng, 0.6);
      this.conifer(x, zz, rng, 0x3f8a44, 0x6b4a2b);
    }
  }

  // ── Bosque de Umbra: coníferas densas, rocas musgosas, pasto ───────────────
  private populateBosque(z: Zone, rng: () => number): void {
    for (let i = 0; i < 46; i++) {
      const [x, zz] = this.spot(z, rng);
      this.conifer(x, zz, rng, 0x2f6b34, 0x5a3f24);
    }
    for (let i = 0; i < 14; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x5d6b54);
    }
    // Matas de pasto.
    const grassGeo = new THREE.ConeGeometry(0.18, 0.6, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4f8d41, flatShading: true });
    for (let i = 0; i < 40; i++) {
      const [x, zz] = this.spot(z, rng);
      const g = new THREE.Mesh(grassGeo, grassMat);
      g.position.set(x, 0.3, zz);
      g.rotation.y = rng() * Math.PI;
      this.scene.add(g);
    }
  }

  // ── Ruinas de Nihil: columnas rotas, bloques caídos, cristales violeta ─────
  private populateRuinas(z: Zone, rng: () => number): void {
    const stone = new THREE.MeshStandardMaterial({ color: 0x8a8497, flatShading: true });
    for (let i = 0; i < 18; i++) {
      const [x, zz] = this.spot(z, rng);
      const h = 1.5 + rng() * 4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, h, 8), stone);
      col.position.set(x, h / 2, zz);
      col.rotation.z = (rng() - 0.5) * 0.25; // ligeramente inclinadas
      this.scene.add(col);
    }
    // Bloques/escombros.
    for (let i = 0; i < 20; i++) {
      const [x, zz] = this.spot(z, rng);
      const s = 0.7 + rng() * 1.3;
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.7, s), stone);
      block.position.set(x, s * 0.35, zz);
      block.rotation.y = rng() * Math.PI;
      this.scene.add(block);
    }
    // Cristales violeta (acento) que brillan tenue.
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9b7fd4, emissive: 0x6a4fb0, emissiveIntensity: 0.6, flatShading: true,
    });
    for (let i = 0; i < 10; i++) {
      const [x, zz] = this.spot(z, rng);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), crystalMat);
      cr.position.set(x, 0.6, zz);
      cr.rotation.y = rng() * Math.PI;
      this.scene.add(cr);
    }
    for (let i = 0; i < 8; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x6b6577);
    }
  }

  // ── Yermo Ceniciento: árboles muertos, rocas agrietadas, brasas ────────────
  private populateYermo(z: Zone, rng: () => number): void {
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x3b322c, flatShading: true });
    for (let i = 0; i < 24; i++) {
      const [x, zz] = this.spot(z, rng);
      const tree = new THREE.Group();
      const h = 2.5 + rng() * 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 6), deadMat);
      trunk.position.y = h / 2;
      tree.add(trunk);
      // Un par de ramas peladas.
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 5), deadMat);
        branch.position.y = h * (0.6 + rng() * 0.3);
        branch.rotation.z = (rng() - 0.5) * 1.6;
        branch.rotation.y = rng() * Math.PI;
        tree.add(branch);
      }
      tree.position.set(x, 0, zz);
      this.scene.add(tree);
    }
    for (let i = 0; i < 16; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x4a3d38);
    }
    // Rocas de brasa que brillan (acento cálido).
    const emberRock = new THREE.MeshStandardMaterial({
      color: 0xff7a3c, emissive: 0xff4a10, emissiveIntensity: 0.7, flatShading: true,
    });
    for (let i = 0; i < 8; i++) {
      const [x, zz] = this.spot(z, rng);
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rng() * 0.4, 0), emberRock);
      r.position.set(x, 0.4, zz);
      this.scene.add(r);
    }
    this.addEmbers(z);
  }

  // ── Trono del Rey Nihil: pilares de hueso, trono, braseros — un LUGAR ──────
  private populateTrono(z: Zone, rng: () => number): void {
    const bone = new THREE.MeshStandardMaterial({ color: 0xd9cfb0, flatShading: true });
    const obsidian = new THREE.MeshStandardMaterial({ color: 0x1e1b26, flatShading: true });

    // Pilares de hueso en dos hileras que flanquean el acceso (desde el sur).
    for (let i = 0; i < 5; i++) {
      const zz = z.center.z + 12 - i * 6;
      for (const sx of [-7, 7]) {
        const h = 6 + rng() * 1.5;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, h, 7), bone);
        pillar.position.set(z.center.x + sx, h / 2, zz);
        this.scene.add(pillar);
        const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), bone);
        skull.position.set(z.center.x + sx, h + 0.5, zz);
        this.scene.add(skull);
      }
    }

    // Braseros encendidos a la entrada de la arena (acento + "preparación").
    this.addGlow(z.center.x - 7, z.center.z + 14, 0xff3b3b, 0.7);
    this.addGlow(z.center.x + 7, z.center.z + 14, 0xff3b3b, 0.7);

    // El Trono: plataforma de obsidiana escalonada + respaldo, DETRÁS del jefe.
    const throne = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 10), obsidian);
    base.position.y = 0.5;
    throne.add(base);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 3), obsidian);
    seat.position.set(0, 1.7, -1);
    throne.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 1), obsidian);
    back.position.set(0, 4, -2.5);
    throne.add(back);
    // Cresta de hueso coronando el respaldo.
    for (const sx of [-1.4, 0, 1.4]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2, 6), bone);
      spike.position.set(sx, 7.4, -2.5);
      throne.add(spike);
    }
    throne.position.set(z.center.x, 0, z.center.z - 10);
    this.scene.add(throne);
  }

  /** Cono/pino low-poly reutilizable (trunk + 2 copas). */
  private conifer(x: number, z: number, rng: () => number, leaf: number, trunkColor: number): void {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.42, 2, 6),
      new THREE.MeshStandardMaterial({ color: trunkColor }),
    );
    trunk.position.y = 1;
    const leafMat = new THREE.MeshStandardMaterial({ color: leaf, flatShading: true });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.4, 7), leafMat);
    c1.position.y = 2.9;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.9, 7), leafMat);
    c2.position.y = 4.1;
    tree.add(trunk, c1, c2);
    tree.scale.setScalar(0.8 + rng() * 0.7);
    tree.position.set(x, 0, z);
    tree.rotation.y = rng() * Math.PI * 2;
    this.scene.add(tree);
  }

  /** Esfera emissiva + point light para fogatas/braseros/cristales de acento. */
  private addGlow(x: number, z: number, color: number, intensity: number): void {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 }),
    );
    orb.position.set(x, 0.8, z);
    this.scene.add(orb);
    const light = new THREE.PointLight(color, intensity, 18, 2);
    light.position.set(x, 1.6, z);
    this.scene.add(light);
  }

  /** Sistema de partículas de brasas ascendentes para el Yermo. */
  private addEmbers(z: Zone): void {
    const N = 200;
    const positions = new Float32Array(N * 3);
    const rng = mulberry32(777);
    const hw = (z.bounds.maxX - z.bounds.minX) / 2;
    const hd = (z.bounds.maxZ - z.bounds.minZ) / 2;
    for (let i = 0; i < N; i++) {
      positions[i * 3] = z.center.x + (rng() * 2 - 1) * hw;
      positions[i * 3 + 1] = rng() * 6;
      positions[i * 3 + 2] = z.center.z + (rng() * 2 - 1) * hd;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff7a3c, size: 0.35, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.embers = new THREE.Points(geo, mat);
    this.scene.add(this.embers);
  }

  /**
   * Interpola suavemente la niebla, el fondo y las luces hacia el bioma de la zona
   * donde está el jugador — así CRUZAR a una zona nueva se siente distinto. Llamar
   * cada frame con la posición del self. También anima las brasas del Yermo.
   */
  updateMood(x: number, z: number, dt: number): void {
    const zone = zoneAt(x, z);
    const b = zone.biome;
    const k = Math.min(1, dt * 1.5); // rapidez de transición

    this.fog.color.lerp(new THREE.Color(b.fog), k);
    this.bgColor.copy(this.fog.color);
    this.curFogNear += (b.fogNear - this.curFogNear) * k;
    this.curFogFar += (b.fogFar - this.curFogFar) * k;
    this.fog.near = this.curFogNear;
    this.fog.far = this.curFogFar;

    const targetSun = SUN_INTENSITY[zone.id] ?? 0.8;
    this.curSun += (targetSun - this.curSun) * k;
    this.sun.intensity = this.curSun;
    // La luz hemisférica también toma el tinte del bioma (cielo).
    this.hemi.color.lerp(new THREE.Color(b.fog), k * 0.6);

    // Brasas del Yermo: ascienden y se reciclan al llegar arriba.
    if (this.embers) {
      const pos = this.embers.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.6;
        if (y > 7) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }
}
