import { ELDER_NAME } from "./story.js";

/**
 * Registro de NPCs del pueblo (Etapa 20). Centraliza quién existe, qué rol cumple
 * y dónde para (el cliente los dibuja acá y el server sabe con quién hablás vía el
 * `npcId` del mensaje InteractNpc). Todos viven en el Pueblo, alrededor de la plaza
 * (centro 0,0, con la fuente). El pueblo es un mapa seguro entero, así que la
 * cercanía a los servicios se mide contra el centro del pueblo (TOWN_SERVICE_RADIUS).
 */

export type NpcRole = "elder" | "merchant" | "healer" | "smith" | "captain";

export interface NpcDef {
  /** También es el `npcId` que viaja en InteractNpc. */
  id: string;
  mapId?: string;
  appearance?: NpcRole;
  appearanceModel?: string;
  name: string;
  role: NpcRole;
  x: number;
  z: number;
}

export const NPCS: NpcDef[] = [
  { id: "elder", name: ELDER_NAME, role: "elder", x: -5, z: 6 },
  { id: "merchant", name: "Mercader Bram", role: "merchant", x: 5, z: 6 },
  { id: "healer", name: "Sanadora Elenya", role: "healer", x: -9, z: -1 },
  { id: "smith", name: "Herrero Dorne", role: "smith", x: 9, z: -1 },
  { id: "captain", name: "Capitán Varek", role: "captain", x: 0, z: 9 },
  { id: 'maera', name: 'Exploradora Maera', role: 'elder', appearance: 'merchant', appearanceModel: 'Ranger_Female', mapId: 'marismas', x: 1195, z: 195 },
  { id: 'boren', name: 'Intendente Boren', role: 'merchant', appearance: 'smith', mapId: 'marismas', x: 1205, z: 195 },
  { id: 'iria', name: 'Archivista Iria', role: 'elder', appearance: 'healer', appearanceModel: 'Mage_Female', mapId: 'monasterio', x: 1195, z: 495 },
];
for (const npc of NPCS) npc.mapId ??= 'pueblo';

/** Radio de interacción con los servicios del pueblo (medido contra el centro). */
export const TOWN_SERVICE_RADIUS = 11;

/** Costo en oro de un descanso completo con la Sanadora (restaura HP y MP). */
export const HEAL_COST_GOLD = 10;

export function getNpc(id: string): NpcDef {
  const n = NPCS.find((x) => x.id === id);
  if (!n) throw new Error(`getNpc: NPC desconocido ${id}`);
  return n;
}

export function getNpcByRole(role: NpcRole): NpcDef {
  const n = NPCS.find((x) => x.role === role);
  if (!n) throw new Error(`getNpcByRole: rol desconocido ${role}`);
  return n;
}
