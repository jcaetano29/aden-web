import { Schema, type } from "@colyseus/schema";

export class DroppedItemState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("string") itemTemplateId = "";
  @type("number") qty = 0;

  // Server-only (NO @type)
  despawnMs = 0;
}
