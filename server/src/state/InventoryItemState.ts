import { Schema, type } from "@colyseus/schema";

export class InventoryItemState extends Schema {
  @type("string") itemTemplateId = "";
  @type("number") qty = 0;
}
