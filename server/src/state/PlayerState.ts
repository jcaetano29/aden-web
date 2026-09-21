import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { InventoryItemState } from "./InventoryItemState.js";
import { emptyEffects } from '@aden/shared';

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
  @type("string") className = "knight";
  @type("string") appearanceModel = "";
  /** Mapa actual del jugador (Etapa 15, estilo Mu). Se cambia warpeando (tecla M). */
  @type("string") mapId = "pueblo";
  @type("number") pvpKills = 0;
  @type("string") guildId = "";
  @type("string") partyId = "";
  @type("string") guildTag = "";

  // Progression — synced to clients
  @type("number") exp = 0;
  @type("number") level = 1;
  @type("string") questId = "";
  @type("number") questProgress = 0;
  @type("number") dungeonStage = 0;
  @type("number") dungeonKills = 0;
  @type("number") gold = 0;
  // Etapa 20: contrato del Capitán (misión repetible en paralelo a la campaña).
  @type("string") bountyId = "";
  @type("number") bountyProgress = 0;

  // Etapa 21: atributos primarios asignables + puntos sin gastar (sincronizados).
  @type("number") str = 0;
  @type("number") agi = 0;
  @type("number") vit = 0;
  @type("number") ene = 0;
  @type("number") statPoints = 0;

  // Combat cooldown — server-only (NO @type)
  attackCooldownMs = 0;
  itemEffects = emptyEffects();
  respawnMs = 0;

  // Per-skill cooldowns — server-only (NO @type)
  skillCooldowns = new Map<string, number>();
  @type(["string"]) learnedTomes = new ArraySchema<string>();
  @type("number") poisonMs = 0;
  poisonDps = 0;
  poisonAccumMs = 0;
  poisonAttackerId = "";

  // Buff durations synchronized for persistent visual indicators.
  @type("number") atkBuffMs = 0;
  atkBuffMult = 1;
  @type("number") defBuffMs = 0;
  defBuffMult = 1;

  // Etapa 22: control (sincronizado para que el cliente muestre el estado y bloquee input).
  @type("number") stunMs = 0; // aturdido: no se mueve ni castea
  @type("number") rootMs = 0; // enraizado: no se mueve (puede castear)
  // Regen: ms desde el último daño dado/recibido (server-only) → HP regenera fuera de combate.
  msSinceCombat = 100000;
  // Acumuladores fraccionarios de regen (server-only) → HP/MP quedan enteros.
  mpRegenAcc = 0;
  hpRegenAcc = 0;

  // Etapa 3c: true una vez que onJoin terminó de aplicar (o no) el save cargado.
  // Server-only (NO @type) — usado para evitar que un save en curso (defaults de
  // nivel 1) pise el registro real si el jugador se desconecta o si el saveAll
  // periódico corre antes de que el load() resuelva.
  loaded = false;

  // Guild identity — server-only (NO @type)
  guildName = "";

  // Inventory — synced to client
  @type({ map: InventoryItemState }) inventory = new MapSchema<InventoryItemState>();

  // Etapa 12: equipo — mapa slot ("weapon"|"armor"|"accessory") → itemTemplateId.
  // Sincronizado al cliente (paperdoll). Los bonuses se aplican a los stats en el server.
  @type({ map: "string" }) equipment = new MapSchema<string>();

  // ── Etapa 13: retención (sincronizado al cliente para el panel de progreso) ──
  @type("number") loginStreak = 0;
  @type("string") dailyQuestId = "";
  @type("number") dailyProgress = 0;
  @type("boolean") dailyDone = false;
  @type("number") totalKills = 0;
  /** Título lucido en el nameplate ("" = ninguno). */
  @type("string") title = "";
  /** Ids de logros desbloqueados (para el panel de logros). */
  @type(["string"]) achievements = new ArraySchema<string>();

  // Retención — server-only (NO @type), persistidos en el blob `progress`.
  lastLoginDay = "";
  bossKills = 0;
}
