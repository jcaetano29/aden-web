import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState.js";
import { MobState } from "./MobState.js";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MobState }) mobs = new MapSchema<MobState>();
}
