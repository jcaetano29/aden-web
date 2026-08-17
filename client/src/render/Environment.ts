import * as THREE from "three";
import { TOWN, SAFE_RADIUS, MAP_BOUNDS, SPAWN_ZONES } from "@aden/shared";

/** RNG determinístico (mulberry32) con seed fija → todos los clientes ven el mismo bosque. */
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
const SKY_HORIZON = 0xbcd9f0;

/**
 * Entorno procedural (sin assets externos), estilo low-poly "vieja escuela":
 * domo de cielo con gradiente, niebla, iluminación cálida (hemisférica + sol),
 * y árboles/rocas/pasto esparcidos determinísticamente fuera del pueblo y de las
 * spawn zones. Puramente visual; el cliente no decide nada de gameplay acá.
 */
export class Environment {
  constructor(private readonly scene: THREE.Scene) {
    this.addSky();
    this.addLights();
    this.scene.fog = new THREE.Fog(SKY_HORIZON, 45, 150);
    this.addProps();
  }

  private addSky() {
    const geo = new THREE.SphereGeometry(240, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(SKY_TOP) },
        bottom: { value: new THREE.Color(SKY_HORIZON) },
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
    this.scene.background = new THREE.Color(SKY_HORIZON);
  }

  private addLights() {
    const hemi = new THREE.HemisphereLight(0x9fc4e8, 0x4a5a3a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d9, 0.95);
    sun.position.set(30, 50, 20);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  }

  private addProps() {
    const rng = mulberry32(1337);
    // geometrías/materiales compartidos por tipo (perf)
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.42, 2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b });
    const leafGeo1 = new THREE.ConeGeometry(1.7, 2.4, 7);
    const leafGeo2 = new THREE.ConeGeometry(1.15, 1.9, 7);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b34, flatShading: true });
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7d80, flatShading: true });
    const grassGeo = new THREE.ConeGeometry(0.18, 0.6, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3f7d41, flatShading: true });

    const okSpot = (x: number, z: number): boolean => {
      // fuera del pueblo
      if (Math.hypot(x - TOWN.x, z - TOWN.z) < SAFE_RADIUS + 4) return false;
      // fuera de las spawn zones (para no tapar el spawn de mobs)
      for (const zn of SPAWN_ZONES) {
        if (Math.hypot(x - zn.centerX, z - zn.centerZ) < zn.radius + 3) return false;
      }
      return true;
    };
    const randPos = (): [number, number] => {
      const m = 3;
      return [
        MAP_BOUNDS.minX + m + rng() * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX - 2 * m),
        MAP_BOUNDS.minZ + m + rng() * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ - 2 * m),
      ];
    };

    // árboles
    for (let i = 0; i < 38; i++) {
      let x = 0, z = 0, tries = 0;
      do { [x, z] = randPos(); tries++; } while (!okSpot(x, z) && tries < 12);
      if (!okSpot(x, z)) continue;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1;
      const c1 = new THREE.Mesh(leafGeo1, leafMat); c1.position.y = 2.9;
      const c2 = new THREE.Mesh(leafGeo2, leafMat); c2.position.y = 4.1;
      tree.add(trunk, c1, c2);
      const s = 0.8 + rng() * 0.7;
      tree.scale.setScalar(s);
      tree.position.set(x, 0, z);
      tree.rotation.y = rng() * Math.PI * 2;
      this.scene.add(tree);
    }
    // rocas
    for (let i = 0; i < 18; i++) {
      let x = 0, z = 0, tries = 0;
      do { [x, z] = randPos(); tries++; } while (!okSpot(x, z) && tries < 12);
      if (!okSpot(x, z)) continue;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.5 + rng() * 1.1;
      rock.scale.set(s, s * (0.6 + rng() * 0.5), s);
      rock.position.set(x, s * 0.3, z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      this.scene.add(rock);
    }
    // matas de pasto
    for (let i = 0; i < 60; i++) {
      const [x, z] = randPos();
      if (!okSpot(x, z)) continue;
      const g = new THREE.Mesh(grassGeo, grassMat);
      g.position.set(x, 0.3, z);
      g.rotation.y = rng() * Math.PI;
      this.scene.add(g);
    }
  }
}
