import { Schema, type } from "@colyseus/schema";

export class MobState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") templateId = "";
  @type("string") aiState = "wander";

  // Estado interno server-only (NO sincronizado — sin @type)
  homeX = 0;
  homeZ = 0;
  wanderCooldownMs = 0;
  aggroTargetId = "";
}
