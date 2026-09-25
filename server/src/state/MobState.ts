import { Schema, type } from "@colyseus/schema";

export class MobState extends Schema {
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") targetX = 0;
  @type("number") targetZ = 0;
  @type("boolean") moving = false;
  @type("string") templateId = "";
  @type("number") level = 1;
  @type("string") rank = "normal";
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
  @type("number") hazardMs = 0;
  @type("boolean") channeling = false;
  hazardCount = 0;
  hazardPower = 2.2;
  @type("number") hazardX = 0;
  @type("number") hazardZ = 0;
  @type("number") hazardRadius = 6;
  /** Apertura del área anunciada en radianes (2π = círculo). */
  @type("number") hazardArc = Math.PI * 2;
  /** Orientación del cono en radianes (0 = +X), fijada al iniciar el aviso. */
  @type("number") hazardAngle = 0;
  hazardCooldownMs = 0;
  // Etapa 22: control (sincronizado para el VFX de aturdido/enraizado en el cliente).
  @type("number") stunMs = 0;
  @type("number") rootMs = 0;

  // Estado interno server-only (NO sincronizado — sin @type)
  homeX = 0;
  homeZ = 0;
  wanderCooldownMs = 0;
  aggroTargetId = "";
  windupTargetId = "";

  // Combat cooldowns — server-only
  attackCooldownMs = 0;
  respawnMs = 0;

  // DoT duration synchronized; damage bookkeeping remains server-only.
  @type("number") dotMs = 0;
  dotDps = 0;
  dotAttackerId = "";
  /** Snapshot retained when the caster disconnects before the poison expires. */
  dotAttackerLevel = 1;
  dotAccumMs = 0;
}
