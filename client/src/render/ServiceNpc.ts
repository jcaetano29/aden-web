import { NpcAppearance } from "./NpcAppearance.js";
import type { CharacterFactory } from "./CharacterFactory.js";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNpc, type NpcRole } from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";

/** Animated service character preserving its interaction root and nameplate. */

interface RoleStyle {
  accent: number;   // orbe/prop emissive
  glyph: string;
  glyphColor: string;
}

const STYLES: Record<Exclude<NpcRole, "elder" | "merchant">, RoleStyle> = {
  healer: { accent: 0x5effc8, glyph: "✚", glyphColor: "#5effc8" },
  smith: { accent: 0xff7a2c, glyph: "⚒", glyphColor: "#ffb060" },
  captain: { accent: 0xff5a5a, glyph: "⚔", glyphColor: "#ff8a5a" },
};

export class ServiceNpc {
  readonly object: THREE.Object3D;
  private readonly indicatorMesh: THREE.Mesh;
  private pulse = 0;
  private readonly appearance: NpcAppearance;

  constructor(scene: THREE.Scene, _css2dLayer: unknown, npcId: string, factory: CharacterFactory) {
    const def = getNpc(npcId);
    const style = STYLES[def.role as Exclude<NpcRole, "elder" | "merchant">];

    this.object = new THREE.Group();
    this.object.position.set(def.x, 0, def.z);
    // Encarar hacia el sur (+Z), de donde llega el jugador desde el portón.
    this.object.rotation.y = 0;
    scene.add(this.object);

    this.appearance = new NpcAppearance(factory, def.role);
    this.object.add(this.appearance.root);

    // Indicador flotante (esfera emissiva) sobre la cabeza.
    const indicatorMat = new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.accent, emissiveIntensity: 0.9 });
    this.indicatorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), indicatorMat);
    this.indicatorMesh.position.y = this.appearance.height + 0.65;
    this.object.add(this.indicatorMesh);

    // Nameplate CSS2D.
    const nameplateDiv = document.createElement("div");
    nameplateDiv.textContent = def.name;
    nameplateDiv.style.cssText =
      `color:${style.glyphColor};font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;letter-spacing:0.5px;` +
      "text-shadow:0 0 4px #000,0 1px 2px #000;pointer-events:none;white-space:nowrap;";
    const namePlate = new CSS2DObject(nameplateDiv);
    namePlate.center.set(0.5, 0);
    namePlate.position.set(0, this.appearance.height + 0.3, 0);
    this.object.add(namePlate);

    // Glifo CSS2D del rol (✚ / ⚒ / ⚔).
    const glyphDiv = document.createElement("div");
    glyphDiv.textContent = style.glyph;
    glyphDiv.style.cssText =
      `color:${style.glyphColor};font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;` +
      `text-shadow:0 0 6px ${style.glyphColor},0 0 3px #000;pointer-events:none;`;
    const glyph = new CSS2DObject(glyphDiv);
    glyph.center.set(0.5, 1);
    glyph.position.set(0, this.appearance.height + 0.85, 0);
    this.object.add(glyph);

    // Se crea después de Environment.enableShadows() → activar sombras acá.
    this.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  }

  /** Bob/pulso del indicador (llamar cada frame con dt en s). */
  update(dt: number): void {
    this.appearance.update(dt);
    this.pulse += dt;
    const s = 1 + Math.sin(this.pulse * 3) * 0.18;
    this.indicatorMesh.scale.setScalar(s);
    this.indicatorMesh.position.y = this.appearance.height + 0.65 + Math.sin(this.pulse * 2) * 0.1;
  }

  getWorldPosition(): THREE.Vector3 {
    const v = new THREE.Vector3();
    this.object.getWorldPosition(v);
    return v;
  }
}
