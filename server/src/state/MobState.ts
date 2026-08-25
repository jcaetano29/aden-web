import { Schema, type } from "@colyseus/schema";

export class MobState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") templateId = "";
  @type("string") aiState = "wander";
  /** Mapa al que pertenece el mob (Etapa 15). El cliente sólo renderiza su mapa actual. */
  @type("string") mapId = "";

  // Combat — synced to clients
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") pAtk = 0;
  @type("number") pDef = 0;
  @type("boolean") dead = false;
  @type("number") windupMs = 0;

  // Estado interno server-only (NO sincronizado — sin @type)
  homeX = 0;
  homeZ = 0;
  wanderCooldownMs = 0;
  aggroTargetId = "";
  windupTargetId = "";

  // Combat cooldowns — server-only
  attackCooldownMs = 0;
  respawnMs = 0;

  // DoT (Damage over Time) — server-only (NO @type)
  dotMs = 0;
  dotDps = 0;
  dotAttackerId = "";
  dotAccumMs = 0;
}
