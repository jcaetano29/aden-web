import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";
import { MobState } from "./MobState.js";
import { DroppedItemState } from "./DroppedItemState.js";
import { GuildState } from "./GuildState.js";
import { LeaderboardState } from "./LeaderboardState.js";
import { WorldObjectState } from "./WorldObjectState.js";
import { PartyState } from './PartyState.js';

export class GameState extends Schema {
  @type({ map: PartyState }) parties = new MapSchema<PartyState>();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MobState }) mobs = new MapSchema<MobState>();
  @type({ map: DroppedItemState }) droppedItems = new MapSchema<DroppedItemState>();
  @type({ map: GuildState }) guilds = new MapSchema<GuildState>();
  @type(LeaderboardState) leaderboard = new LeaderboardState();
  @type({ map: WorldObjectState }) worldObjects = new MapSchema<WorldObjectState>();
}
