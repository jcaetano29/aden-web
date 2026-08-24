import { Schema, type, ArraySchema } from "@colyseus/schema";

export class LeaderPlayerEntry extends Schema {
  @type("string") name = "";
  @type("number") level = 1;
  @type("number") pvpKills = 0;
  @type("string") className = "knight";
}

export class LeaderGuildEntry extends Schema {
  @type("string") name = "";
  @type("string") tag = "";
  @type("number") bossKills = 0;
}

export class LeaderboardState extends Schema {
  @type([LeaderPlayerEntry]) players = new ArraySchema<LeaderPlayerEntry>();
  @type([LeaderGuildEntry]) guilds = new ArraySchema<LeaderGuildEntry>();
}
