import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNpc, type NpcRole } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

/**
 * NPC de servicio genérico (Etapa 20): Sanadora, Herrero, Capitán. Figura low-poly
 * encapuchada con colores y glifo flotante propios de su rol, nameplate y un prop
 * temático (bastón con orbe / yunque+martillo / estandarte). Se ubica desde el
 * registro de NPCs (shared/npcs.ts) y expone su root para raycast.
 */

interface RoleStyle {
  robe: number;
  cap: number;
  accent: number;   // orbe/prop emissive
  glyph: string;
  glyphColor: string;
}

const STYLES: Record<Exclude<NpcRole, "elder" | "merchant">, RoleStyle> = {
  healer: { robe: 0xe8e4d8, cap: 0x3aa88a, accent: 0x5effc8, glyph: "✚", glyphColor: "#5effc8" },
  smith: { robe: 0x4a3b30, cap: 0x2a2320, accent: 0xff7a2c, glyph: "⚒", glyphColor: "#ffb060" },
  captain: { robe: 0x6a2f2f, cap: 0x9aa0ad, accent: 0xff5a5a, glyph: "⚔", glyphColor: "#ff8a5a" },
};

export class ServiceNpc {
  readonly object: THREE.Object3D;
  private readonly indicatorMesh: THREE.Mesh;
  private pulse = 0;

  constructor(scene: THREE.Scene, _css2dLayer: unknown, npcId: string) {
    const def = getNpc(npcId);
    const style = STYLES[def.role as Exclude<NpcRole, "elder" | "merchant">];

    this.object = new THREE.Group();
    this.object.position.set(def.x, 0, def.z);
    // Encarar hacia el sur (+Z), de donde llega el jugador desde el portón.
    this.object.rotation.y = Math.PI;
    scene.add(this.object);

    const robeMat = new THREE.MeshStandardMaterial({ color: style.robe, flatShading: true, roughness: 0.9 });
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.6, 1.5, 8), robeMat);
    robe.position.y = 0.75;
    this.object.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshStandardMaterial({ color: 0xc9a574, flatShading: true }));
    head.position.y = 1.7;
    this.object.add(head);
    // Gorro/capucha del color de acento del rol.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: style.cap, flatShading: true }));
    cap.position.y = 1.82;
    this.object.add(cap);

    // Prop temático por rol.
    if (def.role === "healer") {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6), new THREE.MeshStandardMaterial({ color: 0xdcd2bf }));
      staff.position.set(0.42, 1.0, 0.1); this.object.add(staff);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), new THREE.MeshStandardMaterial({ color: 0xbfffe8, emissive: style.accent, emissiveIntensity: 1.2 }));
      orb.position.set(0.42, 2.05, 0.1); this.object.add(orb);
      this.object.add(new THREE.PointLight(style.accent, 0.5, 6, 2).translateY(2.05).translateX(0.42));
    } else if (def.role === "smith") {
      // Yunque a un costado.
      const anvilMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.5, flatShading: true });
      const anvil = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), anvilMat); base.position.y = 0.35; anvil.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.35), anvilMat); top.position.y = 0.6; anvil.add(top);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), anvilMat); horn.rotation.z = -Math.PI / 2; horn.position.set(0.55, 0.6, 0); anvil.add(horn);
      anvil.position.set(0.7, 0, 0.2); this.object.add(anvil);
      // Martillo en la mano.
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x5a3f24 }));
      handle.position.set(0.4, 1.0, 0.15); handle.rotation.z = 0.5; this.object.add(handle);
      const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.14), anvilMat); hammerHead.position.set(0.6, 1.2, 0.15); this.object.add(hammerHead);
      // Chispas emissivas sobre el yunque.
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: style.accent, emissiveIntensity: 1.5 }));
      spark.position.set(0.7, 0.75, 0.2); this.object.add(spark);
    } else {
      // Capitán: casco con cresta + lanza + estandarte.
      const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x9aa0ad, metalness: 0.5, roughness: 0.5, flatShading: true }));
      helmet.position.y = 1.86; this.object.add(helmet);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 6), new THREE.MeshStandardMaterial({ color: 0xb23b3b, flatShading: true }));
      crest.position.y = 2.1; this.object.add(crest);
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a3f24 }));
      spear.position.set(0.42, 1.1, 0.1); this.object.add(spear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 6), new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 0.6, roughness: 0.4 }));
      tip.position.set(0.42, 2.4, 0.1); this.object.add(tip);
    }

    // Indicador flotante (esfera emissiva) sobre la cabeza.
    const indicatorMat = new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.accent, emissiveIntensity: 0.9 });
    this.indicatorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), indicatorMat);
    this.indicatorMesh.position.y = 2.4;
    this.object.add(this.indicatorMesh);

    // Nameplate CSS2D.
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = def.name;
    nameplateDiv.style.cssText =
      `color:${style.glyphColor};font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;letter-spacing:0.5px;` +
      "text-shadow:0 0 4px #000,0 1px 2px #000;pointer-events:none;white-space:nowrap;";
    const namePlate = new CSS2DObject(nameplateDiv);
    namePlate.position.set(0, 2.2, 0);
    this.object.add(namePlate);

    // Glifo CSS2D del rol (✚ / ⚒ / ⚔).
    const glyphDiv = document.createElement("div");
    glyphDiv.textContent = style.glyph;
    glyphDiv.style.cssText =
      `color:${style.glyphColor};font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;` +
      `text-shadow:0 0 6px ${style.glyphColor},0 0 3px #000;pointer-events:none;`;
    const glyph = new CSS2DObject(glyphDiv);
    glyph.position.set(0, 2.55, 0);
    this.object.add(glyph);

    // Se crea después de Environment.enableShadows() → activar sombras acá.
    this.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  }

  /** Bob/pulso del indicador (llamar cada frame con dt en s). */
  update(dt: number): void {
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = 2.4 + Math.sin(this.pulse * 2) * 0.1;
  }

  getWorldPosition(): THREE.Vector3 {
    const v = new THREE.Vector3();
    this.object.getWorldPosition(v);
    return v;
  }
}
