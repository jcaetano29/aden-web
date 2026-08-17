import * as THREE from "three";
import { getItem } from "@aden/shared";

const ITEM_Y = 0.5;
const ROTATE_SPEED = 1.2; // rad/s
const BOB_SPEED = 2.0; // rad/s del seno de bob
const BOB_HEIGHT = 0.12; // amplitud del bob, unidades de mundo

const COLOR_BY_TYPE: Record<string, number> = {
  currency: 0xffd700,
  material: 0xdddddd,
  consumable: 0xff4444,
};
const DEFAULT_COLOR = 0xffffff;

interface ActiveItem {
  mesh: THREE.Mesh;
  bornAt: number;
}

/**
 * Ítems droppeados en el piso (loot), sincronizados desde `state.droppedItems`
 * (server-autoritativo: el cliente sólo renderiza lo que el server confirma).
 * Cada ítem es un mesh chico que rota y "bobea" suavemente para destacar del
 * suelo; el color depende del tipo de ítem (`getItem(itemTemplateId).type`).
 */
export class GroundItems {
  private readonly items = new Map<string, ActiveItem>();
  private readonly geometry = new THREE.OctahedronGeometry(0.35);

  constructor(private readonly scene: THREE.Scene) {}

  add(id: string, itemTemplateId: string, x: number, z: number) {
    if (this.items.has(id)) return;
    let color = DEFAULT_COLOR;
    try {
      color = COLOR_BY_TYPE[getItem(itemTemplateId).type] ?? DEFAULT_COLOR;
    } catch {
      // itemTemplateId desconocido (no debería pasar si server/shared están en sync):
      // usar color default en vez de romper el render.
    }
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.set(x, ITEM_Y, z);
    this.scene.add(mesh);
    this.items.set(id, { mesh, bornAt: performance.now() });
  }

  remove(id: string) {
    const entry = this.items.get(id);
    if (!entry) return;
    this.scene.remove(entry.mesh);
    entry.mesh.material instanceof THREE.Material && entry.mesh.material.dispose();
    this.items.delete(id);
  }

  /** Rotación + bob suave de todos los ítems activos. Llamar en el render loop. */
  update(dt: number) {
    if (this.items.size === 0) return;
    const now = performance.now();
    this.items.forEach((entry) => {
      entry.mesh.rotation.y += ROTATE_SPEED * dt;
      const t = (now - entry.bornAt) / 1000;
      entry.mesh.position.y = ITEM_Y + Math.sin(t * BOB_SPEED) * BOB_HEIGHT;
    });
  }
}
