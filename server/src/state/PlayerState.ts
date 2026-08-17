import { Schema, type, MapSchema } from "@colyseus/schema";
import { InventoryItemState } from "./InventoryItemState.js";

export class PlayerState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") name = "";

  // Combat — synced to clients
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") pAtk = 0;
  @type("number") pDef = 0;
  @type("string") targetId = "";
  @type("number") mp = 0;
  @type("number") maxMp = 0;
  @type("boolean") dead = false;

  // Progression — synced to clients
  @type("number") exp = 0;
  @type("number") level = 1;

  // Combat cooldown — server-only (NO @type)
  attackCooldownMs = 0;
  skillCooldownMs = 0;
  respawnMs = 0;

  // Inventory — synced to client
  @type({ map: InventoryItemState }) inventory = new MapSchema<InventoryItemState>();
}
