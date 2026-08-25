import { Schema, type } from "@colyseus/schema";

export class DroppedItemState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("string") itemTemplateId = "";
  @type("number") qty = 0;
  /** Mapa donde cayó el ítem (Etapa 15): sólo se recoge/renderiza en ese mapa. */
  @type("string") mapId = "";

  // Server-only (NO @type)
  despawnMs = 0;
  pickDelayMs = 0; // no pickable hasta que llegue a 0 (loot visible al caer)
}
