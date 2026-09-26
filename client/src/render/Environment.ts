import { AUTHORED_STRUCTURES, STRUCTURE_SIZE, TOWN_FENCES } from "@aden/shared";
import { addCryptEnvironment } from "./CryptEnvironment.js";
import { addVeilEnvironment } from './VeilEnvironment.js';
import { addMonasteryEnvironment } from './MonasteryEnvironment.js';
import { addMinesEnvironment } from './MinesEnvironment.js';
import * as THREE from "three";
import { addMapDressing } from "./MapDressing.js";
import { ZONES, WORLD_OBJECTS, getZone, zoneAt, TOWN, SAFE_RADIUS, distance2D, type Zone } from "@aden/shared";
import { stoneMat, woodMat, roofMat, thatchMat, plasterMat, cobbleMat, clothMat, crackedStoneMat, terrainMat, metalMat, foliageMat, boneMat, texturedMaterial } from "./textures.js";

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

const SKY_ZENITH = 0x101a33;
const SKY_HORIZON = 0x98a8b5;
// Dirección del sol (rasante, bajo en el horizonte) → luz de hora dorada + sombras largas.
const SUN_DIR = new THREE.Vector3(0.55, 0.42, 0.72).normalize();

/** Intensidad del sol por zona (más oscuro cuanto más profundo/peligroso). */
const SUN_INTENSITY: Record<string, number> = {
  marismas: 1.3,
  monasterio: 1.4,
  minas: 1.0,
  pueblo: 1.65,
  bosque: 1.2,
  ruinas: 1.05,
  yermo: 1.1,
  trono: 0.85,
  cripta: 1.45,
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
  private skyMesh: THREE.Mesh | null = null;
  private readonly sunTarget = new THREE.Object3D();
  // Vegetación que se mece con el viento (árboles, matas) — animada en updateMood.
  private readonly swayers: { o: THREE.Object3D; phase: number; amt: number }[] = [];
  private swayT = 0;
  // Motas ambientales (polvo/cenizas) que siguen al jugador, tintadas por bioma.
  private motes: THREE.Points | null = null;
  private readonly motesGroup = new THREE.Group();
  // Objetivos de mood (se interpolan suavemente frame a frame).
  private curFogNear: number;
  private curFogFar: number;
  private curSun: number;

  constructor(private readonly scene: THREE.Scene) {
    const pueblo = getZone("pueblo").biome;
    this.addSky();
    // Luz de relleno hemisférica: cielo cálido dorado arriba, rebote tierra abajo.
    this.hemi = new THREE.HemisphereLight(0xb9d2ed, 0x403b30, 1.05);
    this.scene.add(this.hemi);
    // Sol de "hora dorada": clave cálida rasante que talla sombras largas.
    this.sun = new THREE.DirectionalLight(0xffe3bb, SUN_INTENSITY.pueblo);
    this.sun.position.copy(SUN_DIR).multiplyScalar(90);
    // Etapa 18: el sol proyecta sombras. La cámara de sombra es ortográfica y sigue
    // al jugador (updateMood) para mantener el frustum acotado alrededor de él.
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.near = 1; sc.far = 260; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    // Ambiente cálido tenue (no lavar los negros del dusk).
    this.scene.add(new THREE.AmbientLight(0xc2ccdf, 0.35));

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
    addMapDressing(this.scene);
    addCryptEnvironment(this.scene);
    this.addMotes();
    this.enableShadows();
  }

  /**
   * Nube de motas ambientales (polvo en suspensión / cenizas) que sigue al jugador
   * y se tinta con el acento del bioma actual. Da "aire" y profundidad a la escena
   * a bajísimo costo (un solo Points). Se recolocan alrededor del jugador cada frame.
   */
  private addMotes(): void {
    const N = 140;
    const positions = new Float32Array(N * 3);
    const rng = mulberry32(4242);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (rng() * 2 - 1) * 28;
      positions[i * 3 + 1] = rng() * 14;
      positions[i * 3 + 2] = (rng() * 2 - 1) * 28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe9dcc2, size: 0.16, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.motesGroup.add(this.motes);
    this.scene.add(this.motesGroup);
  }

  /** Etapa 18: activa proyección/recepción de sombras en todas las mallas (menos el cielo). */
  private enableShadows(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m === this.skyMesh) return;
      if (m.userData.noCastShadow) { m.castShadow = false; m.receiveShadow = true; return; }
      // Los suelos sólo RECIBEN sombra (no la proyectan): evita auto-sombra y ahorra.
      if (m.userData.ground) { m.castShadow = false; m.receiveShadow = true; return; }
      m.castShadow = true; m.receiveShadow = true;
    });
  }

  private addSky() {
    const geo = new THREE.SphereGeometry(400, 48, 24);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color(SKY_ZENITH) },
        horizon: { value: new THREE.Color(SKY_HORIZON) },
        sunDir: { value: SUN_DIR.clone() },
        sunColor: { value: new THREE.Color(0xffe0a0) },
        exponent: { value: 0.72 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      // Gradiente cenit→horizonte + resplandor del sol (halo dorado) + un disco tenue.
      fragmentShader: `
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float exponent;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = pow(max(d.y, 0.0), exponent);
          vec3 col = mix(horizon, zenith, h);
          // Halo del sol: crece cerca de la dirección del sol.
          float sd = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * pow(sd, 8.0) * 0.5;       // halo amplio
          col += sunColor * pow(sd, 220.0) * 1.6;     // disco brillante
          // Bruma cálida sobre el horizonte.
          float haze = smoothstep(0.16, -0.05, d.y);
          col = mix(col, horizon * 1.05, haze * 0.5);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.skyMesh = new THREE.Mesh(geo, mat);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);
  }

  /**
   * Suelo por cada MAPA (Etapa 15): una placa rectangular sobre su región. Ahora
   * con TEXTURA procedural (canvas) derivada del color del bioma —moteado + motas—
   * para que el piso no se vea plano/chato. Se repite para dar detalle fino.
   */
  private paintBiomes() {
    for (const z of ZONES) {
      const w = z.bounds.maxX - z.bounds.minX;
      const d = z.bounds.maxZ - z.bounds.minZ;
      const geo = new THREE.PlaneGeometry(w, d, 1, 1);
      const mat = terrainMat(z.id, [w / 9, d / 9]);
      const plate = new THREE.Mesh(geo, mat);
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(z.center.x, 0.02, z.center.z);
      plate.userData.ground = true;
      this.scene.add(plate);
    }
  }

  // ── Estructuras (Etapa 17/20): landmarks arquitectónicos por mapa. En el pueblo,
  //    una CIUDAD amurallada con portón, mercado, calles y faroles. ────────────────
  private structures(): void {
    addVeilEnvironment(this.scene);
    addMonasteryEnvironment(this.scene);
    addMinesEnvironment(this.scene);
    this.buildTown();

    for (const p of AUTHORED_STRUCTURES) {
      const before=this.scene.children.length;
      switch (p.kind) {
        case 'house': this.house(p.x,p.z,p.rotation,p.color,p.roof,p.thatched,p.scale); break;
        case 'stall': this.marketStall(p.x,p.z,p.color,p.rotation); break;
        case 'fountain': this.fountain(p.x,p.z); break;
        case 'well': this.well(p.x,p.z); break;
        case 'tower': this.tower(p.x,p.z,p.height,p.color,p.broken); break;
        case 'arch': this.arch(p.x,p.z,p.rotation,p.color,p.scale); break;
      }
      if(this.scene.children.length>before) { const root=this.scene.children[before]; root.userData.authoredStructureId=p.id; }
    }
    this.campfireCamp(276,-8);
    this.templeHall(0,300);
    this.obeliskField();
    this.stairs(600,130);
  }

  /** Construye el Pueblo de Aden como una ciudad amurallada con portón sur. */
  private buildTown(): void {
    const cx = TOWN.x, cz = TOWN.z;
    const R = 42;             // radio de la muralla
    const gateHalf = 5;       // medio ancho del portón (mira al sur, +Z, hacia el spawn)

    // Muralla octogonal de piedra con almenas, con un hueco para el portón al sur.
    this.townWall();
    this.gate(cx, cz + R, gateHalf);

    // Camino empedrado del portón a la plaza + faroles a los costados.
    this.road(cx, cz + R - 3, cx, cz + 8, 5);
    for (let i = 0; i < 5; i++) {
      const z = cz + R - 6 - i * 7;
      this.lamp(cx - 4, z);
      this.lamp(cx + 4, z);
    }

    // Estandartes en las torres del portón + tablón de anuncios.
    this.signpost(cx - 6, cz + 16);

    // Corral con vallas y algunos props de vida.
    for (const [x0,z0,x1,z1] of TOWN_FENCES) this.fence(cx+x0,cz+z0,cx+x1,cz+z1);
    // Southern residential quarter and garden lanes give the arrival a lived-in scale.
    for (const side of [-1, 1]) {
      this.road(cx + side * 5, cz + 24, cx + side * 20, cz + 24, 3);
      this.lamp(cx + side * 11, cz + 26);
      this.banner(cx + side * 12, cz + 22, 3.5, 0x772f3f);
      this.woodPile(cx + side * 27, cz + 20, mulberry32(side + 80));
      for (let i = 0; i < 5; i++) this.bush(cx + side * (15 + i * 2.4), cz + 32, mulberry32(i + 74), 0x567142);
    }
  }

  /** Muralla de piedra alrededor del pueblo (octógono), con hueco de portón al sur. */
  private townWall(): void {
    const wallMat = stoneMat(0x8f877a, [1.4, 0.9], true);
    const merlonMat = stoneMat(0x847c70, [0.5, 0.5], true);
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='wall')) {
      const {x:mx,z:mz,width:len}=p;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(p.width, p.height, p.depth), wallMat);
      seg.position.set(mx,p.height/2,mz); seg.rotation.y=p.rotation;
      seg.userData.structureId=p.id;
      this.scene.add(seg);
      // Almena arriba del segmento.
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(len, 1, 0.8), merlonMat);
      merlon.position.set(mx, 5.4, mz);
      merlon.rotation.y = seg.rotation.y;
      this.scene.add(merlon);
    }
  }

  /** Portón: dos torres cuadradas flanqueando el acceso + estandartes + braseros. */
  private gate(cx: number, cz: number, gateHalf: number): void {
    const towerMat = stoneMat(0x8a8276, [1, 2], true);
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='gateTower')) {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(p.width, p.height, p.depth), towerMat);
      shaft.position.y = 4.5;
      g.add(shaft);
      // almenas
      for (const ox of [-1.2, 1.2]) for (const oz of [-1.2, 1.2]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1), towerMat);
        m.position.set(ox, 9.6, oz); g.add(m);
      }
      g.position.set(p.x, 0, p.z); shaft.userData.structureId=p.id;
      this.scene.add(g);
      // Estandarte colgando de cada torre.
      this.banner(p.x, p.z - 2.1, 6.5, 0x8a2b2b);
    }
    // Dintel sobre el portón.
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gateHalf * 2 + 4, 1.6, 2.4), towerMat);
    lintel.position.set(cx, 8.2, cz);
    this.scene.add(lintel);
    // Braseros a la entrada.
    this.addGlow(cx - gateHalf - 2, cz + 1, 0xffa030, 0.7);
    this.addGlow(cx + gateHalf + 2, cz + 1, 0xffa030, 0.7);
  }

  /** Casa low-poly texturizada: revoque + tejado de tejas + puerta, ventanas y chimenea. */
  private house(cx: number, cz: number, rot: number, color: number, roof = 0x7a3b2b, thatched = false, scale = 1): void {
    const g = new THREE.Group();
    const w = STRUCTURE_SIZE.houseWidth * scale, h = 3 * scale, d = STRUCTURE_SIZE.houseDepth * scale;
    const wall = plasterMat(color, [w / 3, h / 3]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    body.position.y = h / 2;
    g.add(body);
    // Techo: tejas (cono de 4 lados) o paja.
    const roofGeo = new THREE.ConeGeometry(w * 0.82, 2.4 * scale, 4);
    const roofMesh = new THREE.Mesh(roofGeo, thatched ? thatchMat(0xb99850, [2, 1]) : roofMat(roof, [3, 2]));
    roofMesh.position.y = h + 1.2 * scale; roofMesh.rotation.y = Math.PI / 4;
    g.add(roofMesh);
    // Puerta de madera.
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scale, 1.8 * scale, 0.2), woodMat(0x5a3d1e, [1, 2]));
    door.position.set(0, 0.9 * scale, d / 2 + 0.01);
    g.add(door);
    // Ventanas iluminadas (emissive cálido → brillan en la hora dorada + bloom).
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb347, emissiveIntensity: 0.9 });
    for (const wx of [-w * 0.28, w * 0.28]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.9 * scale, 0.15), winMat);
      win.position.set(wx, h * 0.55, d / 2 + 0.01);
      g.add(win);
    }
    // Chimenea con humo insinuado (caja de piedra).
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6 * scale, 0.7), stoneMat(0x6b635a, [1, 1], true));
    chimney.position.set(w * 0.3, h + 1.6 * scale, -d * 0.2);
    g.add(chimney);
    g.position.set(cx, 0, cz); g.rotation.y = rot;
    this.scene.add(g);
  }

  /** Fuente de piedra central con "agua" translúcida. */
  private fountain(cx: number, cz: number): void {
    const g = new THREE.Group();
    const stone = stoneMat(0xa39a8c, [2, 1], true);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.4, STRUCTURE_SIZE.fountainRadius, 1, 16), stone);
    basin.position.y = 0.5; g.add(basin);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.9, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x2f7fb0, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1, emissive: 0x14344a, emissiveIntensity: 0.3 }),
    );
    inner.position.y = 0.85; inner.userData.ground = true; g.add(inner);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 12), stone);
    pillar.position.y = 1.6; g.add(pillar);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.4, 0.5, 12), stone);
    bowl.position.y = 2.7; g.add(bowl);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), new THREE.MeshStandardMaterial({ color: 0x9fd8f0, emissive: 0x2f7fb0, emissiveIntensity: 0.6 }));
    top.position.y = 3.2; g.add(top);
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  /** Puesto de mercado: mostrador de madera + toldo de tela a rayas + mercancía. */
  private marketStall(cx: number, cz: number, cloth: number, rot: number): void {
    const g = new THREE.Group();
    const wood = woodMat(0x8a6a3c, [2, 1]);
    // Mostrador.
    const counter = new THREE.Mesh(new THREE.BoxGeometry(STRUCTURE_SIZE.stallWidth, 1, STRUCTURE_SIZE.stallDepth), wood);
    counter.position.y = 0.5; g.add(counter);
    // Postes.
    for (const ox of [-1.4, 1.4]) for (const oz of [-0.5, 0.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), wood);
      post.position.set(ox, 1.3, oz); g.add(post);
    }
    // Toldo inclinado.
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 2), clothMat(cloth, [3, 2]));
    awning.position.set(0, 2.7, 0.2); awning.rotation.x = -0.22; g.add(awning);
    // Mercancía sobre el mostrador (cajitas/frutas).
    for (let i = 0; i < 4; i++) {
      const s = 0.25 + Math.random() * 0.2;
      const goodMat = Math.random() < 0.5 ? woodMat(0x9a7040, [1, 1]) : new THREE.MeshStandardMaterial({ color: [0xc0392b, 0xd68910, 0x27ae60][i % 3], flatShading: true });
      const good = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), goodMat);
      good.position.set(-1.2 + i * 0.7, 1.1, 0); g.add(good);
    }
    g.position.set(cx, 0, cz); g.rotation.y = rot;
    this.scene.add(g);
  }

  /** Farol de calle: poste de madera + lámpara emissiva (glow con bloom). */
  private lamp(cx: number, cz: number): void {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 6), woodMat(0x4a3a24, [1, 3]));
    post.position.y = 1.6; g.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), woodMat(0x4a3a24));
    arm.position.set(0.25, 3.1, 0); g.add(arm);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffb347, emissiveIntensity: 1.4 });
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), lampMat);
    lantern.position.set(0.5, 2.95, 0); g.add(lantern);
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  /** Estandarte de tela colgante. */
  private banner(cx: number, cz: number, y: number, color: number): void {
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4), clothMat(color, [1, 2]));
    cloth.material.side = THREE.DoubleSide;
    cloth.position.set(cx, y, cz);
    this.scene.add(cloth);
    // Punta triangular abajo.
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 3), clothMat(color, [1, 1]));
    (tip.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    tip.position.set(cx, y - 1.9, cz); tip.rotation.x = Math.PI; tip.rotation.y = Math.PI;
    this.scene.add(tip);
  }

  /** Cartel de madera con poste (tablón). */
  private signpost(cx: number, cz: number): void {
    const g = new THREE.Group();
    const wood = woodMat(0x6a4a2b, [1, 2]);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), wood);
    post.position.y = 1.2; g.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.15), woodMat(0x8a6a3c, [2, 1]));
    board.position.set(0, 1.9, 0); g.add(board);
    g.position.set(cx, 0, cz); g.rotation.y = 0.2;
    this.scene.add(g);
  }

  /** Tramo de valla de madera entre dos puntos. */
  private fence(x0: number, z0: number, x1: number, z1: number): void {
    const wood = woodMat(0x6a4a2b, [1, 1]);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(STRUCTURE_SIZE.fenceDepth/2, STRUCTURE_SIZE.fenceDepth/2, 1.2, 6), wood);
      post.position.set(x0 + (x1 - x0) * t, 0.6, z0 + (z1 - z0) * t);
      this.scene.add(post);
    }
    // Travesaños.
    for (const y of [0.5, 0.95]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.1), wood);
      rail.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      rail.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      this.scene.add(rail);
    }
  }

  /** Camino de adoquín (placa fina texturizada) entre dos puntos. */
  private road(x0: number, z0: number, x1: number, z1: number, width: number): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.PlaneGeometry(width, len);
    const mat = cobbleMat(0x8f8676, [Math.max(1, width / 2), Math.max(2, len / 4)]);
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -Math.atan2(x1 - x0, z1 - z0);
    road.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    road.userData.ground = true;
    this.scene.add(road);
  }

  /** Pequeño campamento: fogata + un par de troncos como asientos + tienda. */
  private campfireCamp(cx: number, cz: number): void {
    this.addGlow(cx, cz, 0xff8a2c, 0.6);
    const wood = woodMat(0x5a3f24, [1, 1]);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 6), wood);
      log.position.set(cx + Math.cos(a) * 2.2, 0.25, cz + Math.sin(a) * 2.2);
      log.rotation.z = Math.PI / 2; log.rotation.y = a;
      this.scene.add(log);
    }
    // Tienda triangular.
    const p=AUTHORED_STRUCTURES.find(p=>p.kind==='tent')!;
    const tent = new THREE.Mesh(new THREE.ConeGeometry(p.width/2, p.height, 4), clothMat(0x6a5a3a, [2, 2]));
    tent.position.set(p.x, p.height/2, p.z); tent.rotation.y=p.rotation;tent.userData.structureId=p.id;
    this.scene.add(tent);
  }

  private well(cx: number, cz: number): void {
    const g = new THREE.Group();
    const stone = stoneMat(0x9a938a, [1.5, 1], true);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(STRUCTURE_SIZE.wellRadius, STRUCTURE_SIZE.wellRadius, 1.1, 12), stone);
    ring.position.y = 0.55;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), woodMat(0x6b4a2b, [1, 2]));
    post1.position.set(-0.9, 1.7, 0);
    const post2 = post1.clone(); post2.position.x = 0.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), roofMat(0x7a3b2b, [2, 1]));
    roof.position.y = 3.2; roof.rotation.y = Math.PI / 4;
    g.add(ring, post1, post2, roof);
    g.position.set(cx, 0, cz);
    this.scene.add(g);
  }

  private tower(cx: number, cz: number, h: number, color: number, broken = false): void {
    const g = new THREE.Group();
    const stone = stoneMat(color, [2, Math.max(2, Math.round(h / 3))], true);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2, STRUCTURE_SIZE.towerRadius, h, 10), stone);
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
    const stone = stoneMat(color, [1, 4], true);
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(STRUCTURE_SIZE.archPierWidth, 7, STRUCTURE_SIZE.archPierWidth), stone); p1.position.set(-STRUCTURE_SIZE.archPierOffset, 3.5, 0);
    const p2 = p1.clone(); p2.position.x = STRUCTURE_SIZE.archPierOffset;
    const top = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1.2), stone); top.position.y = 7.2;
    g.add(p1, p2, top);
    g.position.set(cx, 0, cz); g.rotation.y = rot; g.scale.setScalar(scale);
    this.scene.add(g);
  }

  private templeHall(cx: number, cz: number): void {
    const g = new THREE.Group();
    const stone = crackedStoneMat(0x8a8497, [4, 1], true);
    const colStone = crackedStoneMat(0x8a8497, [1, 3], true);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(30, 0.06, 20), cobbleMat(0x87818c, [5, 3]));
    platform.position.y = 0.025;
    platform.userData.ground = true;
    g.add(platform);
    // dos hileras de columnas (algunas rotas)
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='templeColumn')) {
      const h = p.height + (Math.random() < 0.3 ? -3 - Math.random() * 2 : Math.random());
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.8,p.width/2,h,10), colStone);
      col.position.set(p.x-cx,1+h/2,p.z-cz); col.userData.structureId=p.id;
      g.add(col);
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

  private obeliskField(): void {
    const obs = stoneMat(0x241f2e, [1, 3], true);
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='obelisk')) {
      const g = new THREE.Group();
      const spire = new THREE.Mesh(new THREE.ConeGeometry(p.width/2, p.height, 4), obs);
      spire.position.y = p.height / 2; spire.rotation.y = p.rotation;
      g.add(spire);
      g.position.set(p.x, 0, p.z); spire.userData.structureId=p.id;
      this.scene.add(g);
    }
  }

  private stairs(cx: number, cz: number): void {
    const stone = stoneMat(0x2b2733, [4, 1], true);
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
    for (let attempt = 0; attempt < 128; attempt++) {
      const x = z.bounds.minX + m + rng() * (z.bounds.maxX - z.bounds.minX - 2 * m);
      const zz = z.bounds.minZ + m + rng() * (z.bounds.maxZ - z.bounds.minZ - 2 * m);
      if (!z.safe && (Math.abs(x-z.center.x)<7 || Math.abs(zz-z.center.z)<5 || Math.hypot(x-z.center.x,zz-z.center.z)<18)) continue;
      if (Math.hypot(x-z.spawn.x,zz-z.spawn.z)<9) continue;
      if (WORLD_OBJECTS.some(o=>o.mapId===z.id && Math.hypot(x-o.x,zz-o.z)<6)) continue;
      return [x, zz];
    }
    return [z.bounds.minX + m, z.bounds.minZ + m];
  }

  private rock(x: number, z: number, rng: () => number, color = 0x7a7d80): void {
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      crackedStoneMat(color),
    );
    const s = 0.5 + rng() * 1.2;
    rock.scale.set(s, s * (0.6 + rng() * 0.5), s);
    rock.position.set(x, s * 0.3, z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    this.scene.add(rock);
  }

  // ── Pueblo: ciudad viva — plaza de adoquín, barriles/sacos/heno, árboles ─────
  private populatePueblo(z: Zone, rng: () => number): void {
    // Plaza de ADOQUÍN alrededor de la fuente.
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(SAFE_RADIUS * 1.1, 48),
      cobbleMat(0x8f8676, [6, 6]),
    );
    plaza.rotation.x = -Math.PI / 2;
    // El camino entra en la plaza a y=0.03: separar los planos evita z-fighting.
    plaza.position.set(TOWN.x, 0.06, TOWN.z);
    plaza.userData.ground = true;
    this.scene.add(plaza);

    // Fogata (acento cálido) al costado de la plaza.
    this.addGlow(TOWN.x - 7, TOWN.z + 5, 0xff9a3c, 0.5);

    // Barriles, sacos y cajas cerca del mercado y las casas.
    for (let i = 0; i < 14; i++) {
      const [x, zz] = this.spot(z, rng, 0.3);
      if (distance2D(x, zz, TOWN.x, TOWN.z) > 42) continue; // dentro de la muralla
      const kind = rng();
      if (kind < 0.5) this.barrel(x, zz, rng);
      else if (kind < 0.8) this.crate(x, zz, rng);
      else this.sack(x, zz, rng);
    }
    // Pilas de leña y fardos de heno junto a las casas.
    for (let i = 0; i < 4; i++) {
      const [x, zz] = this.spot(z, rng, 0.3);
      if (distance2D(x, zz, TOWN.x, TOWN.z) > 40) continue;
      if (rng() < 0.5) this.woodPile(x, zz, rng); else this.hayBale(x, zz, rng);
    }
    // Árboles frondosos dentro y en el borde de la ciudad.
    for (let i = 0; i < 12; i++) {
      const [x, zz] = this.spot(z, rng, 0.6);
      this.conifer(x, zz, rng, 0x3f8a44, 0x6b4a2b);
    }
  }

  /** Barril de madera con aros oscuros. */
  private barrel(x: number, z: number, rng: () => number): void {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.95, 10), woodMat(0x8a6a3c, [2, 1]));
    body.position.y = 0.48; g.add(body);
    for (const y of [0.2, 0.76]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10), metalMat(0x706a5d));
      ring.position.y = y; g.add(ring);
    }
    g.position.set(x, 0, z); g.rotation.y = rng() * Math.PI;
    this.scene.add(g);
  }

  /** Caja de madera. */
  private crate(x: number, z: number, rng: () => number): void {
    const s = 0.5 + rng() * 0.45;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodMat(0x9a7040, [1, 1]));
    crate.position.set(x, s / 2, z); crate.rotation.y = rng() * Math.PI;
    this.scene.add(crate);
    if (rng() < 0.4) { // a veces apilada
      const s2 = s * 0.7;
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(s2, s2, s2), woodMat(0x8a6a3c, [1, 1]));
      c2.position.set(x + (rng() - 0.5) * 0.2, s + s2 / 2, z + (rng() - 0.5) * 0.2);
      c2.rotation.y = rng() * Math.PI; this.scene.add(c2);
    }
  }

  /** Saco de arpillera. */
  private sack(x: number, z: number, rng: () => number): void {
    const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 8), clothMat(0xbfa878));
    sack.position.set(x, 0.35, z); sack.rotation.y = rng() * Math.PI;
    sack.scale.y = 0.9 + rng() * 0.2;
    this.scene.add(sack);
  }

  /** Pila de leña. */
  private woodPile(x: number, z: number, rng: () => number): void {
    const g = new THREE.Group();
    const wood = woodMat(0x6b4a2b, [1, 1]);
    for (let i = 0; i < 6; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 6), wood);
      const row = Math.floor(i / 3);
      log.position.set(-0.3 + (i % 3) * 0.3, 0.13 + row * 0.26, 0);
      log.rotation.z = Math.PI / 2;
      g.add(log);
    }
    g.position.set(x, 0, z); g.rotation.y = rng() * Math.PI;
    this.scene.add(g);
  }

  /** Fardo de heno. */
  private hayBale(x: number, z: number, rng: () => number): void {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), thatchMat(0xcaa93f, [2, 1]));
    bale.rotation.z = Math.PI / 2;
    bale.position.set(x, 0.5, z); bale.rotation.y = rng() * Math.PI;
    this.scene.add(bale);
  }

  // ── Bosque de Umbra: coníferas densas, rocas musgosas, pasto, arbustos, hongos ─
  private populateBosque(z: Zone, rng: () => number): void {
    for (let i = 0; i < 66; i++) {
      const [x, zz] = this.spot(z, rng);
      this.conifer(x, zz, rng, 0x2f6b34, 0x5a3f24);
    }
    for (let i = 0; i < 20; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x5d6b54);
    }
    // Arbustos redondeados.
    for (let i = 0; i < 22; i++) {
      const [x, zz] = this.spot(z, rng);
      this.bush(x, zz, rng, 0x35722f);
    }
    // Setas rojas al pie de los árboles.
    for (let i = 0; i < 16; i++) {
      const [x, zz] = this.spot(z, rng);
      this.mushroom(x, zz, rng);
    }
    // Troncos caídos.
    for (let i = 0; i < 6; i++) {
      const [x, zz] = this.spot(z, rng);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.5 + rng() * 2, 7), woodMat(0x5a3f24, [1, 2]));
      log.rotation.z = Math.PI / 2; log.rotation.y = rng() * Math.PI;
      log.position.set(x, 0.4, zz);
      this.scene.add(log);
    }
    // Matas de pasto que se mecen.
    const grassGeo = new THREE.ConeGeometry(0.18, 0.6, 4);
    const grassMat = foliageMat(0x71854a);
    for (let i = 0; i < 72; i++) {
      const [x, zz] = this.spot(z, rng);
      const g = new THREE.Mesh(grassGeo, grassMat);
      g.position.set(x, 0.3, zz);
      g.rotation.y = rng() * Math.PI;
      this.scene.add(g);
      this.swayers.push({ o: g, phase: rng() * Math.PI * 2, amt: 0.06 + rng() * 0.06 });
    }
  }

  /** Arbusto: cúpula de icosaedro achatada. */
  private bush(x: number, z: number, rng: () => number, color: number): void {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + rng() * 0.5, 0), foliageMat(color));
    bush.scale.y = 0.7;
    bush.position.set(x, 0.4, z);
    bush.rotation.set(rng(), rng(), rng());
    this.scene.add(bush);
    this.swayers.push({ o: bush, phase: rng() * Math.PI * 2, amt: 0.03 + rng() * 0.03 });
  }

  /** Seta con tallo claro y sombrero rojo con motas. */
  private mushroom(x: number, z: number, rng: () => number): void {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.35, 6), boneMat(0xe8e0cf));
    stem.position.y = 0.17; g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), clothMat(0xc0392b));
    cap.position.y = 0.34; g.add(cap);
    g.position.set(x, 0, z); g.scale.setScalar(0.7 + rng() * 0.9);
    this.scene.add(g);
  }

  // ── Ruinas de Nihil: columnas rotas, bloques caídos, cristales violeta ─────
  private populateRuinas(z: Zone, rng: () => number): void {
    const stone = crackedStoneMat(0x8a8497, [1, 2], true);
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='ruinColumn')) {
      const col=new THREE.Mesh(new THREE.CylinderGeometry(.5,p.width/2,p.height,8),stone);
      col.position.set(p.x,p.height/2,p.z);col.userData.structureId=p.id;this.scene.add(col);
    }
    // Bloques/escombros.
    for (let i = 0; i < 30; i++) {
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
    for (let i = 0; i < 16; i++) {
      const [x, zz] = this.spot(z, rng);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), crystalMat);
      cr.position.set(x, 0.6, zz);
      cr.rotation.y = rng() * Math.PI;
      cr.scale.setScalar(0.7 + rng() * 1.1);
      this.scene.add(cr);
    }
    for (let i = 0; i < 14; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x6b6577);
    }
  }

  // ── Yermo Ceniciento: árboles muertos, rocas agrietadas, brasas ────────────
  private populateYermo(z: Zone, rng: () => number): void {
    const deadMat = woodMat(0x3b322c);
    for (let i = 0; i < 34; i++) {
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
      this.swayers.push({ o: tree, phase: rng() * Math.PI * 2, amt: 0.012 + rng() * 0.016 });
    }
    for (let i = 0; i < 24; i++) {
      const [x, zz] = this.spot(z, rng);
      this.rock(x, zz, rng, 0x4a3d38);
    }
    // Rocas de brasa que brillan (acento cálido).
    const emberRock = texturedMaterial("lava", {
      color: 0x918079, emissive: 0x8b200a, emissiveIntensity: 0.35, bumpScale: 0.08,
    });
    for (let i = 0; i < 13; i++) {
      const [x, zz] = this.spot(z, rng);
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rng() * 0.4, 0), emberRock);
      r.position.set(x, 0.4, zz);
      this.scene.add(r);
    }
    this.addEmbers(z);
  }

  // ── Trono del Rey Nihil: pilares de hueso, trono, braseros — un LUGAR ──────
  private populateTrono(z: Zone, rng: () => number): void {
    const bone = boneMat();
    const obsidian = texturedMaterial("lava", { color: 0x555568, bumpScale: 0.08 });

    // Pilares de hueso en dos hileras que flanquean el acceso (desde el sur).
    for (const p of AUTHORED_STRUCTURES.filter(p=>p.kind==='boneColumn')) {
      const h=p.height+rng()*1.5;
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.7,p.width/2,h,7),bone);
      pillar.position.set(p.x,h/2,p.z); pillar.userData.structureId=p.id; this.scene.add(pillar);
      const skull=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,0),bone);
      skull.position.set(p.x,h+.5,p.z); this.scene.add(skull);
    }
    // Braseros encendidos a la entrada de la arena (acento + "preparación").
    this.addGlow(z.center.x - 7, z.center.z + 14, 0xff3b3b, 0.7);
    this.addGlow(z.center.x + 7, z.center.z + 14, 0xff3b3b, 0.7);

    // El Trono: plataforma de obsidiana escalonada + respaldo, DETRÁS del jefe.
    const throne = new THREE.Group();
    const throneLayout = AUTHORED_STRUCTURES.find(p=>p.kind==='throne')!;
    const base = new THREE.Mesh(new THREE.BoxGeometry(throneLayout.width, 1, throneLayout.depth), obsidian);
    base.position.y = 0.5; base.userData.structureId=throneLayout.id;
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
    throne.position.set(throneLayout.x, 0, throneLayout.z);
    this.scene.add(throne);
  }

  /** Cono/pino low-poly reutilizable (trunk + 2 copas). */
  private conifer(x: number, z: number, rng: () => number, leaf: number, trunkColor: number): void {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.42, 2, 6),
      woodMat(trunkColor, [1, 3]),
    );
    trunk.position.y = 1;
    const leafMat = foliageMat(leaf, [3, 2]);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.4, 7), leafMat);
    c1.position.y = 2.9;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.9, 7), leafMat);
    c2.position.y = 4.1;
    tree.add(trunk, c1, c2);
    tree.scale.setScalar(0.8 + rng() * 0.7);
    tree.position.set(x, 0, z);
    tree.rotation.y = rng() * Math.PI * 2;
    this.scene.add(tree);
    this.swayers.push({ o: tree, phase: rng() * Math.PI * 2, amt: 0.018 + rng() * 0.022 });
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
    // Etapa 18: el sol (y su cámara de sombra) siguen al jugador para mantener el
    // frustum de sombras acotado a su alrededor. Ángulo de "hora dorada" (SUN_DIR).
    this.sun.position.set(x + SUN_DIR.x * 90, SUN_DIR.y * 90, z + SUN_DIR.z * 90);
    this.sunTarget.position.set(x, 0, z);
    this.sunTarget.updateMatrixWorld();

    const zone = zoneAt(x, z);
    const b = zone.biome;
    const k = Math.min(1, dt * 1.5); // rapidez de transición

    // Viento: mece suavemente árboles y matas (dos armónicos → ráfagas irregulares).
    this.swayT += dt;
    for (const s of this.swayers) {
      s.o.rotation.z = (Math.sin(this.swayT * 1.1 + s.phase) + 0.4 * Math.sin(this.swayT * 2.3 + s.phase)) * s.amt;
    }

    // Motas ambientales: siguen al jugador, ascienden/derivan y se tintan por bioma.
    this.motesGroup.position.set(x, 0, z);
    if (this.motes) {
      const pos = this.motes.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.35;
        let mx = pos.getX(i) + Math.sin(this.swayT * 0.5 + i) * dt * 0.25;
        if (y > 14) { y = 0; mx = (Math.sin(i * 12.9898) * 43758.5) % 1 * 56 - 28; }
        pos.setY(i, y);
        pos.setX(i, mx);
      }
      pos.needsUpdate = true;
      const mat = this.motes.material as THREE.PointsMaterial;
      mat.color.lerp(new THREE.Color(b.accent).lerp(new THREE.Color(0xffffff), 0.45), k * 0.5);
    }

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
    this.hemi.color.lerp(new THREE.Color(b.fog).lerp(new THREE.Color(0xb9d2ed), 0.65), k * 0.6);
    // Dungeon silhouettes must remain readable against the cold stone, including unlit sides.
    this.hemi.intensity += ((['cripta','marismas','monasterio'].includes(zone.id) ? 1.65 : 1.05) - this.hemi.intensity) * k;

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
