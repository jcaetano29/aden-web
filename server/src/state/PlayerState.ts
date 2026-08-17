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

  // Etapa 3c: true una vez que onJoin terminó de aplicar (o no) el save cargado.
  // Server-only (NO @type) — usado para evitar que un save en curso (defaults de
  // nivel 1) pise el registro real si el jugador se desconecta o si el saveAll
  // periódico corre antes de que el load() resuelva.
  loaded = false;

  // Inventory — synced to client
  @type({ map: InventoryItemState }) inventory = new MapSchema<InventoryItemState>();
}
