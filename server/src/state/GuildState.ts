import { Schema, type } from "@colyseus/schema";

export class GuildState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") tag = "";
  @type("string") leaderName = "";
  @type("number") bossKills = 0;
}
