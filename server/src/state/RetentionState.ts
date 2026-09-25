import { Schema, type } from "@colyseus/schema";

/** Retención sincronizada (Etapa 13): racha, misión diaria y bajas totales. */
export class RetentionState extends Schema {
  @type("number") loginStreak = 0;
  @type("string") dailyQuestId = "";
  @type("number") dailyProgress = 0;
  @type("boolean") dailyDone = false;
  @type("number") totalKills = 0;
}
