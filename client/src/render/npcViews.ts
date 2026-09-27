import type { NpcDef } from "@aden/shared";

/** Servicios clásicos del pueblo: cada uno tiene su propia vista (Npc, Merchant, ServiceNpc). */
const CLASSIC_TOWN_VIEWS = new Set(["elder", "merchant", "healer", "smith", "captain"]);

/** NPC que se dibujan con la vista genérica: todos menos los servicios clásicos del pueblo. */
export function npcsWithGenericView(npcs: readonly NpcDef[]): NpcDef[] {
  return npcs.filter(def => !CLASSIC_TOWN_VIEWS.has(def.id));
}
